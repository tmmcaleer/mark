const os = require("os");
const path = require("path");
const fs = require("fs");
const { defaultSessionPath } = require("./auth-session");

const DEFAULT_MAX_DIRECT_UPLOAD_BYTES = 200 * 1024 * 1024;
const DEFAULT_PROXY_EXTENSIONS = [".mp4", ".mov", ".m4v"];
const DEFAULT_MEDIA_MAX_WIDTH = 1280;
const DEFAULT_MEDIA_VIDEO_BITRATE = "1800k";
const DEFAULT_MEDIA_AUDIO_BITRATE = "96k";
const DEFAULT_MEDIA_CHUNK_SECONDS = 600;
const DEFAULT_MEDIA_CHUNK_OVERLAP_SECONDS = 2;
const DEFAULT_THUMBNAIL_WIDTH = 160;
const DEFAULT_THUMBNAIL_MAX_PER_JOB = 50;
const DEFAULT_THUMBNAIL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) {
      continue;
    }

    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[match[1]] = value;
  }
}

if (process.env.NODE_ENV !== "test") {
  loadDotEnv(path.join(process.cwd(), ".env"));
}

function intFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function floatFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function stringFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function boolFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "no"].includes(String(value).trim().toLowerCase());
}

function listFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  return String(value)
    .split(new RegExp(`[${path.delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\n]`))
    .map(function clean(item) {
      return item.trim();
    })
    .filter(Boolean);
}

const maxDirectUploadBytes = intFromEnv("MARK_MAX_UPLOAD_BYTES", DEFAULT_MAX_DIRECT_UPLOAD_BYTES);

const config = {
  port: intFromEnv("MARK_HELPER_PORT", 4500),
  twelveLabsApiKey: process.env.TWELVELABS_API_KEY || "",
  twelveLabsBaseUrl: process.env.TWELVELABS_API_BASE_URL || "https://api.twelvelabs.io/v1.3",
  markCloudUrl: stringFromEnv("MARK_CLOUD_URL", ""),
  markCloudAnalysisEnabled: boolFromEnv("MARK_CLOUD_ANALYSIS_ENABLED", Boolean(process.env.MARK_CLOUD_URL)),
  markSessionPath: stringFromEnv("MARK_SESSION_PATH", defaultSessionPath()),
  openBrowserForAuth: boolFromEnv("MARK_OPEN_BROWSER", process.env.NODE_ENV !== "test"),
  exportSettingsName: process.env.MARK_EXPORT_SETTING || "Mark 12Labs Proxy",
  exportDestinationPath: process.env.MARK_EXPORT_DIR || path.join(os.tmpdir(), "mark-exports"),
  cleanupExportedProxies: boolFromEnv("MARK_CLEANUP_EXPORTS", true),
  maxDirectUploadBytes,
  maxConcurrentJobs: intFromEnv("MARK_MAX_CONCURRENT_JOBS", 3),
  proxyRoots: listFromEnv("MARK_PROXY_ROOTS", []),
  proxyExtensions: listFromEnv("MARK_PROXY_EXTENSIONS", DEFAULT_PROXY_EXTENSIONS),
  pollIntervalMs: intFromEnv("MARK_POLL_INTERVAL_MS", 3000),
  taskTimeoutMs: intFromEnv("MARK_TASK_TIMEOUT_MS", 20 * 60 * 1000),
  assetTimeoutMs: intFromEnv("MARK_ASSET_TIMEOUT_MS", 10 * 60 * 1000),
  mediaPrepEnabled: boolFromEnv("MARK_MEDIA_PREP_ENABLED", true),
  mediaPrepDir: stringFromEnv("MARK_MEDIA_PREP_DIR", path.join(os.tmpdir(), "mark-media-prep")),
  mediaTargetMaxBytes: Math.min(
    maxDirectUploadBytes,
    intFromEnv("MARK_MEDIA_TARGET_MAX_BYTES", Math.floor(maxDirectUploadBytes * 0.9))
  ),
  mediaMaxWidth: intFromEnv("MARK_MEDIA_MAX_WIDTH", DEFAULT_MEDIA_MAX_WIDTH),
  mediaVideoBitrate: stringFromEnv("MARK_MEDIA_VIDEO_BITRATE", DEFAULT_MEDIA_VIDEO_BITRATE),
  mediaAudioBitrate: stringFromEnv("MARK_MEDIA_AUDIO_BITRATE", DEFAULT_MEDIA_AUDIO_BITRATE),
  mediaChunkSeconds: intFromEnv("MARK_MEDIA_CHUNK_SECONDS", DEFAULT_MEDIA_CHUNK_SECONDS),
  mediaChunkOverlapSeconds: floatFromEnv("MARK_MEDIA_CHUNK_OVERLAP_SECONDS", DEFAULT_MEDIA_CHUNK_OVERLAP_SECONDS),
  thumbnailsEnabled: boolFromEnv("MARK_THUMBNAILS_ENABLED", true),
  thumbnailsDir: stringFromEnv("MARK_THUMBNAILS_DIR", path.join(os.tmpdir(), "mark-thumbnails")),
  thumbnailWidth: intFromEnv("MARK_THUMBNAIL_WIDTH", DEFAULT_THUMBNAIL_WIDTH),
  maxThumbnailsPerJob: intFromEnv("MARK_MAX_THUMBNAILS_PER_JOB", DEFAULT_THUMBNAIL_MAX_PER_JOB),
  thumbnailMaxAgeMs: intFromEnv("MARK_THUMBNAIL_MAX_AGE_MS", DEFAULT_THUMBNAIL_MAX_AGE_MS)
};

module.exports = config;
