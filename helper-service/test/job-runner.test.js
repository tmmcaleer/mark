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

async function directMediaPreparer(filePath) {
  return {
    decision: "direct",
    probe: null,
    segments: [{
      filePath,
      startSeconds: 0,
      durationSeconds: 0,
      cleanupPath: "",
      sourceKind: "unknown"
    }]
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

test("validates TwelveLabs direct upload size limit when media prep is disabled", function () {
  assert.throws(function validate() {
    validateJobRequest({
      filePath: "/tmp/large.mp4",
      prompt: "make markers"
    }, {
      maxDirectUploadBytes: 100,
      mediaPrepEnabled: false,
      fs: fsWithStat(function stat() {
        return {
          isFile: () => true,
          size: 101
        };
      })
    });
  }, /direct upload limit/);
});

test("allows oversized inputs when media prep is enabled", function () {
  const data = validateJobRequest({
    filePath: "/tmp/large.mp4",
    prompt: "make markers"
  }, {
    maxDirectUploadBytes: 100,
    mediaPrepEnabled: true,
    fs: fsWithStat(function stat() {
      return {
        isFile: () => true,
        size: 101
      };
    })
  });

  assert.equal(data.size, 101);
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
    commentStyle: "No comment.",
    subclipSummaryStyle: "Short summaries of why the section is useful. No confidence or reasoning."
  });
});

test("validates subclip output mode and options", function () {
  const data = validateJobRequest({
    filePath: "/tmp/proxy.mp4",
    prompt: "make subclips",
    outputMode: "subclips",
    subclipOptions: {
      granularity: "broad",
      minDuration: 20,
      maxDuration: 75,
      targetSegmentsPerMinute: 0.5
    }
  }, {
    fs: fsWithStat(function stat() {
      return {
        isFile: () => true,
        size: 10
      };
    })
  });

  assert.equal(data.outputMode, "subclips");
  assert.deepEqual(data.subclipOptions, {
    granularity: "broad",
    minDuration: 20,
    maxDuration: 75,
    targetSegmentsPerMinute: 0.5
  });
});

test("validates optional Avid metadata prompt context", function () {
  const data = validateJobRequest({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    promptContext: {
      columns: {
        " Scene ": "  Exterior   alley  ",
        Empty: "",
        Notes: "A".repeat(400)
      }
    }
  }, {
    fs: fsWithStat(function stat() {
      return {
        isFile: () => true,
        size: 10
      };
    })
  });

  assert.deepEqual(data.promptContext, {
    columns: {
      Scene: "Exterior alley",
      Notes: "A".repeat(300)
    }
  });
});

test("defaults unknown output modes to markers", function () {
  const data = validateJobRequest({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    outputMode: "clips"
  }, {
    fs: fsWithStat(function stat() {
      return {
        isFile: () => true,
        size: 10
      };
    })
  });

  assert.equal(data.outputMode, "markers");
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
  assert.equal(data.markerOutputStyle.subclipSummaryStyle, "Short summaries of why the section is useful. No confidence or reasoning.");
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
    promptContext: {
      columns: {
        Scene: "Exterior alley"
      }
    },
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    mediaPreparer: directMediaPreparer,
    client: {
      analyzeFile: async function analyzeFile(filePath, prompt, customId, markerOutputStyle, outputMode, subclipOptions, promptContext) {
        assert.deepEqual(markerOutputStyle, {
          nameStyle: "House style",
          commentStyle: "No comments",
          subclipSummaryStyle: "Short summaries of why the section is useful. No confidence or reasoning."
        });
        assert.deepEqual(promptContext, {
          columns: {
            Scene: "Exterior alley"
          }
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

test("runJob marks subclip jobs ready on client success", async function () {
  const job = createJob({
    filePath: "/tmp/proxy.mp4",
    prompt: "make subclips",
    outputMode: "subclips",
    subclipOptions: {
      granularity: "fine",
      minDuration: 4,
      maxDuration: 20,
      targetSegmentsPerMinute: 3
    },
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    mediaPreparer: directMediaPreparer,
    client: {
      analyzeFile: async function analyzeFile(filePath, prompt, customId, markerOutputStyle, outputMode, subclipOptions) {
        assert.equal(outputMode, "subclips");
        assert.equal(subclipOptions.granularity, "fine");
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          subclips: [
            {
              id: "subclip-id",
              name: "Subclip",
              startTime: 1,
              endTime: 12,
              duration: 11
            }
          ]
        };
      }
    }
  });

  const publicBody = publicJob(job);
  assert.equal(job.status, "ready");
  assert.equal(publicBody.outputMode, "subclips");
  assert.equal(publicBody.subclips.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(publicBody, "markers"), false);
});

test("runJob attaches thumbnail URLs to marker results", async function () {
  const job = createJob({
    filePath: "/tmp/source.mp4",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    mediaPreparer: async function mediaPreparer(filePath) {
      return {
        decision: "direct",
        probe: null,
        segments: [{
          filePath,
          startSeconds: 0,
          durationSeconds: 10,
          cleanupPath: "",
          sourceKind: "repository-proxy"
        }]
      };
    },
    cleanupPreparedSegments: function cleanup() {},
    thumbnailGenerator: async function thumbnailGenerator(thumbnailJob, items) {
      assert.equal(thumbnailJob.id, job.id);
      assert.equal(items[0]._thumbnailSource.filePath, "/tmp/source.mp4");
      assert.equal(items[0]._thumbnailSource.startTime, 1.25);
      thumbnailJob.thumbnails = [{
        fileName: "thumb-001.jpg",
        filePath: "/tmp/thumb-001.jpg",
        size: 100
      }];
      return items.map(function withThumbnail(item) {
        const cleaned = {
          ...item,
          thumbnailUrl: `/jobs/${encodeURIComponent(thumbnailJob.id)}/thumbnails/thumb-001.jpg`
        };
        delete cleaned._thumbnailSource;
        return cleaned;
      });
    },
    client: {
      analyzeFile: async function analyzeFile() {
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          markers: [{
            id: "marker-id",
            name: "Marker",
            comment: "Comment",
            startTime: 1.25,
            endTime: 2
          }]
        };
      }
    }
  });

  assert.equal(job.status, "ready");
  assert.equal(job.markers[0].thumbnailUrl, `/jobs/${encodeURIComponent(job.id)}/thumbnails/thumb-001.jpg`);
  assert.equal(Object.prototype.hasOwnProperty.call(job.markers[0], "_thumbnailSource"), false);
});

test("runJob attaches thumbnail URLs to subclip results", async function () {
  const job = createJob({
    filePath: "/tmp/source.mp4",
    prompt: "make subclips",
    outputMode: "subclips",
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    mediaPreparer: directMediaPreparer,
    thumbnailGenerator: async function thumbnailGenerator(thumbnailJob, items) {
      return items.map(function withThumbnail(item) {
        const cleaned = {
          ...item,
          thumbnailUrl: `/jobs/${encodeURIComponent(thumbnailJob.id)}/thumbnails/thumb-001.jpg`
        };
        delete cleaned._thumbnailSource;
        return cleaned;
      });
    },
    client: {
      analyzeFile: async function analyzeFile() {
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          subclips: [{
            id: "subclip-id",
            name: "Subclip",
            summary: "Useful beat",
            startTime: 3,
            endTime: 12,
            duration: 9
          }]
        };
      }
    }
  });

  assert.equal(job.status, "ready");
  assert.equal(job.subclips[0].thumbnailUrl, `/jobs/${encodeURIComponent(job.id)}/thumbnails/thumb-001.jpg`);
  assert.equal(Object.prototype.hasOwnProperty.call(job.subclips[0], "_thumbnailSource"), false);
});

test("runJob keeps analysis ready when thumbnail generation fails", async function () {
  const job = createJob({
    filePath: "/tmp/source.mp4",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 10
  });

  await runJob(job, {
    mediaPreparer: directMediaPreparer,
    thumbnailGenerator: async function thumbnailGenerator() {
      throw new Error("thumbnail failed");
    },
    client: {
      analyzeFile: async function analyzeFile() {
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          markers: [{
            id: "marker-id",
            name: "Marker",
            comment: "Comment",
            startTime: 1,
            endTime: 2
          }]
        };
      }
    }
  });

  assert.equal(job.status, "ready");
  assert.equal(job.markers.length, 1);
  assert.equal(job.markers[0].thumbnailUrl, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(job.markers[0], "_thumbnailSource"), false);
  assert.equal(job.debugEvents.some(function hasThumbnailFailure(event) {
    return event.label === "Thumbnail generation failed";
  }), true);
});

test("runJob offsets prepared segment marker times", async function () {
  const job = createJob({
    filePath: "/tmp/source.mov",
    prompt: "make markers",
    mediaSourceKind: "repository-proxy",
    clip: {},
    project: {},
    size: 500
  });

  await runJob(job, {
    mediaPreparer: async function mediaPreparer(filePath) {
      return {
        decision: "chunked",
        probe: null,
        segments: [{
          filePath,
          startSeconds: 30,
          durationSeconds: 10,
          cleanupPath: "/tmp/generated",
          sourceKind: "repository-proxy"
        }]
      };
    },
    cleanupPreparedSegments: function cleanup() {},
    client: {
      analyzeFile: async function analyzeFile() {
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          markers: [{
            id: "marker-id",
            name: "Marker",
            comment: "Comment",
            startTime: 1,
            endTime: 2
          }]
        };
      }
    }
  });

  assert.equal(job.markers[0].startTime, 31);
  assert.equal(job.markers[0].endTime, 32);
});

test("runJob subtracts Avid source head for Source Path media", async function () {
  const job = createJob({
    filePath: "/tmp/source.mov",
    prompt: "make markers",
    mediaSourceKind: "avid-source-path",
    clip: {
      head: 663
    },
    project: {
      fps: 24000 / 1001
    },
    size: 500
  });

  await runJob(job, {
    mediaPreparer: async function mediaPreparer(filePath) {
      return {
        decision: "direct",
        probe: null,
        segments: [{
          filePath,
          startSeconds: 0,
          durationSeconds: 60,
          cleanupPath: "",
          sourceKind: "avid-source-path"
        }]
      };
    },
    cleanupPreparedSegments: function cleanup() {},
    client: {
      analyzeFile: async function analyzeFile() {
        return {
          asset: { id: "asset-id" },
          task: { id: "task-id" },
          markers: [{
            id: "marker-id",
            name: "Marker",
            comment: "Comment",
            startTime: 30,
            endTime: 31
          }]
        };
      }
    }
  });

  assert.equal(job.markers[0].startTime, 2.347);
  assert.equal(job.markers[0].endTime, 3.347);
});

test("runJob offsets chunked subclips and dedupes overlap results", async function () {
  const job = createJob({
    filePath: "/tmp/source.mov",
    prompt: "make subclips",
    outputMode: "subclips",
    clip: {},
    project: {},
    size: 500
  });
  let calls = 0;

  await runJob(job, {
    mediaPreparer: async function mediaPreparer() {
      return {
        decision: "chunked",
        probe: null,
        segments: [
          {
            filePath: "/tmp/chunk-1.mp4",
            startSeconds: 0,
            durationSeconds: 10,
            cleanupPath: "/tmp/generated",
            sourceKind: "repository-proxy"
          },
          {
            filePath: "/tmp/chunk-2.mp4",
            startSeconds: 9,
            durationSeconds: 10,
            cleanupPath: "/tmp/generated",
            sourceKind: "repository-proxy"
          }
        ]
      };
    },
    cleanupPreparedSegments: function cleanup() {},
    client: {
      analyzeFile: async function analyzeFile() {
        calls += 1;
        return {
          asset: { id: `asset-${calls}` },
          task: { id: `task-${calls}` },
          subclips: [{
            id: `subclip-${calls}`,
            name: "Same beat",
            summary: "Same useful moment",
            startTime: calls === 1 ? 9 : 0,
            endTime: calls === 1 ? 11 : 2,
            duration: 2
          }]
        };
      }
    }
  });

  assert.equal(job.subclips.length, 1);
  assert.equal(job.subclips[0].startTime, 9);
  assert.equal(job.subclips[0].endTime, 11);
  assert.equal(calls, 2);
});

test("runJob cleans prepared media after success and failure", async function () {
  const cleanupCalls = [];
  const prepared = {
    decision: "transcoded",
    probe: null,
    segments: [{
      filePath: "/tmp/prepared.mp4",
      startSeconds: 0,
      durationSeconds: 10,
      cleanupPath: "/tmp/generated",
      sourceKind: "repository-proxy"
    }]
  };
  const successJob = createJob({
    filePath: "/tmp/source.mov",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 500
  });
  await runJob(successJob, {
    mediaPreparer: async function mediaPreparer() {
      return prepared;
    },
    cleanupPreparedSegments: function cleanup(segments) {
      cleanupCalls.push(segments[0].cleanupPath);
    },
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

  const failureJob = createJob({
    filePath: "/tmp/source.mov",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 500
  });
  await runJob(failureJob, {
    mediaPreparer: async function mediaPreparer() {
      return prepared;
    },
    cleanupPreparedSegments: function cleanup(segments) {
      cleanupCalls.push(segments[0].cleanupPath);
    },
    client: {
      analyzeFile: async function analyzeFile() {
        throw new Error("task failed");
      }
    }
  });

  assert.deepEqual(cleanupCalls, ["/tmp/generated", "/tmp/generated"]);
  assert.equal(successJob.status, "ready");
  assert.equal(failureJob.status, "failed");
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
      mediaPreparer: directMediaPreparer,
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
      mediaPreparer: directMediaPreparer,
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
    mediaPreparer: directMediaPreparer,
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
      mediaPreparer: directMediaPreparer,
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
