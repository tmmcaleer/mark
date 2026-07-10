const fs = require("fs");
const os = require("os");
const path = require("path");

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

function stringFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  const text = String(value).trim();
  return text || fallback;
}

function parseCreditPacks() {
  const raw = process.env.MARK_CREDIT_PACKS;
  if (!raw) {
    return [
      {
        id: "starter",
        label: "Starter",
        minutes: 60,
        stripePriceId: "price_mark_starter"
      },
      {
        id: "studio",
        label: "Studio",
        minutes: 240,
        stripePriceId: "price_mark_studio"
      }
    ];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("MARK_CREDIT_PACKS must be a JSON array");
  }

  return parsed.map(function normalize(pack) {
    const id = String(pack.id || "").trim();
    const label = String(pack.label || id).trim();
    const minutes = Number(pack.minutes);
    const stripePriceId = String(pack.stripePriceId || pack.priceId || "").trim();
    if (!id || !label || !Number.isFinite(minutes) || minutes <= 0 || !stripePriceId) {
      throw new Error("Each MARK_CREDIT_PACKS item needs id, label, minutes, and stripePriceId");
    }
    return {
      id,
      label,
      minutes: Math.floor(minutes),
      stripePriceId
    };
  });
}

const config = {
  port: intFromEnv("MARK_CLOUD_PORT", intFromEnv("PORT", 4510)),
  appUrl: stringFromEnv("MARK_CLOUD_APP_URL", "http://localhost:4510"),
  supabaseUrl: stringFromEnv("SUPABASE_URL", ""),
  supabasePublishableKey: stringFromEnv("SUPABASE_PUBLISHABLE_KEY", stringFromEnv("SUPABASE_ANON_KEY", "")),
  supabaseSecretKey: stringFromEnv("SUPABASE_SECRET_KEY", stringFromEnv("SUPABASE_SERVICE_ROLE_KEY", "")),
  stripeSecretKey: stringFromEnv("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: stringFromEnv("STRIPE_WEBHOOK_SECRET", ""),
  twelveLabsApiKey: stringFromEnv("TWELVELABS_API_KEY", ""),
  twelveLabsBaseUrl: stringFromEnv("TWELVELABS_API_BASE_URL", "https://api.twelvelabs.io/v1.3"),
  sessionSecret: stringFromEnv("MARK_SESSION_SECRET", "mark-dev-session-secret-change-me"),
  sessionTtlSeconds: intFromEnv("MARK_SESSION_TTL_SECONDS", 30 * 24 * 60 * 60),
  deviceSessionTtlSeconds: intFromEnv("MARK_DEVICE_SESSION_TTL_SECONDS", 10 * 60),
  uploadDir: stringFromEnv("MARK_CLOUD_UPLOAD_DIR", path.join(os.tmpdir(), "mark-cloud-uploads")),
  creditPacks: parseCreditPacks()
};

module.exports = config;
