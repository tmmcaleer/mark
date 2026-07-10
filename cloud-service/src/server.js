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
      main { width: min(440px, calc(100vw - 32px)); display: grid; gap: 16px; }
      h1 { margin: 0; font-size: 24px; line-height: 1.25; }
      h2 { margin: 0; font-size: 16px; line-height: 1.3; }
      p { margin: 0; color: #a0a5ae; line-height: 1.45; }
      a { color: #9bbce2; }
      form, .panel { display: grid; gap: 12px; padding: 16px; border: 1px solid #303236; border-radius: 6px; background: #1a1b1e; }
      label { display: grid; gap: 6px; color: #c8ccd3; font-size: 13px; }
      input { min-height: 38px; border: 1px solid #303236; border-radius: 6px; padding: 0 10px; color: #e6e8eb; background: #111214; }
      button { min-height: 38px; border: 1px solid #7fa8d8; border-radius: 6px; padding: 0 14px; color: #111214; background: #9bbce2; font-weight: 650; }
      button.secondary { color: #d6dae0; background: transparent; border-color: #3b3e44; }
      button.link { min-height: 0; padding: 0; color: #9bbce2; background: transparent; border: 0; font: inherit; text-align: left; }
      small { color: #7d838c; line-height: 1.4; }
      .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .tabs button[aria-pressed="true"] { color: #111214; background: #9bbce2; border-color: #9bbce2; }
      .hidden { display: none !important; }
      .actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .stack { display: grid; gap: 12px; }
      .message[data-tone="error"] { color: #ff9a94; }
      .message[data-tone="success"] { color: #9ed7b6; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function authPage(config) {
  const body = `<main>
  <h1>Sign in to Mark</h1>
  <p>Use your Mark account to buy credits and run hosted analysis from Avid or Premiere.</p>
  <div class="tabs" role="group" aria-label="Auth mode">
    <button id="tab-sign-in" class="secondary" type="button" aria-pressed="true">Sign in</button>
    <button id="tab-sign-up" class="secondary" type="button" aria-pressed="false">Create account</button>
  </div>
  <form id="sign-in-form" class="stack">
    <h2>Welcome back</h2>
    <label>Email
      <input id="sign-in-email" type="email" autocomplete="email" placeholder="you@example.com" required>
    </label>
    <label>Password
      <input id="sign-in-password" type="password" autocomplete="current-password" required>
    </label>
    <button type="submit">Sign in</button>
    <button id="forgot-password-button" class="link" type="button">Forgot password?</button>
    <small id="sign-in-message" class="message"></small>
  </form>
  <form id="sign-up-form" class="stack hidden">
    <h2>Create your account</h2>
    <label>Email
      <input id="sign-up-email" type="email" autocomplete="email" placeholder="you@example.com" required>
    </label>
    <label>Password
      <input id="sign-up-password" type="password" autocomplete="new-password" minlength="8" required>
    </label>
    <button type="submit">Create account</button>
    <small id="sign-up-message" class="message"></small>
  </form>
  <form id="forgot-password-form" class="stack hidden">
    <h2>Reset password</h2>
    <p>Enter your email and Mark will send you a reset link.</p>
    <label>Email
      <input id="reset-email" type="email" autocomplete="email" placeholder="you@example.com" required>
    </label>
    <div class="actions">
      <button id="back-to-sign-in-button" class="secondary" type="button">Back</button>
      <button type="submit">Send reset link</button>
    </div>
    <small id="reset-message" class="message"></small>
  </form>
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0"></script>
<script>
const deviceCode = new URLSearchParams(location.search).get("device_code") || "";
const pendingDeviceCodeKey = "mark.pendingDeviceCode";
const pendingRecoveryKey = "mark.pendingPasswordRecovery";
const callbackUrl = ${JSON.stringify(config.appUrl)} + "/auth/callback";
const client = window.supabase.createClient(${JSON.stringify(config.supabaseUrl)}, ${JSON.stringify(config.supabasePublishableKey)}, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true
  }
});
if (deviceCode) {
  window.localStorage.setItem(pendingDeviceCodeKey, deviceCode);
}
function setMessage(id, text, tone) {
  const element = document.getElementById(id);
  element.textContent = text || "";
  element.dataset.tone = tone || "";
}
function setMode(mode) {
  document.getElementById("sign-in-form").classList.toggle("hidden", mode !== "sign-in");
  document.getElementById("sign-up-form").classList.toggle("hidden", mode !== "sign-up");
  document.getElementById("forgot-password-form").classList.toggle("hidden", mode !== "forgot");
  document.getElementById("tab-sign-in").setAttribute("aria-pressed", mode === "sign-in" ? "true" : "false");
  document.getElementById("tab-sign-up").setAttribute("aria-pressed", mode === "sign-up" ? "true" : "false");
}
async function completeDevice(session, messageId) {
  const savedDeviceCode = window.localStorage.getItem(pendingDeviceCodeKey) || deviceCode;
  if (!session || !session.access_token) {
    throw new Error("Supabase did not return a browser session.");
  }
  if (!savedDeviceCode) {
    setMessage(messageId, "You are signed in. Return to Mark and choose Sign in again to connect this computer.", "success");
    return;
  }
  const response = await fetch("/auth/device/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + session.access_token
    },
    body: JSON.stringify({
      deviceCode: savedDeviceCode
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error && payload.error.message || "Could not connect Mark.");
  }
  window.localStorage.removeItem(pendingDeviceCodeKey);
  setMessage(messageId, "Mark is signed in. You can return to the panel.", "success");
}
document.getElementById("tab-sign-in").addEventListener("click", function() {
  setMode("sign-in");
});
document.getElementById("tab-sign-up").addEventListener("click", function() {
  setMode("sign-up");
});
document.getElementById("forgot-password-button").addEventListener("click", function() {
  const email = document.getElementById("sign-in-email").value.trim();
  if (email) {
    document.getElementById("reset-email").value = email;
  }
  setMode("forgot");
});
document.getElementById("back-to-sign-in-button").addEventListener("click", function() {
  setMode("sign-in");
});
document.getElementById("sign-in-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  setMessage("sign-in-message", "Signing in...");
  try {
    const result = await client.auth.signInWithPassword({
      email: document.getElementById("sign-in-email").value.trim(),
      password: document.getElementById("sign-in-password").value
    });
    if (result.error) {
      throw result.error;
    }
    await completeDevice(result.data && result.data.session, "sign-in-message");
  } catch (error) {
    setMessage("sign-in-message", error.message || "Could not sign in.", "error");
  }
});
document.getElementById("sign-up-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  setMessage("sign-up-message", "Creating account...");
  try {
    const result = await client.auth.signUp({
      email: document.getElementById("sign-up-email").value.trim(),
      password: document.getElementById("sign-up-password").value,
      options: {
        emailRedirectTo: callbackUrl
      }
    });
    if (result.error) {
      throw result.error;
    }
    if (result.data && result.data.session) {
      await completeDevice(result.data.session, "sign-up-message");
      return;
    }
    setMessage("sign-up-message", "Check your email to confirm your Mark account.", "success");
  } catch (error) {
    setMessage("sign-up-message", error.message || "Could not create account.", "error");
  }
});
document.getElementById("forgot-password-form").addEventListener("submit", async function(event) {
  event.preventDefault();
  setMessage("reset-message", "Sending reset link...");
  try {
    window.localStorage.setItem(pendingRecoveryKey, "1");
    const result = await client.auth.resetPasswordForEmail(document.getElementById("reset-email").value.trim(), {
      redirectTo: callbackUrl
    });
    if (result.error) {
      throw result.error;
    }
    setMessage("reset-message", "Check your email for a password reset link.", "success");
  } catch (error) {
    setMessage("reset-message", error.message || "Could not send reset link.", "error");
  }
});
</script>`;
  return htmlPage("Sign in to Mark", body);
}

function callbackPage(config) {
  const body = `<main>
  <h1 id="heading">Completing Mark sign-in</h1>
  <div id="status-panel" class="panel"><p id="message">Checking your browser session...</p></div>
  <form id="password-form" class="stack hidden">
    <h2>Choose a new password</h2>
    <label>New password
      <input id="new-password" type="password" autocomplete="new-password" minlength="8" required>
    </label>
    <label>Confirm password
      <input id="confirm-password" type="password" autocomplete="new-password" minlength="8" required>
    </label>
    <button type="submit">Update password</button>
    <small id="password-message" class="message"></small>
  </form>
</main>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.0"></script>
<script>
const query = new URLSearchParams(location.search);
const fragment = new URLSearchParams(location.hash.slice(1));
const pendingDeviceCodeKey = "mark.pendingDeviceCode";
const pendingRecoveryKey = "mark.pendingPasswordRecovery";
const message = document.getElementById("message");
const client = window.supabase.createClient(${JSON.stringify(config.supabaseUrl)}, ${JSON.stringify(config.supabasePublishableKey)}, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true
  }
});
function setMessage(element, text, tone) {
  element.textContent = text || "";
  element.dataset.tone = tone || "";
}
async function readSession() {
  const code = query.get("code");
  if (code) {
    const exchanged = await client.auth.exchangeCodeForSession(code);
    if (exchanged.error) {
      throw exchanged.error;
    }
  }
  const result = await client.auth.getSession();
  if (result.error) {
    throw result.error;
  }
  return result.data && result.data.session;
}
async function completeDevice(session) {
  const deviceCode = query.get("device_code") || window.localStorage.getItem(pendingDeviceCodeKey) || "";
  if (!session || !session.access_token) {
    throw new Error("No Supabase session was found. Request a new Mark sign-in.");
  }
  if (!deviceCode) {
    setMessage(message, "Your Mark account is ready. Return to Mark and choose Sign in again to connect this computer.", "success");
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
  if (!response.ok) {
    throw new Error(payload.error && payload.error.message || "Could not complete sign-in.");
  }
  window.localStorage.removeItem(pendingDeviceCodeKey);
  setMessage(message, "Mark is signed in. You can return to the panel.", "success");
}
function showPasswordReset(session) {
  document.getElementById("heading").textContent = "Reset your Mark password";
  document.getElementById("status-panel").classList.add("hidden");
  document.getElementById("password-form").classList.remove("hidden");
  document.getElementById("password-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const password = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const passwordMessage = document.getElementById("password-message");
    if (password !== confirmPassword) {
      setMessage(passwordMessage, "Passwords do not match.", "error");
      return;
    }
    setMessage(passwordMessage, "Updating password...");
    try {
      const updated = await client.auth.updateUser({
        password
      });
      if (updated.error) {
        throw updated.error;
      }
      window.localStorage.removeItem(pendingRecoveryKey);
      document.getElementById("password-form").classList.add("hidden");
      document.getElementById("status-panel").classList.remove("hidden");
      document.getElementById("heading").textContent = "Password updated";
      await completeDevice(await readSession() || session);
    } catch (error) {
      setMessage(passwordMessage, error.message || "Could not update password.", "error");
    }
  });
}
(async function complete() {
  try {
    if (fragment.get("error") || query.get("error")) {
      throw new Error(fragment.get("error_description") || query.get("error_description") || "The auth link could not be used.");
    }
    const session = await readSession();
    const isRecovery = fragment.get("type") === "recovery" || query.get("type") === "recovery" || window.localStorage.getItem(pendingRecoveryKey) === "1";
    if (isRecovery) {
      showPasswordReset(session);
      return;
    }
    await completeDevice(session);
  } catch (error) {
    setMessage(message, error.message || "Could not complete sign-in.", "error");
  }
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
    res.type("html").send(authPage(config));
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
