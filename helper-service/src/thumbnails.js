const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const ffmpegPath = require("ffmpeg-static");

const config = require("./config");

function debugNoop() {}

function thumbnailOptions(options = {}) {
  return {
    enabled: options.enabled !== undefined ? Boolean(options.enabled) : config.thumbnailsEnabled,
    thumbnailsDir: options.thumbnailsDir || config.thumbnailsDir,
    width: Math.max(1, Number(options.width || config.thumbnailWidth) || 160),
    maxPerJob: Math.max(0, Number(options.maxPerJob || config.maxThumbnailsPerJob) || 0),
    maxAgeMs: Math.max(1, Number(options.maxAgeMs || config.thumbnailMaxAgeMs) || 1),
    ffmpegPath: options.ffmpegPath || ffmpegPath,
    spawn: options.spawn || childProcess.spawn,
    fs: options.fs || fs,
    debug: options.debug || debugNoop
  };
}

function safeJobDirectoryName(jobId) {
  return String(jobId || "job")
    .replace(/[^A-Za-z0-9_.-]+/g, "_")
    .slice(0, 120) || "job";
}

function thumbnailJobDirectory(jobId, rawOptions = {}) {
  const options = thumbnailOptions(rawOptions);
  return path.join(path.resolve(options.thumbnailsDir), safeJobDirectoryName(jobId));
}

function runSpawn(command, args, options) {
  return new Promise(function spawnProcess(resolve, reject) {
    const child = options.spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"]
    });
    let stderr = "";

    if (child.stderr) {
      child.stderr.on("data", function onData(chunk) {
        stderr += chunk.toString();
        if (stderr.length > 12000) {
          stderr = stderr.slice(-12000);
        }
      });
    }

    child.on("error", reject);
    child.on("close", function onClose(code) {
      if (code === 0) {
        resolve();
        return;
      }
      const error = new Error(`ffmpeg exited with code ${code}`);
      error.stderr = stderr;
      reject(error);
    });
  });
}

function ffmpegThumbnailArgs(inputPath, outputPath, timeSeconds, options) {
  const args = ["-hide_banner", "-y"];
  const seekSeconds = Math.max(0, Number(timeSeconds) || 0);
  if (seekSeconds > 0) {
    args.push("-ss", String(seekSeconds));
  }
  args.push(
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=${options.width}:-2`,
    "-q:v",
    "4",
    outputPath
  );
  return args;
}

async function extractThumbnail(inputPath, outputPath, timeSeconds, rawOptions = {}) {
  const options = thumbnailOptions(rawOptions);
  const args = ffmpegThumbnailArgs(inputPath, outputPath, timeSeconds, options);
  options.debug("Thumbnail ffmpeg", {
    command: path.basename(options.ffmpegPath || "ffmpeg"),
    inputPath,
    outputPath,
    timeSeconds: Math.max(0, Number(timeSeconds) || 0),
    width: options.width
  });
  await runSpawn(options.ffmpegPath, args, options);
  return options.fs.statSync(outputPath).size;
}

function stripThumbnailSources(items) {
  return (items || []).map(function strip(item) {
    if (!item || typeof item !== "object") {
      return item;
    }
    const cleaned = {
      ...item
    };
    delete cleaned._thumbnailSource;
    return cleaned;
  });
}

function thumbnailUrl(jobId, fileName) {
  return `/jobs/${encodeURIComponent(jobId)}/thumbnails/${encodeURIComponent(fileName)}`;
}

async function attachThumbnailsToItems(job, items, rawOptions = {}) {
  const options = thumbnailOptions(rawOptions);
  const cleanedItems = stripThumbnailSources(items);
  job.thumbnails = [];
  job.thumbnailDir = "";

  if (!options.enabled || options.maxPerJob <= 0 || !options.ffmpegPath || cleanedItems.length === 0) {
    return cleanedItems;
  }

  const jobDir = thumbnailJobDirectory(job.id, options);
  options.fs.mkdirSync(jobDir, {
    recursive: true
  });
  job.thumbnailDir = jobDir;

  const itemLimit = Math.min(items.length, options.maxPerJob);
  const startedAt = Date.now();
  for (let index = 0; index < itemLimit; index += 1) {
    const source = items[index] && items[index]._thumbnailSource;
    if (!source || !source.filePath) {
      continue;
    }

    const fileName = `thumb-${String(index + 1).padStart(3, "0")}.jpg`;
    const filePath = path.join(jobDir, fileName);
    const itemStartedAt = Date.now();
    try {
      const size = await extractThumbnail(source.filePath, filePath, source.startTime, options);
      cleanedItems[index] = {
        ...cleanedItems[index],
        thumbnailUrl: thumbnailUrl(job.id, fileName)
      };
      job.thumbnails.push({
        fileName,
        filePath,
        size,
        elapsedMs: Date.now() - itemStartedAt
      });
    } catch (error) {
      options.debug("Thumbnail extraction failed", {
        filePath: source.filePath,
        startTime: source.startTime,
        elapsedMs: Date.now() - itemStartedAt,
        error: error.message,
        stderr: error.stderr
      });
    }
  }

  options.debug("Thumbnail generation timing", {
    requestedCount: cleanedItems.length,
    attemptedCount: itemLimit,
    generatedCount: job.thumbnails.length,
    elapsedMs: Date.now() - startedAt,
    thumbnails: job.thumbnails.map(function summarize(thumbnail) {
      return {
        fileName: thumbnail.fileName,
        size: thumbnail.size,
        elapsedMs: thumbnail.elapsedMs
      };
    })
  });

  if (job.thumbnails.length === 0) {
    cleanupJobThumbnails(job, options);
  }

  return cleanedItems;
}

function findJobThumbnail(job, fileName) {
  const safeFileName = String(fileName || "");
  return (job && Array.isArray(job.thumbnails) ? job.thumbnails : []).find(function sameThumbnail(thumbnail) {
    return thumbnail && thumbnail.fileName === safeFileName;
  }) || null;
}

function cleanupJobThumbnails(job, rawOptions = {}) {
  const options = thumbnailOptions(rawOptions);
  const directory = job && job.thumbnailDir;
  if (!directory) {
    return false;
  }
  try {
    options.fs.rmSync(directory, {
      recursive: true,
      force: true
    });
    job.thumbnailDir = "";
    job.thumbnails = [];
    return true;
  } catch (error) {
    return false;
  }
}

function cleanupStaleThumbnailCache(rawOptions = {}) {
  const options = thumbnailOptions(rawOptions);
  const root = path.resolve(options.thumbnailsDir);
  try {
    options.fs.mkdirSync(root, {
      recursive: true
    });
  } catch (error) {
    return 0;
  }

  let entries;
  try {
    entries = options.fs.readdirSync(root, {
      withFileTypes: true
    });
  } catch (error) {
    return 0;
  }

  const now = Date.now();
  let removed = 0;
  entries.forEach(function removeOldEntry(entry) {
    const entryPath = path.join(root, entry.name);
    try {
      const stat = options.fs.statSync(entryPath);
      if (now - stat.mtimeMs <= options.maxAgeMs) {
        return;
      }
      options.fs.rmSync(entryPath, {
        recursive: entry.isDirectory(),
        force: true
      });
      removed += 1;
    } catch (error) {
      // Best-effort startup cleanup.
    }
  });
  return removed;
}

module.exports = {
  attachThumbnailsToItems,
  cleanupJobThumbnails,
  cleanupStaleThumbnailCache,
  extractThumbnail,
  findJobThumbnail,
  stripThumbnailSources,
  thumbnailJobDirectory
};
