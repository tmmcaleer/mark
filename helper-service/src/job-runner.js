const fs = require("fs");
const path = require("path");

const config = require("./config");
const { MarkError } = require("./mark-error");
const { TwelveLabsClient, normalizeMarkerOutputStyle } = require("./twelvelabs-client");

function sanitizePrompt(prompt) {
  return String(prompt || "").trim();
}

function validateJobRequest(body, options = {}) {
  const fsImpl = options.fs || fs;
  const maxBytes = options.maxDirectUploadBytes || config.maxDirectUploadBytes;
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

  if (stat.size > maxBytes) {
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
    markerOutputStyle: normalizeMarkerOutputStyle((body && body.markerOutputStyle) || (body && body.markerStyle) || {}),
    size: stat.size,
    keepProxy: Boolean(body.keepProxy),
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
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    clip: job.clip,
    markers: job.status === "ready" ? job.markers : undefined,
    error: job.error
  };

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
    markerOutputStyle: data.markerOutputStyle || normalizeMarkerOutputStyle(data.markerStyle || {}),
    clip: data.clip,
    project: data.project,
    size: data.size,
    markers: []
  };
}

function updateJob(job, patch) {
  Object.assign(job, patch, {
    updatedAt: new Date().toISOString()
  });
}

async function runJob(job, options = {}) {
  const client = options.client || new TwelveLabsClient({
    apiKey: options.apiKey || config.twelveLabsApiKey,
    baseUrl: options.baseUrl || config.twelveLabsBaseUrl,
    pollIntervalMs: config.pollIntervalMs,
    assetTimeoutMs: config.assetTimeoutMs,
    taskTimeoutMs: config.taskTimeoutMs
  });

  try {
    updateJob(job, {
      status: "running",
      stage: "uploading",
      progress: 25,
      message: "Uploading proxy to TwelveLabs"
    });

    const result = await client.analyzeFile(job.filePath, job.prompt, job.id, job.markerOutputStyle);

    updateJob(job, {
      status: "ready",
      stage: "ready",
      progress: 100,
      message: "Analysis complete",
      markers: result.markers || [],
      twelveLabs: {
        assetId: result.asset && result.asset.id,
        taskId: result.task && result.task.id
      }
    });
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
  } finally {
    if (!job.keepProxy && cleanupExportedFile(job.filePath, options)) {
      job.proxyCleanedAt = new Date().toISOString();
    }
  }

  return job;
}

module.exports = {
  cleanupExportedFile,
  createJob,
  publicJob,
  runJob,
  validateJobRequest
};
