const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ffmpegPath = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

const config = require("./config");
const { MarkError } = require("./mark-error");

const DIRECT_EXTENSIONS = new Set([".mp4", ".m4v", ".mov"]);
const DIRECT_VIDEO_CODECS = new Set(["h264", "hevc", "h265"]);
const DIRECT_AUDIO_CODECS = new Set(["aac", "mp3", "pcm_s16le", "pcm_s24le"]);
const MAX_ANALYZE_SECONDS = 2 * 60 * 60;
const MIN_ANALYZE_SECONDS = 4;

function debugNoop() {}

function bytesFromBitrate(value) {
  const match = /^(\d+(?:\.\d+)?)([kKmM]?)$/.exec(String(value || "").trim());
  if (!match) {
    return 0;
  }

  const number = Number(match[1]);
  const unit = match[2].toLowerCase();
  const bits = unit === "m" ? number * 1000 * 1000 : unit === "k" ? number * 1000 : number;
  return bits / 8;
}

function mediaOptions(options) {
  const source = options || {};
  const maxDirectUploadBytes = source.maxDirectUploadBytes || config.maxDirectUploadBytes;
  return {
    enabled: source.enabled !== undefined ? Boolean(source.enabled) : config.mediaPrepEnabled,
    prepDir: source.prepDir || config.mediaPrepDir,
    targetMaxBytes: Math.min(source.targetMaxBytes || config.mediaTargetMaxBytes, maxDirectUploadBytes),
    maxDirectUploadBytes,
    maxWidth: source.maxWidth || config.mediaMaxWidth,
    videoBitrate: source.videoBitrate || config.mediaVideoBitrate,
    audioBitrate: source.audioBitrate || config.mediaAudioBitrate,
    chunkSeconds: source.chunkSeconds || config.mediaChunkSeconds,
    chunkOverlapSeconds: source.chunkOverlapSeconds !== undefined
      ? Number(source.chunkOverlapSeconds)
      : config.mediaChunkOverlapSeconds,
    sourceKind: source.sourceKind || "original",
    jobId: source.jobId || `mark_${Date.now()}`,
    fs: source.fs || fs,
    execFile: source.execFile || childProcess.execFile,
    spawn: source.spawn || childProcess.spawn,
    ffmpegPath: source.ffmpegPath || ffmpegPath,
    ffprobePath: source.ffprobePath || (ffprobeStatic && ffprobeStatic.path),
    debug: source.debug || debugNoop
  };
}

function runExecFile(command, args, options) {
  return new Promise(function exec(resolve, reject) {
    options.execFile(command, args, {
      maxBuffer: 20 * 1024 * 1024
    }, function done(error, stdout, stderr) {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
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

function streamByType(probe, type) {
  return (probe.streams || []).find(function findStream(stream) {
    return stream && stream.codec_type === type;
  }) || null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function probeMedia(filePath, options) {
  const output = await runExecFile(options.ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ], options);
  const parsed = JSON.parse(output || "{}");
  const stat = options.fs.statSync(filePath);
  const video = streamByType(parsed, "video");
  const audio = streamByType(parsed, "audio");
  const duration = numberOrZero(
    parsed.format && parsed.format.duration
      ? parsed.format.duration
      : video && video.duration
  );

  return {
    filePath,
    size: stat.size,
    durationSeconds: duration,
    formatName: parsed.format && parsed.format.format_name || "",
    video: video ? {
      codec: String(video.codec_name || "").toLowerCase(),
      width: Number(video.width) || 0,
      height: Number(video.height) || 0
    } : null,
    audio: audio ? {
      codec: String(audio.codec_name || "").toLowerCase()
    } : null,
    raw: parsed
  };
}

function aspectIsValid(video) {
  if (!video || !video.width || !video.height) {
    return false;
  }
  const ratio = video.width / video.height;
  return ratio >= 1 / 2.4 && ratio <= 2.4;
}

function resolutionIsValid(video) {
  return video
    && video.width >= 360
    && video.height >= 360
    && video.width <= 5184
    && video.height <= 2160;
}

function isDirectUploadFriendly(filePath, probe, options) {
  const extension = path.extname(filePath).toLowerCase();
  const audioCodec = probe.audio && probe.audio.codec;
  return probe.size <= options.targetMaxBytes
    && probe.durationSeconds >= MIN_ANALYZE_SECONDS
    && probe.durationSeconds <= MAX_ANALYZE_SECONDS
    && DIRECT_EXTENSIONS.has(extension)
    && probe.video
    && DIRECT_VIDEO_CODECS.has(probe.video.codec)
    && (!audioCodec || DIRECT_AUDIO_CODECS.has(audioCodec))
    && resolutionIsValid(probe.video)
    && aspectIsValid(probe.video);
}

function createPrepDirectory(options) {
  options.fs.mkdirSync(options.prepDir, {
    recursive: true
  });
  return options.fs.mkdtempSync(path.join(options.prepDir, `${options.jobId}-`));
}

function commandSummary(command, args) {
  return {
    command: path.basename(command || "ffmpeg"),
    args: args.map(function summarize(arg) {
      const text = String(arg);
      return text.length > 240 ? `${text.slice(0, 237)}...` : text;
    })
  };
}

function ffmpegTranscodeArgs(inputPath, outputPath, options, segment) {
  const args = ["-hide_banner", "-y"];
  if (segment && segment.startSeconds > 0) {
    args.push("-ss", String(segment.startSeconds));
  }
  args.push("-i", inputPath);
  if (segment && segment.durationSeconds > 0) {
    args.push("-t", String(segment.durationSeconds));
  }
  args.push(
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    `scale=w='min(${options.maxWidth},iw)':h=-2`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    options.videoBitrate,
    "-maxrate",
    options.videoBitrate,
    "-bufsize",
    `${Math.max(1, Math.round(bytesFromBitrate(options.videoBitrate) * 16 / 1000))}k`,
    "-c:a",
    "aac",
    "-b:a",
    options.audioBitrate,
    "-ac",
    "2",
    "-ar",
    "48000",
    "-movflags",
    "+faststart",
    outputPath
  );
  return args;
}

function estimatedTranscodeBytes(durationSeconds, options) {
  const videoBytesPerSecond = bytesFromBitrate(options.videoBitrate);
  const audioBytesPerSecond = bytesFromBitrate(options.audioBitrate);
  if (!durationSeconds || !videoBytesPerSecond) {
    return 0;
  }
  return Math.ceil(durationSeconds * (videoBytesPerSecond + audioBytesPerSecond) * 1.08);
}

async function transcodeSegment(inputPath, outputPath, options, segment) {
  const args = ffmpegTranscodeArgs(inputPath, outputPath, options, segment);
  options.debug("Media prep ffmpeg", commandSummary(options.ffmpegPath, args));
  await runSpawn(options.ffmpegPath, args, options);
  return options.fs.statSync(outputPath).size;
}

function plannedChunks(durationSeconds, options) {
  const chunkSeconds = Math.max(1, Number(options.chunkSeconds) || 1);
  const overlap = Math.max(0, Math.min(chunkSeconds - 0.001, Number(options.chunkOverlapSeconds) || 0));
  const step = Math.max(1, chunkSeconds - overlap);
  const chunks = [];
  let start = 0;

  while (start < durationSeconds || chunks.length === 0) {
    const remaining = Math.max(0, durationSeconds - start);
    const segmentDuration = durationSeconds
      ? Math.min(chunkSeconds, remaining)
      : chunkSeconds;
    if (segmentDuration <= 0) {
      break;
    }
    chunks.push({
      startSeconds: Number(start.toFixed(3)),
      durationSeconds: Number(segmentDuration.toFixed(3))
    });
    if (!durationSeconds || remaining <= chunkSeconds || start + step >= durationSeconds) {
      break;
    }
    start += step;
  }

  return chunks;
}

async function prepareTranscodedChunks(inputPath, probe, prepDirectory, options) {
  const chunks = plannedChunks(probe.durationSeconds, options);
  const segments = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const outputPath = path.join(prepDirectory, `segment-${String(index + 1).padStart(3, "0")}.mp4`);
    const size = await transcodeSegment(inputPath, outputPath, options, chunk);
    segments.push({
      filePath: outputPath,
      startSeconds: chunk.startSeconds,
      durationSeconds: chunk.durationSeconds,
      cleanupPath: prepDirectory,
      sourceKind: options.sourceKind,
      size
    });
  }

  return segments;
}

function cleanupPreparedSegments(segments, options = {}) {
  const fsImpl = options.fs || fs;
  const cleanupPaths = Array.from(new Set((segments || []).map(function cleanupPath(segment) {
    return segment && segment.cleanupPath;
  }).filter(Boolean)));

  cleanupPaths.forEach(function cleanup(cleanupPath) {
    try {
      fsImpl.rmSync(cleanupPath, {
        recursive: true,
        force: true
      });
    } catch (error) {
      // Best-effort cleanup.
    }
  });
}

async function prepareMediaForUpload(filePath, rawOptions = {}) {
  const options = mediaOptions(rawOptions);
  if (!options.enabled) {
    return {
      probe: null,
      decision: "disabled",
      segments: [{
        filePath,
        startSeconds: 0,
        durationSeconds: 0,
        cleanupPath: "",
        sourceKind: options.sourceKind
      }]
    };
  }

  if (!options.ffmpegPath || !options.ffprobePath) {
    throw new MarkError("ffmpeg and ffprobe are required for media preparation", {
      code: "MEDIA_PREP_BINARY_MISSING",
      statusCode: 500
    });
  }

  const probe = await probeMedia(filePath, options);
  options.debug("Media prep probe", {
    filePath,
    size: probe.size,
    durationSeconds: probe.durationSeconds,
    formatName: probe.formatName,
    video: probe.video,
    audio: probe.audio
  });

  if (isDirectUploadFriendly(filePath, probe, options)) {
    options.debug("Media prep decision", {
      decision: "direct",
      reason: "File is already within direct upload constraints"
    });
    return {
      probe,
      decision: "direct",
      segments: [{
        filePath,
        startSeconds: 0,
        durationSeconds: probe.durationSeconds,
        cleanupPath: "",
        sourceKind: options.sourceKind,
        size: probe.size
      }]
    };
  }

  if (!probe.video) {
    throw new MarkError("Media preparation requires a video stream", {
      code: "MEDIA_PREP_NO_VIDEO",
      statusCode: 400
    });
  }

  if (probe.durationSeconds > MAX_ANALYZE_SECONDS) {
    options.debug("Media prep decision", {
      decision: "chunk",
      reason: "Video duration is above Pegasus single-analysis duration"
    });
  } else {
    options.debug("Media prep decision", {
      decision: "transcode",
      reason: "File is too large or not in the preferred direct-upload shape"
    });
  }

  let prepDirectory = createPrepDirectory(options);
  let segments;
  try {
    const estimate = estimatedTranscodeBytes(probe.durationSeconds, options);
    const shouldChunk = probe.durationSeconds > options.chunkSeconds
      || estimate > options.targetMaxBytes
      || probe.durationSeconds > MAX_ANALYZE_SECONDS;

    if (shouldChunk) {
      segments = await prepareTranscodedChunks(filePath, probe, prepDirectory, options);
    } else {
      const outputPath = path.join(prepDirectory, "prepared.mp4");
      const size = await transcodeSegment(filePath, outputPath, options, {
        startSeconds: 0,
        durationSeconds: 0
      });
      segments = [{
        filePath: outputPath,
        startSeconds: 0,
        durationSeconds: probe.durationSeconds,
        cleanupPath: prepDirectory,
        sourceKind: options.sourceKind,
        size
      }];
      if (size > options.targetMaxBytes && probe.durationSeconds > options.chunkOverlapSeconds) {
        cleanupPreparedSegments(segments, options);
        prepDirectory = createPrepDirectory(options);
        segments = await prepareTranscodedChunks(filePath, probe, prepDirectory, options);
      }
    }
  } catch (error) {
    cleanupPreparedSegments([{
      cleanupPath: prepDirectory
    }], options);
    throw error;
  }

  const oversize = segments.find(function tooLarge(segment) {
    return segment.size > options.maxDirectUploadBytes;
  });
  if (oversize) {
    cleanupPreparedSegments(segments, options);
    throw new MarkError(`Prepared media segment is ${(oversize.size / 1024 / 1024).toFixed(1)} MB, above the TwelveLabs direct upload limit`, {
      code: "MEDIA_PREP_SEGMENT_TOO_LARGE",
      statusCode: 413,
      details: {
        size: oversize.size,
        maxBytes: options.maxDirectUploadBytes
      }
    });
  }

  options.debug("Media prep chunks", {
    count: segments.length,
    segments: segments.map(function summarize(segment) {
      return {
        filePath: segment.filePath,
        startSeconds: segment.startSeconds,
        durationSeconds: segment.durationSeconds,
        size: segment.size
      };
    })
  });

  return {
    probe,
    decision: segments.length > 1 ? "chunked" : "transcoded",
    segments
  };
}

module.exports = {
  cleanupPreparedSegments,
  isDirectUploadFriendly,
  plannedChunks,
  prepareMediaForUpload,
  probeMedia
};
