const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const config = require("../src/config");
const { createJob } = require("../src/job-runner");
const {
  app,
  jobs,
  jobQueueState,
  pendingJobs,
  setJobRunnerForTest
} = require("../src/server");

function listen(appInstance) {
  return new Promise(function start(resolve) {
    const server = appInstance.listen(0, function onListen() {
      resolve(server);
    });
  });
}

function close(server) {
  return new Promise(function stop(resolve, reject) {
    server.close(function onClose(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

test("helper exposes health and config without leaking the API key", async function () {
  const server = await listen(app);
  const port = server.address().port;

  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const config = await fetch(`http://127.0.0.1:${port}/config`);
    assert.equal(config.status, 200);
    const body = await config.json();
    assert.equal(body.exportSettingsName, "Mark 12Labs Proxy");
    assert.equal(body.cleanupExportedProxies, true);
    assert.equal(body.supportsProxyPlayback, true);
    assert.equal(body.maxConcurrentJobs, 3);
    assert.deepEqual(body.proxyExtensions, [".mp4", ".mov", ".m4v"]);
    assert.equal(body.thumbnailsEnabled, true);
    assert.equal(body.thumbnailWidth, 160);
    assert.equal(body.maxThumbnailsPerJob, 50);
    assert.equal(Object.prototype.hasOwnProperty.call(body, "twelveLabsApiKey"), false);
    assert.equal(typeof body.hasTwelveLabsApiKey, "boolean");
  } finally {
    await close(server);
  }
});

test("helper queues jobs above the configured concurrency", async function () {
  const server = await listen(app);
  const port = server.address().port;
  const previousApiKey = config.twelveLabsApiKey;
  const previousMaxConcurrentJobs = config.maxConcurrentJobs;
  const exportDirectory = fs.mkdtempSync(path.join(require("os").tmpdir(), "mark-queue-"));
  const releases = [];
  const proxyPaths = [1, 2, 3].map(function createProxy(index) {
    const proxyPath = path.join(exportDirectory, `proxy-${index}.mp4`);
    fs.writeFileSync(proxyPath, "proxy");
    return proxyPath;
  });

  config.twelveLabsApiKey = "test-key";
  config.maxConcurrentJobs = 2;
  setJobRunnerForTest(async function fakeRunner(job) {
    job.status = "running";
    job.stage = "uploading";
    job.progress = 25;
    await new Promise(function wait(resolve) {
      releases.push(resolve);
    });
    job.status = "ready";
    job.stage = "ready";
    job.progress = 100;
    job.markers = [];
    return job;
  });

  try {
    await Promise.all(proxyPaths.map(function postJob(proxyPath) {
      return fetch(`http://127.0.0.1:${port}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          filePath: proxyPath,
          prompt: "make markers"
        })
      });
    }));

    await new Promise(function wait(resolve) {
      setTimeout(resolve, 25);
    });

    assert.equal(jobQueueState().activeJobCount, 2);
    assert.equal(jobQueueState().pendingJobCount, 1);

    releases.splice(0).forEach(function release(resolve) {
      resolve();
    });
    await new Promise(function wait(resolve) {
      setTimeout(resolve, 25);
    });
    releases.splice(0).forEach(function release(resolve) {
      resolve();
    });
    await new Promise(function wait(resolve) {
      setTimeout(resolve, 25);
    });

    assert.equal(jobQueueState().activeJobCount, 0);
    assert.equal(jobQueueState().pendingJobCount, 0);
  } finally {
    config.twelveLabsApiKey = previousApiKey;
    config.maxConcurrentJobs = previousMaxConcurrentJobs;
    setJobRunnerForTest(null);
    pendingJobs.splice(0);
    jobs.clear();
    fs.rmSync(exportDirectory, {
      recursive: true,
      force: true
    });
    await close(server);
  }
});

test("helper rejects jobs when TWELVELABS_API_KEY is missing", async function () {
  const server = await listen(app);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        filePath: "/tmp/nope.mp4",
        prompt: "make markers"
      })
    });

    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error.code, "MISSING_API_KEY");
  } finally {
    await close(server);
  }
});

test("helper serves generated job thumbnails", async function () {
  const previousThumbnailsDir = config.thumbnailsDir;
  const thumbnailRoot = fs.mkdtempSync(path.join(require("os").tmpdir(), "mark-thumbnail-route-"));
  config.thumbnailsDir = thumbnailRoot;
  const thumbnailDir = path.join(thumbnailRoot, "job");
  const thumbnailPath = path.join(thumbnailDir, "thumb-001.jpg");
  fs.mkdirSync(thumbnailDir, {
    recursive: true
  });
  fs.writeFileSync(thumbnailPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

  const job = createJob({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 10
  });
  job.status = "ready";
  job.thumbnailDir = thumbnailDir;
  job.thumbnails = [{
    fileName: "thumb-001.jpg",
    filePath: thumbnailPath,
    size: 4
  }];
  jobs.set(job.id, job);

  const server = await listen(app);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/jobs/${job.id}/thumbnails/thumb-001.jpg`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  } finally {
    config.thumbnailsDir = previousThumbnailsDir;
    jobs.delete(job.id);
    fs.rmSync(thumbnailRoot, {
      recursive: true,
      force: true
    });
    await close(server);
  }
});

test("helper rejects missing and unsafe job thumbnails", async function () {
  const previousThumbnailsDir = config.thumbnailsDir;
  const thumbnailRoot = fs.mkdtempSync(path.join(require("os").tmpdir(), "mark-thumbnail-safe-"));
  const outsideRoot = fs.mkdtempSync(path.join(require("os").tmpdir(), "mark-thumbnail-outside-"));
  const outsidePath = path.join(outsideRoot, "thumb-001.jpg");
  fs.writeFileSync(outsidePath, "jpeg");
  config.thumbnailsDir = thumbnailRoot;

  const job = createJob({
    filePath: "/tmp/proxy.mp4",
    prompt: "make markers",
    clip: {},
    project: {},
    size: 10
  });
  job.status = "ready";
  job.thumbnails = [{
    fileName: "outside.jpg",
    filePath: outsidePath,
    size: 4
  }];
  jobs.set(job.id, job);

  const server = await listen(app);
  const port = server.address().port;

  try {
    const unknownJob = await fetch(`http://127.0.0.1:${port}/jobs/missing/thumbnails/thumb-001.jpg`);
    assert.equal(unknownJob.status, 404);

    const unknownFile = await fetch(`http://127.0.0.1:${port}/jobs/${job.id}/thumbnails/missing.jpg`);
    assert.equal(unknownFile.status, 404);

    const forbidden = await fetch(`http://127.0.0.1:${port}/jobs/${job.id}/thumbnails/outside.jpg`);
    assert.equal(forbidden.status, 403);
  } finally {
    config.thumbnailsDir = previousThumbnailsDir;
    jobs.delete(job.id);
    fs.rmSync(thumbnailRoot, {
      recursive: true,
      force: true
    });
    fs.rmSync(outsideRoot, {
      recursive: true,
      force: true
    });
    await close(server);
  }
});

test("helper streams retained proxy videos with byte ranges", async function () {
  fs.mkdirSync(config.exportDestinationPath, {
    recursive: true
  });
  const proxyPath = path.join(config.exportDestinationPath, `proxy-${Date.now()}.mp4`);
  fs.writeFileSync(proxyPath, Buffer.from("0123456789"));

  const job = createJob({
    filePath: proxyPath,
    keepProxy: true,
    prompt: "make markers",
    clip: {},
    project: {},
    size: 10
  });
  job.status = "ready";
  jobs.set(job.id, job);

  const server = await listen(app);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/jobs/${job.id}/proxy`, {
      headers: {
        Range: "bytes=2-5"
      }
    });

    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), "bytes 2-5/10");
    assert.equal(await response.text(), "2345");
  } finally {
    jobs.delete(job.id);
    fs.rmSync(proxyPath, {
      force: true
    });
    await close(server);
  }
});

test("helper deletes retained proxy jobs and cleans the proxy file", async function () {
  fs.mkdirSync(config.exportDestinationPath, {
    recursive: true
  });
  const proxyPath = path.join(config.exportDestinationPath, `proxy-delete-${Date.now()}.mp4`);
  fs.writeFileSync(proxyPath, "proxy");

  const job = createJob({
    filePath: proxyPath,
    keepProxy: true,
    prompt: "make markers",
    clip: {},
    project: {},
    size: 5
  });
  jobs.set(job.id, job);
  const thumbnailDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "mark-delete-thumb-"));
  const thumbnailPath = path.join(thumbnailDir, "thumb-001.jpg");
  fs.writeFileSync(thumbnailPath, "jpeg");
  job.thumbnailDir = thumbnailDir;
  job.thumbnails = [{
    fileName: "thumb-001.jpg",
    filePath: thumbnailPath,
    size: 4
  }];

  const server = await listen(app);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/jobs/${job.id}`, {
      method: "DELETE"
    });

    assert.equal(response.status, 204);
    assert.equal(jobs.has(job.id), false);
    assert.equal(fs.existsSync(proxyPath), false);
    assert.equal(fs.existsSync(thumbnailDir), false);
  } finally {
    jobs.delete(job.id);
    fs.rmSync(proxyPath, {
      force: true
    });
    fs.rmSync(thumbnailDir, {
      recursive: true,
      force: true
    });
    await close(server);
  }
});
