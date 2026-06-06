const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ffmpegPath = require("ffmpeg-static");

const {
  isDirectUploadFriendly,
  plannedChunks,
  prepareMediaForUpload
} = require("../src/media-prep");

function execFile(command, args) {
  return new Promise(function exec(resolve, reject) {
    childProcess.execFile(command, args, {
      maxBuffer: 20 * 1024 * 1024
    }, function done(error, stdout, stderr) {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

test("plans overlapping media chunks", function () {
  assert.deepEqual(plannedChunks(25, {
    chunkSeconds: 10,
    chunkOverlapSeconds: 2
  }), [
    {
      startSeconds: 0,
      durationSeconds: 10
    },
    {
      startSeconds: 8,
      durationSeconds: 10
    },
    {
      startSeconds: 16,
      durationSeconds: 9
    }
  ]);
});

test("recognizes direct-upload-friendly H.264 MP4 probes", function () {
  assert.equal(isDirectUploadFriendly("/tmp/proxy.mp4", {
    size: 1024,
    durationSeconds: 30,
    video: {
      codec: "h264",
      width: 1280,
      height: 720
    },
    audio: {
      codec: "aac"
    }
  }, {
    targetMaxBytes: 10 * 1024
  }), true);
});

test("prepares a tiny generated MP4 as direct media when already acceptable", async function (t) {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    t.skip("ffmpeg-static binary is unavailable");
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mark-media-prep-test-"));
  const fixturePath = path.join(root, "fixture.mp4");

  try {
    await execFile(ffmpegPath, [
      "-hide_banner",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=360x360:rate=24",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=stereo",
      "-t",
      "4",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      fixturePath
    ]);

    const prepared = await prepareMediaForUpload(fixturePath, {
      prepDir: path.join(root, "prep"),
      targetMaxBytes: 50 * 1024 * 1024,
      maxDirectUploadBytes: 50 * 1024 * 1024,
      jobId: "test-job"
    });

    assert.equal(prepared.decision, "direct");
    assert.equal(prepared.segments.length, 1);
    assert.equal(prepared.segments[0].filePath, fixturePath);
    assert.equal(prepared.segments[0].cleanupPath, "");
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
