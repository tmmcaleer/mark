import test from "node:test";
import assert from "node:assert/strict";

import { createHelperClient } from "../src/js/shared/helper-client.mjs";

function createMockXhr(responses, calls) {
  return class MockXhr {
    constructor() {
      this.headers = {};
      this.status = 0;
      this.responseText = "";
    }

    open(method, url) {
      this.method = method;
      this.url = url;
    }

    setRequestHeader(name, value) {
      this.headers[name] = value;
    }

    send(body) {
      calls.push({
        method: this.method,
        url: this.url,
        headers: this.headers,
        body
      });
      const response = responses.shift();
      if (response.networkError) {
        this.onerror();
        return;
      }
      this.status = response.status;
      this.responseText = response.responseText;
      this.onload();
    }
  };
}

test("requests JSON from the configured helper base URL", async function () {
  const calls = [];
  const client = createHelperClient({
    baseUrl: "http://localhost:4500/",
    XMLHttpRequestClass: createMockXhr([
      {
        status: 202,
        responseText: "{\"id\":\"job-1\"}"
      }
    ], calls)
  });

  const result = await client.requestJson("POST", "/jobs", { prompt: "faces" });

  assert.deepEqual(result, { id: "job-1" });
  assert.equal(calls[0].url, "http://localhost:4500/jobs");
  assert.equal(calls[0].body, "{\"prompt\":\"faces\"}");
  assert.equal(calls[0].headers["Content-Type"], "application/json;charset=UTF-8");
});

test("uses helper error payload messages", async function () {
  const client = createHelperClient({
    getBaseUrl: function getBaseUrl() {
      return "http://localhost:4500";
    },
    XMLHttpRequestClass: createMockXhr([
      {
        status: 503,
        responseText: "{\"error\":{\"message\":\"TWELVELABS_API_KEY is missing\"}}"
      }
    ], [])
  });

  await assert.rejects(
    client.requestJson("POST", "jobs", {}),
    /TWELVELABS_API_KEY is missing/
  );
});

test("reports invalid helper JSON and network failures", async function () {
  const invalidJsonClient = createHelperClient({
    baseUrl: "http://localhost:4500",
    XMLHttpRequestClass: createMockXhr([
      {
        status: 200,
        responseText: "not json"
      }
    ], [])
  });

  await assert.rejects(
    invalidJsonClient.requestJson("GET", "/config"),
    /Invalid helper response/
  );

  const networkClient = createHelperClient({
    baseUrl: "http://localhost:4500",
    XMLHttpRequestClass: createMockXhr([
      {
        networkError: true
      }
    ], [])
  });

  await assert.rejects(
    networkClient.requestJson("GET", "/config"),
    /Cannot reach helper/
  );
});
