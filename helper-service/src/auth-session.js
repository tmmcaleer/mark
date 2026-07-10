const fs = require("fs");
const os = require("os");
const path = require("path");

function defaultSessionPath() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Mark", "session.json");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || os.homedir(), "Mark", "session.json");
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "mark", "session.json");
}

function readSession(filePath) {
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      token: String(payload.token || ""),
      savedAt: payload.savedAt || ""
    };
  } catch (error) {
    return {
      token: "",
      savedAt: ""
    };
  }
}

function writeSession(filePath, token) {
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true,
    mode: 0o700
  });
  fs.writeFileSync(filePath, JSON.stringify({
    token,
    savedAt: new Date().toISOString()
  }, null, 2), {
    mode: 0o600
  });
}

function clearSession(filePath) {
  try {
    fs.rmSync(filePath, {
      force: true
    });
  } catch (error) {
    // Best-effort sign-out.
  }
}

module.exports = {
  clearSession,
  defaultSessionPath,
  readSession,
  writeSession
};
