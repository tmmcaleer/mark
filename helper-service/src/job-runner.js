const fs = require("fs");
const path = require("path");

const config = require("./config");
const { MarkError } = require("./mark-error");
const {
  cleanupPreparedSegments,
  prepareMediaForUpload
} = require("./media-prep");
const { normalizePromptContext } = require("./prompt-context");
const { TwelveLabsClient, normalizeMarkerOutputStyle } = require("./twelvelabs-client");
const { normalizeSubclipOptions } = require("./subclips");
const {
  attachThumbnailsToItems,
  stripThumbnailSources
} = require("./thumbnails");

function sanitizePrompt(prompt) {
  return String(prompt || "").trim();
}

function normalizeOutputMode(value) {
  return String(value || "").trim().toLowerCase() === "subclips" ? "subclips" : "markers";
}

function normalizeMediaSourceKind(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "avid-source-path" || text === "sourcepath" || text === "source-path") {
    return "avid-source-path";
  }
  if (text === "avid-export" || text === "export") {
    return "avid-export";
  }
  if (text === "repository-proxy" || text === "repository" || text === "proxy") {
    return "repository-proxy";
  }
  return "unknown";
}

function validateJobRequest(body, options = {}) {
  const fsImpl = options.fs || fs;
  const maxBytes = options.maxDirectUploadBytes || config.maxDirectUploadBytes;
  const mediaPrepEnabled = options.mediaPrepEnabled !== undefined
    ? Boolean(options.mediaPrepEnabled)
    : config.mediaPrepEnabled;
  const prompt = sanitizePrompt(body && body.prompt);
  const filePath = body && body.filePath ? path.resolve(String(body.filePath)) : "";

  if (!filePath) {
    throw new MarkError("filePath is required", {
      code: "MISSING_FILE_PATH",
      statusCode: 400
    });
  }

  if (!prompt) {
    throw new MarkError("prompt is required", {
      code: "MISSING_PROMPT",
      statusCode: 400
    });
  }

  let stat;
  try {
    stat = fsImpl.statSync(filePath);
  } catch (error) {
    throw new MarkError(`Exported file does not exist: ${filePath}`, {
      code: "FILE_NOT_FOUND",
      statusCode: 400
    });
  }

  if (!stat.isFile()) {
    throw new MarkError(`Exported path is not a file: ${filePath}`, {
      code: "NOT_A_FILE",
      statusCode: 400
    });
  }

  if (stat.size > maxBytes && !mediaPrepEnabled) {
    throw new MarkError(`Exported file is ${(stat.size / 1024 / 1024).toFixed(1)} MB, above the ${(maxBytes / 1024 / 1024).toFixed(0)} MB TwelveLabs direct upload limit. Use a smaller H.264 proxy export preset.`, {
      code: "FILE_TOO_LARGE",
      statusCode: 413,
      details: {
        size: stat.size,
        maxBytes
      }
    });
  }

  return {
    filePath,
    prompt,
    outputMode: normalizeOutputMode(body && body.outputMode),
    markerOutputStyle: normalizeMarkerOutputStyle((body && body.markerOutputStyle) || (body && body.markerStyle) || {}),
    subclipOptions: normalizeSubclipOptions(body && body.subclipOptions),
    promptContext: normalizePromptContext(body && body.promptContext),
    size: stat.size,
    keepProxy: Boolean(body.keepProxy),
    mediaSourceKind: normalizeMediaSourceKind((body && (body.mediaSourceKind || body.mediaSource || body.proxySource))),
    clip: body.clip || {},
    project: body.project || {}
  };
}

function isInsideDirectory(filePath, directoryPath) {
  const relative = path.relative(path.resolve(directoryPath), path.resolve(filePath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function cleanupExportedFile(filePath, options = {}) {
  const cleanupEnabled = options.cleanupExportedProxies !== undefined
    ? options.cleanupExportedProxies
    : config.cleanupExportedProxies;

  if (!cleanupEnabled || !filePath) {
    return false;
  }

  const exportDirectory = options.exportDestinationPath || config.exportDestinationPath;
  const resolvedFilePath = path.resolve(String(filePath));

  if (!isInsideDirectory(resolvedFilePath, exportDirectory)) {
    return false;
  }

  const fsImpl = options.fs || fs;
  try {
    fsImpl.rmSync(resolvedFilePath, {
      force: true
    });
    return true;
  } catch (error) {
    return false;
  }
}

function publicJob(job) {
  const body = {
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    outputMode: job.outputMode || "markers",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    clip: job.clip,
    mediaPrep: job.mediaPrep,
    debugEvents: job.debugEvents || [],
    error: job.error
  };

  if (job.status === "ready") {
    if (job.outputMode === "subclips") {
      body.subclips = job.subclips;
    } else {
      body.markers = job.markers;
    }
  }

  if (job.keepProxy && !job.proxyCleanedAt) {
    body.proxyUrl = `/jobs/${encodeURIComponent(job.id)}/proxy`;
  }

  return body;
}

function createJob(data) {
  const id = `mark_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const now = new Date().toISOString();
  return {
    id,
    status: "queued",
    stage: "queued",
    progress: 5,
    message: "Queued",
    createdAt: now,
    updatedAt: now,
    filePath: data.filePath,
    keepProxy: Boolean(data.keepProxy),
    prompt: data.prompt,
    outputMode: data.outputMode || "markers",
    markerOutputStyle: normalizeMarkerOutputStyle(data.markerOutputStyle || data.markerStyle || {}),
    subclipOptions: data.subclipOptions || normalizeSubclipOptions({}),
    promptContext: normalizePromptContext(data.promptContext),
    clip: data.clip,
    project: data.project,
    mediaSourceKind: data.mediaSourceKind || "unknown",
    size: data.size,
    markers: [],
    subclips: [],
    thumbnails: [],
    thumbnailDir: "",
    mediaPrep: null,
    debugEvents: []
  };
}

function updateJob(job, patch) {
  Object.assign(job, patch, {
    updatedAt: new Date().toISOString()
  });
}

function appendJobDebug(job, label, details) {
  if (!job.debugEvents) {
    job.debugEvents = [];
  }
  job.debugEvents.push({
    at: new Date().toISOString(),
    label,
    details
  });
  if (job.debugEvents.length > 100) {
    job.debugEvents.splice(0, job.debugEvents.length - 100);
  }
}

function nowMs() {
  return Date.now();
}

function elapsedSince(startedAt) {
  return Math.max(0, nowMs() - startedAt);
}

function appendTiming(job, label, startedAt, details = {}) {
  appendJobDebug(job, label, {
    ...details,
    elapsedMs: elapsedSince(startedAt)
  });
}

function logJobTiming(job, details) {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  console.log(JSON.stringify({
    at: new Date().toISOString(),
    event: "mark-job-timing",
    jobId: job.id,
    outputMode: job.outputMode,
    status: job.status,
    ...details
  }));
}

function fpsForProject(project) {
  const fps = Number(project && project.fps);
  return Number.isFinite(fps) && fps > 0 ? fps : 24;
}

function sourceOffsetSeconds(job, segment) {
  if (normalizeMediaSourceKind(segment && segment.sourceKind || job.mediaSourceKind) !== "avid-source-path") {
    return 0;
  }

  const head = Number(job.clip && job.clip.head);
  if (!Number.isFinite(head) || head <= 0) {
    return 0;
  }

  return head / fpsForProject(job.project);
}

function offsetTimedItem(item, segment, job) {
  const offset = Number(segment.startSeconds) || 0;
  const sourceOffset = sourceOffsetSeconds(job, segment);
  const startTime = Number(item.startTime) + offset - sourceOffset;
  const endTime = Number(item.endTime) + offset - sourceOffset;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= 0) {
    return null;
  }

  const mappedStart = Math.max(0, startTime);
  const mappedEnd = Math.max(mappedStart + 0.001, endTime);
  return {
    ...item,
    startTime: Number(mappedStart.toFixed(3)),
    endTime: Number(mappedEnd.toFixed(3)),
    duration: item.duration !== undefined ? Number((mappedEnd - mappedStart).toFixed(3)) : item.duration,
    _thumbnailSource: {
      filePath: segment.filePath,
      startTime: Math.max(0, Number(item.startTime) || 0)
    }
  };
}

function normalizeDedupeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isNearDuplicate(left, right, fields) {
  const sameText = fields.every(function sameField(field) {
    return normalizeDedupeText(left[field]) === normalizeDedupeText(right[field]);
  });
  return sameText
    && Math.abs((Number(left.startTime) || 0) - (Number(right.startTime) || 0)) <= 2.5
    && Math.abs((Number(left.endTime) || 0) - (Number(right.endTime) || 0)) <= 2.5;
}

function dedupeTimedItems(items, fields) {
  return items.reduce(function collect(result, item) {
    if (!result.some(function duplicate(existing) {
      return isNearDuplicate(existing, item, fields);
    })) {
      result.push(item);
    }
    return result;
  }, []).sort(function byStart(left, right) {
    return left.startTime - right.startTime;
  });
}

function summarizePreparedMedia(prepared) {
  const segments = prepared && Array.isArray(prepared.segments) ? prepared.segments : [];
  return {
    decision: prepared && prepared.decision || "unknown",
    segmentCount: segments.length,
    segments: segments.map(function summarize(segment) {
      return {
        filePath: segment.filePath,
        startSeconds: segment.startSeconds,
        durationSeconds: segment.durationSeconds,
        sourceKind: segment.sourceKind,
        size: segment.size
      };
    }),
    probe: prepared && prepared.probe ? {
      size: prepared.probe.size,
      durationSeconds: prepared.probe.durationSeconds,
      formatName: prepared.probe.formatName,
      video: prepared.probe.video,
      audio: prepared.probe.audio
    } : null
  };
}

async function addThumbnailsBestEffort(job, items, options) {
  const thumbnailGenerator = options.thumbnailGenerator || attachThumbnailsToItems;
  try {
    return await thumbnailGenerator(job, items, {
      enabled: options.thumbnailsEnabled !== undefined ? options.thumbnailsEnabled : config.thumbnailsEnabled,
      thumbnailsDir: options.thumbnailsDir || config.thumbnailsDir,
      width: options.thumbnailWidth || config.thumbnailWidth,
      maxPerJob: options.maxThumbnailsPerJob || config.maxThumbnailsPerJob,
      ffmpegPath: options.ffmpegPath,
      spawn: options.spawn,
      fs: options.fs,
      debug: function debug(label, details) {
        appendJobDebug(job, label, details);
      }
    });
  } catch (error) {
    appendJobDebug(job, "Thumbnail generation failed", {
      error: error.message
    });
    return stripThumbnailSources(items);
  }
}

async function runJob(job, options = {}) {
  const jobStartedAt = nowMs();
  const timing = {
    mediaPrepMs: 0,
    analysisMs: 0,
    thumbnailMs: 0,
    cleanupMs: 0,
    segments: []
  };
  const client = options.client || new TwelveLabsClient({
    apiKey: options.apiKey || config.twelveLabsApiKey,
    baseUrl: options.baseUrl || config.twelveLabsBaseUrl,
    pollIntervalMs: config.pollIntervalMs,
    assetTimeoutMs: config.assetTimeoutMs,
    taskTimeoutMs: config.taskTimeoutMs
  });
  const mediaPreparer = options.mediaPreparer || prepareMediaForUpload;
  const cleanupPrepared = options.cleanupPreparedSegments || cleanupPreparedSegments;
  let prepared = null;

  try {
    updateJob(job, {
      status: "running",
      stage: "preparing",
      progress: 15,
      message: "Preparing media for analysis"
    });

    const mediaPrepStartedAt = nowMs();
    prepared = await mediaPreparer(job.filePath, {
      enabled: options.mediaPrepEnabled !== undefined ? options.mediaPrepEnabled : config.mediaPrepEnabled,
      prepDir: options.mediaPrepDir || config.mediaPrepDir,
      targetMaxBytes: options.mediaTargetMaxBytes || config.mediaTargetMaxBytes,
      maxDirectUploadBytes: options.maxDirectUploadBytes || config.maxDirectUploadBytes,
      maxWidth: options.mediaMaxWidth || config.mediaMaxWidth,
      videoBitrate: options.mediaVideoBitrate || config.mediaVideoBitrate,
      audioBitrate: options.mediaAudioBitrate || config.mediaAudioBitrate,
      chunkSeconds: options.mediaChunkSeconds || config.mediaChunkSeconds,
      chunkOverlapSeconds: options.mediaChunkOverlapSeconds !== undefined
        ? options.mediaChunkOverlapSeconds
        : config.mediaChunkOverlapSeconds,
      sourceKind: job.mediaSourceKind,
      jobId: job.id,
      debug: function debug(label, details) {
        appendJobDebug(job, label, details);
      }
    });
    timing.mediaPrepMs = elapsedSince(mediaPrepStartedAt);
    appendTiming(job, "Media prep timing", mediaPrepStartedAt, {
      decision: prepared && prepared.decision,
      segmentCount: prepared && Array.isArray(prepared.segments) ? prepared.segments.length : 0
    });
    job.mediaPrep = summarizePreparedMedia(prepared);

    const segments = prepared && Array.isArray(prepared.segments) && prepared.segments.length > 0
      ? prepared.segments
      : [{
        filePath: job.filePath,
        startSeconds: 0,
        durationSeconds: 0,
        sourceKind: job.mediaSourceKind
      }];
    const markers = [];
    const subclips = [];
    const twelveLabs = [];

    appendJobDebug(job, "Media prep time mapping", {
      mediaSourceKind: job.mediaSourceKind,
      sourceOffsetSeconds: sourceOffsetSeconds(job, segments[0]),
      fps: fpsForProject(job.project),
      head: job.clip && job.clip.head
    });
    appendJobDebug(job, "Prompt context", {
      columns: job.promptContext && job.promptContext.columns || {}
    });

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      updateJob(job, {
        stage: "uploading",
        progress: Math.min(90, 25 + Math.round((index / segments.length) * 60)),
        message: segments.length > 1
          ? `Uploading prepared segment ${index + 1} of ${segments.length} to TwelveLabs`
          : "Uploading prepared media to TwelveLabs"
      });

      const analysisStartedAt = nowMs();
      const result = await client.analyzeFile(
        segment.filePath,
        job.prompt,
        segments.length > 1 ? `${job.id}_${index + 1}` : job.id,
        job.markerOutputStyle,
        job.outputMode,
        job.subclipOptions,
        job.promptContext
      );
      const analysisElapsedMs = elapsedSince(analysisStartedAt);
      timing.analysisMs += analysisElapsedMs;
      timing.segments.push({
        index,
        filePath: segment.filePath,
        startSeconds: segment.startSeconds,
        durationSeconds: segment.durationSeconds,
        elapsedMs: analysisElapsedMs,
        resultCount: job.outputMode === "subclips"
          ? (result.subclips || []).length
          : (result.markers || []).length
      });
      appendJobDebug(job, "TwelveLabs segment timing", timing.segments[timing.segments.length - 1]);
      twelveLabs.push({
        assetId: result.asset && result.asset.id,
        taskId: result.task && result.task.id,
        segmentIndex: index,
        startSeconds: segment.startSeconds
      });

      if (job.outputMode === "subclips") {
        (result.subclips || []).forEach(function addSubclip(subclip) {
          const mapped = offsetTimedItem(subclip, segment, job);
          if (mapped) {
            subclips.push(mapped);
          }
        });
      } else {
        (result.markers || []).forEach(function addMarker(marker) {
          const mapped = offsetTimedItem(marker, segment, job);
          if (mapped) {
            markers.push(mapped);
          }
        });
      }
    }

    let finalMarkers = job.outputMode === "subclips" ? [] : dedupeTimedItems(markers, ["name", "comment"]);
    let finalSubclips = job.outputMode === "subclips" ? dedupeTimedItems(subclips, ["name", "summary"]) : [];
    const finalItems = job.outputMode === "subclips" ? finalSubclips : finalMarkers;

    if (finalItems.length > 0) {
      updateJob(job, {
        stage: "thumbnailing",
        progress: 95,
        message: "Creating thumbnails"
      });
      const thumbnailStartedAt = nowMs();
      const withThumbnails = await addThumbnailsBestEffort(job, finalItems, options);
      timing.thumbnailMs = elapsedSince(thumbnailStartedAt);
      appendTiming(job, "Thumbnail phase timing", thumbnailStartedAt, {
        requestedCount: finalItems.length,
        generatedCount: Array.isArray(job.thumbnails) ? job.thumbnails.length : 0
      });
      if (job.outputMode === "subclips") {
        finalSubclips = withThumbnails;
      } else {
        finalMarkers = withThumbnails;
      }
    }

    updateJob(job, {
      status: "ready",
      stage: "ready",
      progress: 100,
      message: "Analysis complete",
      markers: finalMarkers,
      subclips: finalSubclips,
      twelveLabs
    });
    appendTiming(job, "Job total timing", jobStartedAt, timing);
  } catch (error) {
    updateJob(job, {
      status: "failed",
      stage: "failed",
      progress: 0,
      message: "Analysis failed",
      error: {
        message: error.message,
        code: error.code || "TWELVELABS_ERROR"
      }
    });
    appendTiming(job, "Job failed timing", jobStartedAt, {
      ...timing,
      error: error.message
    });
  } finally {
    const cleanupStartedAt = nowMs();
    if (prepared && prepared.segments) {
      cleanupPrepared(prepared.segments, options);
      appendJobDebug(job, "Media prep cleanup", {
        segmentCount: prepared.segments.length
      });
    }
    if (!job.keepProxy && cleanupExportedFile(job.filePath, options)) {
      job.proxyCleanedAt = new Date().toISOString();
    }
    timing.cleanupMs = elapsedSince(cleanupStartedAt);
    appendJobDebug(job, "Cleanup timing", {
      elapsedMs: timing.cleanupMs
    });
    logJobTiming(job, {
      elapsedMs: elapsedSince(jobStartedAt),
      mediaPrepMs: timing.mediaPrepMs,
      analysisMs: timing.analysisMs,
      thumbnailMs: timing.thumbnailMs,
      cleanupMs: timing.cleanupMs,
      segmentCount: timing.segments.length,
      resultCount: (job.markers || []).length + (job.subclips || []).length,
      thumbnailCount: Array.isArray(job.thumbnails) ? job.thumbnails.length : 0
    });
  }

  return job;
}

module.exports = {
  cleanupExportedFile,
  createJob,
  publicJob,
  runJob,
  normalizeOutputMode,
  normalizeMediaSourceKind,
  validateJobRequest
};
