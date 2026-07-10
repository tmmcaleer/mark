const fs = require("fs");
const path = require("path");

const cors = require("cors");
const express = require("express");
const multer = require("multer");

const defaultConfig = require("./config");
const {
  bearerToken,
  hashDeviceCode,
  randomToken,
  randomUserCode,
  requireMarkSession,
  signSessionToken,
  validateSupabaseAccessToken
} = require("./auth");
const {
  constructWebhookEvent,
  createCheckoutSession,
  createStripeClient,
  handleStripeEvent,
  publicCreditPack
} = require("./billing");
const { analyzeUploadedSegment, createAnalyzer } = require("./analysis");
const { HttpError, sendError } = require("./http-error");
const { billableMinutesForSeconds, probeDurationSeconds } = require("./probe");
const { createStore, createSupabaseAuthClient } = require("./store");

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #111214; color: #e6e8eb; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #111214; }
      main { width: min(420px, calc(100vw - 32px)); display: grid; gap: 16px; }
      h1 { margin: 0; font-size: 24px; line-height: 1.25; }
      p { margin: 0; color: #9a9fa8; line-height: 1.45; }
      form, .panel { display: grid; gap: 12px; padding: 16px; border: 1px solid #303236; border-radius: 6px; background: #1a1b1e; }
      input { min-height: 38px; border: 1px solid #303236; border-radius: 6px; padding: 0 10px; color: #e6e8eb; background: #111214; }
      button { min-height: 38px; border: 1px solid #7fa8d8; border-radius: 6px; padding: 0 14px; color: #111214; background: #9bbce2; font-weight: 650; }
      small { color: #70757d; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function devicePage(config) {
  const body = `<main>
  <h1>Sign in to Mark</h1>
  <p>Enter your email, then open the magic link from this browser. Mark will finish signing in automatically.</p>
  <form id="sign-in-form">
    <input id="email" type="email" autocomplete="email" placeholder="you@example.com" required>
    <button type="submit">Send magic link</button>
    <small id="message"></small>
  </form>
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0"></script>
<script>
const deviceCode = new URLSearchParams(location.search).get("device_code") || "";
const message = document.getElementById("message");
const client = window.supabase.createClient(${JSON.stringify(config.supabaseUrl)}, ${JSON.stringify(config.supabasePublishableKey)});
document.getElementById("sign-in-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  message.textContent = "Sending...";
  const email = document.getElementById("email").value.trim();
  const redirectTo = ${JSON.stringify(config.appUrl)} + "/auth/callback?device_code=" + encodeURIComponent(deviceCode);
  const result = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });
  message.textContent = result.error ? result.error.message : "Check your email for the Mark sign-in link.";
});
</script>`;
  return htmlPage("Sign in to Mark", body);
}

function callbackPage(config) {
  const body = `<main>
  <h1>Completing Mark sign-in</h1>
  <div class="panel"><p id="message">Checking your browser session...</p></div>
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0"></script>
<script>
const params = new URLSearchParams(location.search);
const deviceCode = params.get("device_code") || "";
const message = document.getElementById("message");
const client = window.supabase.createClient(${JSON.stringify(config.supabaseUrl)}, ${JSON.stringify(config.supabasePublishableKey)});
(async function complete() {
  const result = await client.auth.getSession();
  const session = result.data && result.data.session;
  if (!session || !session.access_token) {
    message.textContent = result.error ? result.error.message : "No Supabase session was found. Request a new Mark sign-in link.";
    return;
  }
  const response = await fetch("/auth/device/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + session.access_token
    },
    body: JSON.stringify({ deviceCode })
  });
  const payload = await response.json();
  message.textContent = response.ok ? "Mark is signed in. You can return to the panel." : (payload.error && payload.error.message || "Could not complete sign-in.");
})();
</script>`;
  return htmlPage("Mark Sign-in Complete", body);
}

function createApp(options = {}) {
  const config = options.config || defaultConfig;
  fs.mkdirSync(config.uploadDir, {
    recursive: true
  });

  const app = express();
  const store = createStore(config, options);
  const supabaseAuth = createSupabaseAuthClient(config, options);
  const stripe = createStripeClient(config, options);
  const analyzer = createAnalyzer(config, options);
  const probeDuration = options.probeDuration || function probe(filePath) {
    return probeDurationSeconds(filePath, options);
  };
  const upload = multer({
    dest: config.uploadDir
  });
  const deps = {
    analyzer,
    config,
    probeDuration,
    store,
    stripe,
    supabaseAuth
  };

  app.use(cors({
    origin: true
  }));

  app.post("/webhooks/stripe", express.raw({
    type: "application/json"
  }), async function stripeWebhook(req, res, next) {
    try {
      const event = constructWebhookEvent(deps, req);
      const result = await handleStripeEvent(deps, event);
      res.json({
        received: true,
        result
      });
    } catch (error) {
      next(error);
    }
  });

  app.use(express.json({
    limit: "1mb"
  }));

  app.get("/health", function health(req, res) {
    res.json({
      ok: true,
      name: "mark-cloud-service",
      version: "0.1.0"
    });
  });

  app.get("/auth/device", function authDevicePage(req, res) {
    res.type("html").send(devicePage(config));
  });

  app.get("/auth/callback", function authCallbackPage(req, res) {
    res.type("html").send(callbackPage(config));
  });

  app.post("/auth/device/start", async function startDevice(req, res, next) {
    try {
      if (!config.supabaseUrl || !config.supabasePublishableKey) {
        throw new HttpError("Supabase browser auth is not configured", {
          code: "SUPABASE_NOT_CONFIGURED",
          statusCode: 503
        });
      }
      const deviceCode = randomToken(32);
      const userCode = randomUserCode();
      const expiresAt = new Date(Date.now() + config.deviceSessionTtlSeconds * 1000).toISOString();
      await store.createDeviceSession({
        deviceCodeHash: hashDeviceCode(deviceCode),
        userCode,
        expiresAt
      });
      res.status(201).json({
        deviceCode,
        userCode,
        verificationUri: `${config.appUrl}/auth/device?device_code=${encodeURIComponent(deviceCode)}`,
        expiresAt,
        intervalSeconds: 2
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/device/complete", async function completeDevice(req, res, next) {
    try {
      const deviceCode = req.body && req.body.deviceCode;
      if (!deviceCode) {
        throw new HttpError("deviceCode is required", {
          code: "DEVICE_CODE_REQUIRED",
          statusCode: 400
        });
      }
      const supabaseUser = await validateSupabaseAccessToken(supabaseAuth, bearerToken(req));
      const markSessionToken = signSessionToken(supabaseUser, {
        secret: config.sessionSecret,
        ttlSeconds: config.sessionTtlSeconds
      });
      const session = await store.completeDeviceSession({
        deviceCodeHash: hashDeviceCode(deviceCode),
        userId: supabaseUser.id,
        email: supabaseUser.email,
        markSessionToken
      });
      res.json({
        status: session.status,
        user: supabaseUser
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/auth/device/poll", async function pollDevice(req, res, next) {
    try {
      const deviceCode = req.query.deviceCode || req.query.device_code;
      if (!deviceCode) {
        throw new HttpError("deviceCode is required", {
          code: "DEVICE_CODE_REQUIRED",
          statusCode: 400
        });
      }
      const session = await store.pollDeviceSession(hashDeviceCode(deviceCode));
      res.json({
        status: session.status,
        userCode: session.userCode || session.user_code,
        markSessionToken: session.status === "authorized" ? (session.markSessionToken || session.mark_session_token) : "",
        expiresAt: session.expiresAt || session.expires_at
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/account", requireMarkSession(config), async function getAccount(req, res, next) {
    try {
      const account = await store.getAccount(req.markUser);
      res.json({
        authenticated: true,
        ...account,
        creditPacks: config.creditPacks.map(publicCreditPack)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/billing/checkout-sessions", requireMarkSession(config), async function checkout(req, res, next) {
    try {
      const session = await createCheckoutSession(deps, req.markUser, req.body && req.body.packId, {
        successUrl: req.body && req.body.successUrl,
        cancelUrl: req.body && req.body.cancelUrl
      });
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  app.post("/analysis/jobs", requireMarkSession(config), async function createAnalysisJob(req, res, next) {
    try {
      const body = req.body || {};
      const job = await store.createAnalysisJob({
        user: req.markUser,
        prompt: body.prompt,
        outputMode: body.outputMode || "markers",
        estimatedMinutes: body.estimatedMinutes,
        request: body
      });
      res.status(201).json({
        id: job.id,
        status: job.status,
        estimatedMinutes: job.estimatedMinutes || job.estimated_minutes || body.estimatedMinutes || 0
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/analysis/jobs/:id/segments", requireMarkSession(config), upload.single("file"), async function uploadSegment(req, res, next) {
    let uploadPath = req.file && req.file.path;
    try {
      const job = await store.getAnalysisJob(req.params.id, req.markUser.id);
      const segment = req.body && req.body.segment ? JSON.parse(req.body.segment) : {};
      if (!req.file || !req.file.path) {
        throw new HttpError("Analysis segment upload is required", {
          code: "SEGMENT_UPLOAD_REQUIRED",
          statusCode: 400
        });
      }
      const verifiedDurationSeconds = await probeDuration(req.file.path);
      const verifiedMinutes = billableMinutesForSeconds(verifiedDurationSeconds);
      const reservedMinutes = job.estimatedMinutes || job.estimated_minutes || 0;
      const alreadyActual = job.actualMinutes || job.actual_minutes || 0;
      const projectedMinutes = alreadyActual + verifiedMinutes;
      if (projectedMinutes > reservedMinutes) {
        await store.reserveAdditionalCredits(req.params.id, req.markUser.id, projectedMinutes - reservedMinutes);
      }
      const analyzed = await analyzeUploadedSegment(deps, job, req.file, req.body || {}, verifiedDurationSeconds);
      res.json({
        outputMode: analyzed.outputMode,
        durationSeconds: analyzed.durationSeconds,
        billableMinutes: analyzed.billableMinutes,
        markers: analyzed.result.markers || [],
        subclips: analyzed.result.subclips || [],
        asset: analyzed.result.asset,
        task: analyzed.result.task
      });
    } catch (error) {
      next(error);
    } finally {
      if (uploadPath) {
        fs.rm(uploadPath, {
          force: true
        }, function noop() {});
      }
    }
  });

  app.post("/analysis/jobs/:id/complete", requireMarkSession(config), async function completeAnalysisJob(req, res, next) {
    try {
      const job = await store.completeAnalysisJob(req.params.id, req.markUser.id);
      res.json({
        id: job.id,
        status: job.status,
        actualMinutes: job.actualMinutes || job.actual_minutes || 0
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/analysis/jobs/:id/fail", requireMarkSession(config), async function failAnalysisJob(req, res, next) {
    try {
      const job = await store.failAnalysisJob(req.params.id, req.markUser.id, {
        code: req.body && req.body.code,
        message: req.body && req.body.message
      });
      res.json({
        id: job.id,
        status: job.status
      });
    } catch (error) {
      next(error);
    }
  });

  app.use(function errorHandler(error, req, res, next) {
    sendError(res, error);
  });

  return {
    app,
    deps
  };
}

module.exports = {
  createApp
};
