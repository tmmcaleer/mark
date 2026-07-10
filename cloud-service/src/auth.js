const crypto = require("crypto");

const { HttpError } = require("./http-error");

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function parseBase64urlJson(input) {
  return JSON.parse(Buffer.from(input, "base64url").toString("utf8"));
}

function hmac(value, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("base64url");
}

function timingSafeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signSessionToken(user, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = options.ttlSeconds || 30 * 24 * 60 * 60;
  const header = base64url(JSON.stringify({
    alg: "HS256",
    typ: "JWT"
  }));
  const payload = base64url(JSON.stringify({
    sub: user.id,
    email: user.email || "",
    iat: now,
    exp: now + ttlSeconds,
    iss: "mark-cloud-service"
  }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${hmac(unsigned, options.secret)}`;
}

function verifySessionToken(token, options = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new HttpError("Invalid Mark session token", {
      code: "INVALID_SESSION",
      statusCode: 401
    });
  }

  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = hmac(unsigned, options.secret);
  if (!timingSafeEqual(expected, parts[2])) {
    throw new HttpError("Invalid Mark session token", {
      code: "INVALID_SESSION",
      statusCode: 401
    });
  }

  const payload = parseBase64urlJson(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub || !payload.exp || payload.exp <= now) {
    throw new HttpError("Mark session has expired", {
      code: "SESSION_EXPIRED",
      statusCode: 401
    });
  }

  return {
    id: payload.sub,
    email: payload.email || "",
    expiresAt: new Date(payload.exp * 1000).toISOString()
  };
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

function requireMarkSession(config) {
  return function markSessionMiddleware(req, res, next) {
    try {
      const token = bearerToken(req);
      if (!token) {
        throw new HttpError("Sign in to Mark first", {
          code: "AUTH_REQUIRED",
          statusCode: 401
        });
      }
      req.markUser = verifySessionToken(token, {
        secret: config.sessionSecret
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function randomUserCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function hashDeviceCode(deviceCode) {
  return crypto
    .createHash("sha256")
    .update(String(deviceCode || ""))
    .digest("hex");
}

async function validateSupabaseAccessToken(supabase, accessToken) {
  if (!accessToken) {
    throw new HttpError("Supabase access token is required", {
      code: "SUPABASE_TOKEN_REQUIRED",
      statusCode: 401
    });
  }
  if (!supabase || !supabase.auth || typeof supabase.auth.getUser !== "function") {
    throw new HttpError("Supabase auth is not configured", {
      code: "SUPABASE_NOT_CONFIGURED",
      statusCode: 503
    });
  }

  const result = await supabase.auth.getUser(accessToken);
  if (result.error || !result.data || !result.data.user) {
    throw new HttpError("Supabase session is invalid", {
      code: "SUPABASE_SESSION_INVALID",
      statusCode: 401
    });
  }

  return {
    id: result.data.user.id,
    email: result.data.user.email || ""
  };
}

module.exports = {
  bearerToken,
  hashDeviceCode,
  randomToken,
  randomUserCode,
  requireMarkSession,
  signSessionToken,
  validateSupabaseAccessToken,
  verifySessionToken
};
