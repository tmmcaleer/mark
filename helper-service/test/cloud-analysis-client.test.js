const test = require("node:test");
const assert = require("node:assert/strict");

const { CloudAnalysisClient, billableMinutes } = require("../src/cloud-analysis-client");

test("billableMinutes rounds up analyzed minutes", function () {
  assert.equal(billableMinutes(1), 1);
  assert.equal(billableMinutes(60), 1);
  assert.equal(billableMinutes(61), 2);
});

test("cloud analysis client sends Mark session authorization", async function () {
  const calls = [];
  const client = new CloudAnalysisClient({
    baseUrl: "http://cloud.test",
    getSessionToken: function token() {
      return "mark-session";
    },
    http: {
      post: async function post(url, body, options) {
        calls.push({
          url,
          body,
          headers: options.headers
        });
        if (url === "/analysis/jobs") {
          return {
            data: {
              id: "job-1"
            }
          };
        }
        if (url.endsWith("/complete")) {
          return {
            data: {
              status: "completed"
            }
          };
        }
        return {
          data: {}
        };
      }
    }
  });

  await client.startJob({
    prompt: "faces",
    outputMode: "markers",
    markerOutputStyle: {},
    subclipOptions: {},
    promptContext: {},
    clip: {},
    project: {}
  }, [{
    durationSeconds: 61
  }]);
  await client.completeJob();

  assert.equal(calls[0].body.estimatedMinutes, 2);
  assert.equal(calls[0].headers.Authorization, "Bearer mark-session");
  assert.equal(calls[1].url, "/analysis/jobs/job-1/complete");
  assert.equal(calls[1].headers.Authorization, "Bearer mark-session");
});
