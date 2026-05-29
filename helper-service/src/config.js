const os = require("os");
const path = require("path");
const fs = require("fs");

const DEFAULT_MAX_DIRECT_UPLOAD_BYTES = 200 * 1024 * 1024;

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

function boolFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "no"].includes(String(value).trim().toLowerCase());
}

const config = {
  port: intFromEnv("MARK_HELPER_PORT", 4500),
  twelveLabsApiKey: process.env.TWELVELABS_API_KEY || "",
  twelveLabsBaseUrl: process.env.TWELVELABS_API_BASE_URL || "https://api.twelvelabs.io/v1.3",
  exportSettingsName: process.env.MARK_EXPORT_SETTING || "Mark 12Labs Proxy",
  exportDestinationPath: process.env.MARK_EXPORT_DIR || path.join(os.tmpdir(), "mark-exports"),
  cleanupExportedProxies: boolFromEnv("MARK_CLEANUP_EXPORTS", true),
  maxDirectUploadBytes: intFromEnv("MARK_MAX_UPLOAD_BYTES", DEFAULT_MAX_DIRECT_UPLOAD_BYTES),
  pollIntervalMs: intFromEnv("MARK_POLL_INTERVAL_MS", 3000),
  taskTimeoutMs: intFromEnv("MARK_TASK_TIMEOUT_MS", 20 * 60 * 1000),
  assetTimeoutMs: intFromEnv("MARK_ASSET_TIMEOUT_MS", 10 * 60 * 1000)
};

module.exports = config;
