const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ffmpegPath = require("ffmpeg-static");

const {
  cleanupJobThumbnails,
  extractThumbnail
} = require("../src/thumbnails");

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

test("extracts a thumbnail JPEG from a generated video", async function (t) {
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    t.skip("ffmpeg-static binary is unavailable");
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mark-thumbnail-test-"));
  const fixturePath = path.join(root, "fixture.mp4");
  const thumbnailPath = path.join(root, "thumb.jpg");

  try {
    await execFile(ffmpegPath, [
      "-hide_banner",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=360x360:rate=24",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      fixturePath
    ]);

    const size = await extractThumbnail(fixturePath, thumbnailPath, 0.5, {
      width: 160
    });

    assert.equal(fs.existsSync(thumbnailPath), true);
    assert.equal(size, fs.statSync(thumbnailPath).size);
    assert.equal(fs.readFileSync(thumbnailPath).subarray(0, 2).toString("hex"), "ffd8");
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});

test("cleans a job thumbnail directory", function () {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mark-thumbnail-cleanup-"));
  const thumbnailDir = path.join(root, "job");
  fs.mkdirSync(thumbnailDir);
  fs.writeFileSync(path.join(thumbnailDir, "thumb-001.jpg"), "jpeg");

  const job = {
    thumbnailDir,
    thumbnails: [{
      fileName: "thumb-001.jpg",
      filePath: path.join(thumbnailDir, "thumb-001.jpg")
    }]
  };

  try {
    assert.equal(cleanupJobThumbnails(job), true);
    assert.equal(fs.existsSync(thumbnailDir), false);
    assert.deepEqual(job.thumbnails, []);
    assert.equal(job.thumbnailDir, "");
  } finally {
    fs.rmSync(root, {
      recursive: true,
      force: true
    });
  }
});
