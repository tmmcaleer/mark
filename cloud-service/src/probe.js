const childProcess = require("child_process");

const ffprobeStatic = require("ffprobe-static");

const { HttpError } = require("./http-error");

function probeDurationSeconds(filePath, options = {}) {
  const ffprobePath = options.ffprobePath || (ffprobeStatic && ffprobeStatic.path);
  if (!ffprobePath) {
    return Promise.reject(new HttpError("ffprobe is required for cloud billing verification", {
      code: "FFPROBE_MISSING",
      statusCode: 500
    }));
  }
  const execFile = options.execFile || childProcess.execFile;

  return new Promise(function run(resolve, reject) {
    execFile(ffprobePath, [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath
    ], {
      maxBuffer: 20 * 1024 * 1024
    }, function done(error, stdout, stderr) {
      if (error) {
        reject(new HttpError("Could not verify uploaded media duration", {
          code: "MEDIA_DURATION_UNVERIFIED",
          statusCode: 400,
          details: {
            stderr
          }
        }));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout || "{}");
      } catch (parseError) {
        reject(new HttpError("Could not parse uploaded media duration", {
          code: "MEDIA_DURATION_PARSE_FAILED",
          statusCode: 400
        }));
        return;
      }

      const video = (parsed.streams || []).find(function findVideo(stream) {
        return stream && stream.codec_type === "video";
      });
      const duration = Number(parsed.format && parsed.format.duration || video && video.duration);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new HttpError("Uploaded media duration is missing", {
          code: "MEDIA_DURATION_MISSING",
          statusCode: 400
        }));
        return;
      }
      resolve(duration);
    });
  });
}

function billableMinutesForSeconds(seconds) {
  return Math.max(1, Math.ceil((Number(seconds) || 0) / 60));
}

module.exports = {
  billableMinutesForSeconds,
  probeDurationSeconds
};
