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

function booleanFromEnv(name, fallback) {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  throw new Error(`${name} must be true or false`);
}

function listFromEnv(name) {
  return String(process.env[name] || "")
    .split(/[\n,]/)
    .map(function clean(item) {
      return item.trim().replace(/\/+$/, "");
    })
    .filter(Boolean);
}

function parseCreditPacks() {
  const raw = process.env.MARK_CREDIT_PACKS;
  if (!raw) {
    return [
      {
        id: "starter",
        label: "Starter",
        minutes: 60,
        amountCents: 499,
        currency: "usd",
        stripePriceId: "price_mark_starter"
      },
      {
        id: "studio",
        label: "Studio",
        minutes: 240,
        amountCents: 1499,
        currency: "usd",
        stripePriceId: "price_mark_studio"
      },
      {
        id: "production",
        label: "Production",
        minutes: 600,
        amountCents: 3599,
        currency: "usd",
        stripePriceId: "price_mark_production"
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
    const amountCents = Number(pack.amountCents);
    const currency = String(pack.currency || "").trim().toLowerCase();
    const stripePriceId = String(pack.stripePriceId || pack.priceId || "").trim();
    if (!id || !label || !Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(amountCents) || amountCents <= 0 || !/^[a-z]{3}$/.test(currency) || !stripePriceId) {
      throw new Error("Each MARK_CREDIT_PACKS item needs id, label, minutes, amountCents, currency, and stripePriceId");
    }
    return {
      id,
      label,
      minutes: Math.floor(minutes),
      amountCents,
      currency,
      stripePriceId
    };
  });
}

const appUrl = stringFromEnv("MARK_CLOUD_APP_URL", "http://localhost:4510").replace(/\/+$/, "");
const webAppUrl = stringFromEnv("MARK_WEB_APP_URL", appUrl).replace(/\/+$/, "");
const webAppOrigin = new URL(webAppUrl).origin;
const corsOrigins = Array.from(new Set([
  webAppOrigin,
  "https://markmarks.app",
  "https://www.markmarks.app",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...listFromEnv("MARK_CORS_ORIGINS")
]));

const config = {
  port: intFromEnv("MARK_CLOUD_PORT", intFromEnv("PORT", 4510)),
  appUrl,
  webAppUrl,
  corsOrigins,
  supabaseUrl: stringFromEnv("SUPABASE_URL", ""),
  supabasePublishableKey: stringFromEnv("SUPABASE_PUBLISHABLE_KEY", stringFromEnv("SUPABASE_ANON_KEY", "")),
  supabaseSecretKey: stringFromEnv("SUPABASE_SECRET_KEY", stringFromEnv("SUPABASE_SERVICE_ROLE_KEY", "")),
  stripeSecretKey: stringFromEnv("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: stringFromEnv("STRIPE_WEBHOOK_SECRET", ""),
  stripeAutomaticTaxEnabled: booleanFromEnv("STRIPE_AUTOMATIC_TAX_ENABLED", false),
  twelveLabsApiKey: stringFromEnv("TWELVELABS_API_KEY", ""),
  twelveLabsBaseUrl: stringFromEnv("TWELVELABS_API_BASE_URL", "https://api.twelvelabs.io/v1.3"),
  sessionSecret: stringFromEnv("MARK_SESSION_SECRET", "mark-dev-session-secret-change-me"),
  sessionTtlSeconds: intFromEnv("MARK_SESSION_TTL_SECONDS", 30 * 24 * 60 * 60),
  deviceSessionTtlSeconds: intFromEnv("MARK_DEVICE_SESSION_TTL_SECONDS", 10 * 60),
  uploadDir: stringFromEnv("MARK_CLOUD_UPLOAD_DIR", path.join(os.tmpdir(), "mark-cloud-uploads")),
  creditPacks: parseCreditPacks()
};

module.exports = config;
