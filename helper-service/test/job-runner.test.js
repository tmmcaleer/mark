const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  cleanupExportedFile,
  createJob,
  publicJob,
  runJob,
  validateJobRequest
} = require("../src/job-runner");
const { TwelveLabsClient } = require("../src/twelvelabs-client");

function fsWithStat(statImpl) {
  return {
    statSync: statImpl
  };
}

test("validates missing file path", function () {
  assert.throws(function validate() {
    validateJobRequest({ prompt: "make markers" });
  }, /filePath is required/);
});

test("validates missing prompt", function () {
  assert.throws(function validate() {
    validateJobRequest({ filePath: "/tmp/proxy.mp4" }, {
      fs: fsWithStat(function stat() {
        return {
          isFile: () => true,
          size: 10
        };
      })
    });
  }, /prompt is required/);
});

test("validates missing file", function () {
  assert.throws(function validate() {
    validateJobRequest({
      filePath: "/tmp/missing.mp4",
      prompt: "make markers"
    }, {
      fs: fsWithStat(function stat() {
        throw new Error("nope");
      })
    });
  }, /does not exist/);
});

test("validates TwelveLabs direct upload size limit", function () {
  assert.throws(function validate() {
    validateJobRequest({
      filePath: "/tmp/large.mp4",
      prompt: "make markers"
    }, {
      maxDirectUploadBytes: 100,
      fs: fsWithStat(function stat() {
        return {
          isFile: () => true,
          size: 101
        };
      })
    });
  }, /direct upload limit/);
});

test("validates optional marker output style", function () {
  const data = validateJobRequest({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    markerOutputStyle: {
      nameStyle: "  Shorthand only.   No reasoning.  ",
      commentStyle: "  No comment.  "
    }
  }, {
    fs: fsWithStat(function stat() {
      return {
        isFile: () => true,
        size: 10
      };
    })
  });

  assert.deepEqual(data.markerOutputStyle, {
    nameStyle: "Shorthand only. No reasoning.",
    commentStyle: "No comment."
  });
});

test("validates legacy marker text style as generated name and comment guidance", function () {
  const data = validateJobRequest({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    markerStyle: "  House style.   No reasoning.  "
  }, {
    fs: fsWithStat(function stat() {
      return {
        isFile: () => true,
        size: 10
      };
    })
  });

  assert.equal(data.markerOutputStyle.nameStyle, "House style. No reasoning.");
  assert.equal(data.markerOutputStyle.commentStyle, "House style. No reasoning.");
});

test("TwelveLabs client requires an API key", function () {
  assert.throws(function createClient() {
    new TwelveLabsClient({ apiKey: "" });
  }, /TWELVELABS_API_KEY/);
});

test("runJob marks job ready on client success", async function () {
  const job = createJob({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    markerOutputStyle: {
      nameStyle: "House style",
      commentStyle: "No comments"
    },
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    client: {
      analyzeFile: async function analyzeFile(filePath, prompt, customId, markerOutputStyle) {
        assert.deepEqual(markerOutputStyle, {
          nameStyle: "House style",
          commentStyle: "No comments"
        });
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          markers: [
            {
              id: "marker-id",
              name: "Marker",
              startTime: 1,
              endTime: 2
            }
          ]
        };
      }
    }
  });

  assert.equal(job.status, "ready");
  assert.equal(job.progress, 100);
  assert.equal(publicJob(job).markers.length, 1);
});

test("runJob cleans exported proxies inside the configured export directory", async function () {
  const exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mark-cleanup-"));
  const proxyPath = path.join(exportDirectory, "proxy.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const job = createJob({
      filePath: proxyPath,
      prompt: "make markers",
      clip: {},
      project: {},
      size: 5
    });

    await runJob(job, {
      exportDestinationPath: exportDirectory,
      cleanupExportedProxies: true,
      client: {
        analyzeFile: async function analyzeFile() {
          return {
            asset: { id: "asset-id" },
            task: { id: "task-id" },
            markers: []
          };
        }
      }
    });

    assert.equal(fs.existsSync(proxyPath), false);
    assert.equal(typeof job.proxyCleanedAt, "string");
  } finally {
    fs.rmSync(exportDirectory, {
      recursive: true,
      force: true
    });
  }
});

test("runJob keeps exported proxies when requested for review", async function () {
  const exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mark-keep-proxy-"));
  const proxyPath = path.join(exportDirectory, "proxy.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const job = createJob({
      filePath: proxyPath,
      keepProxy: true,
      prompt: "make markers",
      clip: {},
      project: {},
      size: 5
    });

    await runJob(job, {
      exportDestinationPath: exportDirectory,
      cleanupExportedProxies: true,
      client: {
        analyzeFile: async function analyzeFile() {
          return {
            asset: { id: "asset-id" },
            task: { id: "task-id" },
            markers: []
          };
        }
      }
    });

    assert.equal(job.status, "ready");
    assert.equal(fs.existsSync(proxyPath), true);
    assert.equal(publicJob(job).proxyUrl, `/jobs/${encodeURIComponent(job.id)}/proxy`);
  } finally {
    fs.rmSync(exportDirectory, {
      recursive: true,
      force: true
    });
  }
});

test("cleanupExportedFile ignores paths outside the configured export directory", function () {
  const exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mark-cleanup-root-"));
  const outsideDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mark-cleanup-outside-"));
  const proxyPath = path.join(outsideDirectory, "proxy.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const cleaned = cleanupExportedFile(proxyPath, {
      exportDestinationPath: exportDirectory,
      cleanupExportedProxies: true
    });

    assert.equal(cleaned, false);
    assert.equal(fs.existsSync(proxyPath), true);
  } finally {
    fs.rmSync(exportDirectory, {
      recursive: true,
      force: true
    });
    fs.rmSync(outsideDirectory, {
      recursive: true,
      force: true
    });
  }
});

test("runJob marks job failed on client failure", async function () {
  const job = createJob({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    client: {
      analyzeFile: async function analyzeFile() {
        throw new Error("task failed");
      }
    }
  });

  assert.equal(job.status, "failed");
  assert.match(job.error.message, /task failed/);
});

test("runJob cleans exported proxies after client failure", async function () {
  const exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "mark-cleanup-failure-"));
  const proxyPath = path.join(exportDirectory, "proxy.mp4");
  fs.writeFileSync(proxyPath, "proxy");

  try {
    const job = createJob({
      filePath: proxyPath,
      prompt: "make markers",
      clip: {},
      project: {},
      size: 5
    });

    await runJob(job, {
      exportDestinationPath: exportDirectory,
      cleanupExportedProxies: true,
      client: {
        analyzeFile: async function analyzeFile() {
          throw new Error("task failed");
        }
      }
    });

    assert.equal(job.status, "failed");
    assert.equal(fs.existsSync(proxyPath), false);
    assert.equal(typeof job.proxyCleanedAt, "string");
  } finally {
    fs.rmSync(exportDirectory, {
      recursive: true,
      force: true
    });
  }
});
