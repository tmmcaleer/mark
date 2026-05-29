const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const config = require("../src/config");
const { createJob } = require("../src/job-runner");
const { app, jobs } = require("../src/server");

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
    assert.equal(Object.prototype.hasOwnProperty.call(body, "twelveLabsApiKey"), false);
    assert.equal(typeof body.hasTwelveLabsApiKey, "boolean");
  } finally {
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

  const server = await listen(app);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/jobs/${job.id}`, {
      method: "DELETE"
    });

    assert.equal(response.status, 204);
    assert.equal(jobs.has(job.id), false);
    assert.equal(fs.existsSync(proxyPath), false);
  } finally {
    jobs.delete(job.id);
    fs.rmSync(proxyPath, {
      force: true
    });
    await close(server);
  }
});
