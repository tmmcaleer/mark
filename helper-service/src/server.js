const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const axios = require("axios");
const express = require("express");
const cors = require("cors");

const config = require("./config");
const packageInfo = require("../package.json");
const {
  clearSession,
  readSession,
  writeSession
} = require("./auth-session");
const {
  cleanupExportedFile,
  createJob,
  publicJob,
  runJob,
  validateJobRequest
} = require("./job-runner");
const { MarkError } = require("./mark-error");
const { resolveProxy } = require("./proxy-resolver");
const {
  cleanupJobThumbnails,
  cleanupStaleThumbnailCache,
  findJobThumbnail
} = require("./thumbnails");

const app = express();
const jobs = new Map();
const pendingJobs = [];
let activeJobCount = 0;
let runJobImpl = runJob;

fs.mkdirSync(config.exportDestinationPath, {
  recursive: true
});
cleanupStaleThumbnailCache();

app.use(cors({
  origin: true
}));
app.use(express.json({
  limit: "1mb"
}));

app.get("/health", function health(req, res) {
  res.json({
    ok: true,
    name: packageInfo.name,
    version: packageInfo.version
  });
});

app.get("/config", function getConfig(req, res) {
  res.json({
    exportSettingsName: config.exportSettingsName,
    exportDestinationPath: config.exportDestinationPath,
    cleanupExportedProxies: config.cleanupExportedProxies,
    supportsProxyPlayback: true,
    maxDirectUploadBytes: config.maxDirectUploadBytes,
    maxConcurrentJobs: config.maxConcurrentJobs,
    proxyRoots: config.proxyRoots,
    proxyExtensions: config.proxyExtensions,
    mediaPrepEnabled: config.mediaPrepEnabled,
    mediaPrepDir: config.mediaPrepDir,
    mediaTargetMaxBytes: config.mediaTargetMaxBytes,
    mediaMaxWidth: config.mediaMaxWidth,
    mediaVideoBitrate: config.mediaVideoBitrate,
    mediaAudioBitrate: config.mediaAudioBitrate,
    mediaChunkSeconds: config.mediaChunkSeconds,
    mediaChunkOverlapSeconds: config.mediaChunkOverlapSeconds,
    thumbnailsEnabled: config.thumbnailsEnabled,
    thumbnailWidth: config.thumbnailWidth,
    maxThumbnailsPerJob: config.maxThumbnailsPerJob,
    hasTwelveLabsApiKey: Boolean(config.twelveLabsApiKey),
    analysisMode: "cloud",
    cloudAnalysisEnabled: config.markCloudAnalysisEnabled,
    cloudUrl: config.markCloudUrl,
    hasMarkSession: Boolean(readSession(config.markSessionPath).token)
  });
});

app.get("/account", function getAccountRoute(req, res) {
  if (!config.markCloudAnalysisEnabled) {
    res.json({
      authenticated: false,
      analysisMode: "cloud",
      serviceUnavailable: true,
      credits: {
        balanceMinutes: 0
      },
      creditPacks: []
    });
    return;
  }

  const token = readSession(config.markSessionPath).token;
  if (!token) {
    res.json({
      authenticated: false,
      analysisMode: "cloud",
      credits: {
        balanceMinutes: 0
      },
      creditPacks: []
    });
    return;
  }

  cloudRequest("GET", "/account").then(function ok(account) {
    res.json(account);
  }).catch(function failed(error) {
    sendError(res, error);
  });
});

app.post("/auth/device/start", function startDeviceRoute(req, res) {
  if (!config.markCloudAnalysisEnabled || !config.markCloudUrl) {
    res.status(503).json({
      error: {
        code: "CLOUD_NOT_CONFIGURED",
        message: "Mark account service is not configured"
      }
    });
    return;
  }

  cloudRequest("POST", "/auth/device/start", req.body || {}, {
    skipAuth: true
  }).then(function started(payload) {
    let openedInBrowser = false;
    if (payload.verificationUri) {
      openedInBrowser = openExternalUrl(payload.verificationUri);
    }
    res.status(201).json({
      ...payload,
      openedInBrowser
    });
  }).catch(function failed(error) {
    sendError(res, error);
  });
});

app.get("/auth/device/poll", function pollDeviceRoute(req, res) {
  const deviceCode = req.query.deviceCode || req.query.device_code;
  cloudRequest("GET", `/auth/device/poll?deviceCode=${encodeURIComponent(deviceCode || "")}`, null, {
    skipAuth: true
  }).then(function polled(payload) {
    if (payload.status === "authorized" && payload.markSessionToken) {
      writeSession(config.markSessionPath, payload.markSessionToken);
    }
    res.json({
      status: payload.status,
      expiresAt: payload.expiresAt
    });
  }).catch(function failed(error) {
    sendError(res, error);
  });
});

app.post("/auth/sign-out", function signOutRoute(req, res) {
  clearSession(config.markSessionPath);
  res.status(204).end();
});

app.post("/billing/checkout-sessions", function checkoutRoute(req, res) {
  cloudRequest("POST", "/billing/checkout-sessions", req.body || {}).then(function checkout(payload) {
    let openedInBrowser = false;
    if (payload.url) {
      openedInBrowser = openExternalUrl(payload.url);
    }
    res.status(201).json({
      ...payload,
      openedInBrowser
    });
  }).catch(function failed(error) {
    sendError(res, error);
  });
});

app.post("/proxy/resolve", function resolveProxyRoute(req, res) {
  try {
    res.json(resolveProxy(req.body));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/jobs", function createJobRoute(req, res) {
  if (!config.markCloudAnalysisEnabled && !config.twelveLabsApiKey) {
    res.status(503).json({
      error: {
        code: "MISSING_API_KEY",
        message: "Mark cloud analysis is not configured"
      }
    });
    return;
  }

  if (config.markCloudAnalysisEnabled && !readSession(config.markSessionPath).token) {
    res.status(401).json({
      error: {
        code: "AUTH_REQUIRED",
        message: "Sign in to Mark before analyzing media"
      }
    });
    return;
  }

  let data;
  try {
    data = validateJobRequest(req.body);
  } catch (error) {
    cleanupExportedFile(req.body && req.body.filePath);
    sendError(res, error);
    return;
  }

  const job = createJob(data);
  jobs.set(job.id, job);
  res.status(202).json(publicJob(job));
  enqueueJob(job);
});

app.get("/jobs/:id", function getJobRoute(req, res) {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({
      error: {
        code: "JOB_NOT_FOUND",
        message: "Job not found"
      }
    });
    return;
  }

  res.json(publicJob(job));
});

app.get("/jobs/:id/thumbnails/:fileName", function getJobThumbnailRoute(req, res) {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({
      error: {
        code: "JOB_NOT_FOUND",
        message: "Job not found"
      }
    });
    return;
  }

  const thumbnail = findJobThumbnail(job, req.params.fileName);
  if (!thumbnail || !thumbnail.filePath) {
    res.status(404).json({
      error: {
        code: "THUMBNAIL_NOT_FOUND",
        message: "Thumbnail was not found"
      }
    });
    return;
  }

  const thumbnailPath = path.resolve(thumbnail.filePath);
  const thumbnailRoot = path.resolve(config.thumbnailsDir);
  const relative = path.relative(thumbnailRoot, thumbnailPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    res.status(403).json({
      error: {
        code: "THUMBNAIL_FORBIDDEN",
        message: "Thumbnail path is outside the Mark thumbnail directory"
      }
    });
    return;
  }

  let stat;
  try {
    stat = fs.statSync(thumbnailPath);
  } catch (error) {
    res.status(404).json({
      error: {
        code: "THUMBNAIL_NOT_FOUND",
        message: "Thumbnail file was not found"
      }
    });
    return;
  }

  if (!stat.isFile()) {
    res.status(404).json({
      error: {
        code: "THUMBNAIL_NOT_FILE",
        message: "Thumbnail path is not a file"
      }
    });
    return;
  }

  res.writeHead(200, {
    "Content-Length": stat.size,
    "Content-Type": "image/jpeg",
    "Cache-Control": "private, max-age=3600"
  });
  fs.createReadStream(thumbnailPath).pipe(res);
});

app.get("/jobs/:id/proxy", function getJobProxyRoute(req, res) {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({
      error: {
        code: "JOB_NOT_FOUND",
        message: "Job not found"
      }
    });
    return;
  }

  if (!job.keepProxy || job.proxyCleanedAt || !job.filePath) {
    res.status(404).json({
      error: {
        code: "PROXY_NOT_AVAILABLE",
        message: "Proxy video is not available for this job"
      }
    });
    return;
  }

  const proxyPath = path.resolve(job.filePath);
  const exportRoot = path.resolve(config.exportDestinationPath);
  const relative = path.relative(exportRoot, proxyPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    res.status(403).json({
      error: {
        code: "PROXY_FORBIDDEN",
        message: "Proxy path is outside the Mark export directory"
      }
    });
    return;
  }

  let stat;
  try {
    stat = fs.statSync(proxyPath);
  } catch (error) {
    res.status(404).json({
      error: {
        code: "PROXY_NOT_FOUND",
        message: "Proxy video file was not found"
      }
    });
    return;
  }

  if (!stat.isFile()) {
    res.status(404).json({
      error: {
        code: "PROXY_NOT_FILE",
        message: "Proxy path is not a file"
      }
    });
    return;
  }

  streamProxy(req, res, proxyPath, stat.size);
});

app.delete("/jobs/:id", function deleteJobRoute(req, res) {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({
      error: {
        code: "JOB_NOT_FOUND",
        message: "Job not found"
      }
    });
    return;
  }

  cleanupExportedFile(job.filePath, {
    cleanupExportedProxies: true
  });
  cleanupJobThumbnails(job);
  const pendingIndex = pendingJobs.findIndex(function findPending(pendingJob) {
    return pendingJob.id === job.id;
  });
  if (pendingIndex !== -1) {
    pendingJobs.splice(pendingIndex, 1);
  }
  jobs.delete(req.params.id);
  res.status(204).end();
});

function enqueueJob(job) {
  pendingJobs.push(job);
  startQueuedJobs();
}

function startQueuedJobs() {
  while (activeJobCount < config.maxConcurrentJobs && pendingJobs.length > 0) {
    const job = pendingJobs.shift();
    if (!jobs.has(job.id)) {
      continue;
    }

    activeJobCount += 1;
    setImmediate(function startJob() {
      runJobImpl(job).catch(function catchRunError(error) {
        job.status = "failed";
        job.stage = "failed";
        job.progress = 0;
        job.error = {
          code: error.code || "JOB_ERROR",
          message: error.message
        };
      }).finally(function releaseSlot() {
        activeJobCount = Math.max(0, activeJobCount - 1);
        startQueuedJobs();
      });
    });
  }
}

function setJobRunnerForTest(runner) {
  runJobImpl = runner || runJob;
}

function jobQueueState() {
  return {
    activeJobCount,
    pendingJobCount: pendingJobs.length
  };
}

function streamProxy(req, res, filePath, size) {
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, {
      "Content-Length": size,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes"
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    res.writeHead(416, {
      "Content-Range": `bytes */${size}`
    });
    res.end();
    return;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    res.writeHead(416, {
      "Content-Range": `bytes */${size}`
    });
    res.end();
    return;
  }

  const safeEnd = Math.min(end, size - 1);
  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${safeEnd}/${size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": safeEnd - start + 1,
    "Content-Type": "video/mp4"
  });
  fs.createReadStream(filePath, {
    start,
    end: safeEnd
  }).pipe(res);
}

function sendError(res, error) {
  const statusCode = error instanceof MarkError ? error.statusCode : 500;
  res.status(statusCode).json({
    error: {
      code: error.code || "ERROR",
      message: error.message,
      details: error.details
    }
  });
}

function cloudRequest(method, requestPath, body, options = {}) {
  if (!config.markCloudUrl) {
    return Promise.reject(new MarkError("Mark account service is not configured", {
      code: "CLOUD_NOT_CONFIGURED",
      statusCode: 503
    }));
  }

  const token = readSession(config.markSessionPath).token;
  if (!options.skipAuth && !token) {
    return Promise.reject(new MarkError("Sign in to Mark first", {
      code: "AUTH_REQUIRED",
      statusCode: 401
    }));
  }

  return axios({
    method,
    url: `${config.markCloudUrl.replace(/\/+$/, "")}${requestPath}`,
    data: body || undefined,
    headers: {
      "Content-Type": "application/json",
      ...(token && !options.skipAuth ? {
        Authorization: `Bearer ${token}`
      } : {})
    }
  }).then(function parse(response) {
    return response.data;
  }).catch(function normalize(error) {
    const payload = error.response && error.response.data && error.response.data.error;
    throw new MarkError(payload && payload.message || error.message, {
      code: payload && payload.code || "CLOUD_REQUEST_FAILED",
      statusCode: error.response && error.response.status || 502,
      details: payload && payload.details
    });
  });
}

function openExternalUrl(url) {
  if (!config.openBrowserForAuth || !url) {
    return false;
  }

  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32"
    ? ["/c", "start", "", url]
    : [url];

  try {
    const child = childProcess.spawn(command, args, {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return true;
  } catch (error) {
    // The panel still receives the URL and can show it if opening fails.
    return false;
  }
}

if (require.main === module) {
  app.listen(config.port, function listen() {
    console.log(`Mark helper listening on http://localhost:${config.port}`);
    console.log(`Export directory: ${config.exportDestinationPath}`);
  });
}

module.exports = {
  app,
  jobs,
  pendingJobs,
  startQueuedJobs,
  setJobRunnerForTest,
  jobQueueState
};
