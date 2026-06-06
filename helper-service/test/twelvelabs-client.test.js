const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { TwelveLabsClient, normalizeMarkerOutputStyle } = require("../src/twelvelabs-client");

test("createAsset accepts TwelveLabs _id response field", async function () {
  const tempFile = path.join(os.tmpdir(), `mark-test-${Date.now()}.mp4`);
  fs.writeFileSync(tempFile, "proxy");

  try {
    const client = new TwelveLabsClient({
      apiKey: "test-key",
      http: {
        post: async function post(url) {
          assert.equal(url, "/assets");
          return {
            data: {
              _id: "asset-123",
              status: "ready"
            }
          };
        }
      }
    });

    const asset = await client.createAsset(tempFile);
    assert.equal(asset.id, "asset-123");
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
});

test("createAsset includes Avid metadata as TwelveLabs user_metadata", async function () {
  const tempFile = path.join(os.tmpdir(), `mark-test-${Date.now()}.mp4`);
  fs.writeFileSync(tempFile, "proxy");

  try {
    const client = new TwelveLabsClient({
      apiKey: "test-key",
      http: {
        post: async function post(url, form) {
          assert.equal(url, "/assets");
          const formText = form._streams.filter(function stringOnly(part) {
            return typeof part === "string";
          }).join("\n");
          assert.match(formText, /user_metadata/);
          assert.match(formText, /"avid_scene":"Exterior alley"/);
          return {
            data: {
              id: "asset-123"
            }
          };
        }
      }
    });

    const asset = await client.createAsset(tempFile, {
      columns: {
        Scene: "Exterior alley"
      }
    });
    assert.equal(asset.id, "asset-123");
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
});

test("buildAnalysisPayload uses Pegasus time-based metadata segment definitions", function () {
  const client = new TwelveLabsClient({
    apiKey: "test-key",
    http: {}
  });

  const payload = client.buildAnalysisPayload("asset-123", "find bites", "job-1", {
    nameStyle: "Use producer shorthand.",
    commentStyle: "No comment."
  }, undefined, undefined, {
    columns: {
      Scene: "Exterior alley"
    }
  });
  const definition = payload.response_format.segment_definitions[0];
  const titleField = definition.fields.find(function findTitle(field) {
    return field.name === "title";
  });
  const commentField = definition.fields.find(function findComment(field) {
    return field.name === "comment";
  });

  assert.equal(payload.video.type, "asset_id");
  assert.equal(payload.video.asset_id, "asset-123");
  assert.equal(payload.model_name, "pegasus1.5");
  assert.equal(payload.analysis_mode, "time_based_metadata");
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "prompt"), false);
  assert.equal(payload.temperature, 0.1);
  assert.equal(payload.max_tokens, 4096);
  assert.equal(payload.response_format.type, "segment_definitions");
  assert.equal(definition.id, "markers");
  assert.match(definition.description, /find bites/);
  assert.match(definition.description, /Known Avid metadata/);
  assert.match(definition.description, /Scene: Exterior alley/);
  assert.match(definition.description, /Marker name guidance: Use producer shorthand/);
  assert.match(definition.description, /Comment guidance: No comment/);
  assert.match(definition.description, /Use producer shorthand/);
  assert.match(definition.description, /Never include confidence/);
  assert.match(definition.description, /prompt text/);
  assert.match(titleField.description, /maximum 6 words/);
  assert.match(titleField.description, /Use producer shorthand/);
  assert.match(commentField.description, /maximum 12 words/);
  assert.equal(
    definition.fields.some(function hasReason(field) {
      return field.name === "reason";
    }),
    false
  );
  assert.equal(
    definition.fields.some(function hasConfidence(field) {
      return field.name === "confidence";
    }),
    false
  );
});

test("buildAnalysisPayload can request continuous subclip segments", function () {
  const client = new TwelveLabsClient({
    apiKey: "test-key",
    http: {}
  });

  const payload = client.buildAnalysisPayload("asset-123", "best bites", "job-1", {
    subclipSummaryStyle: "Keep it practical."
  }, "subclips", {
    granularity: "scene",
    minDuration: 30,
    maxDuration: 180,
    targetSegmentsPerMinute: 0.35
  }, {
    columns: {
      Scene: "Exterior alley"
    }
  });
  const definition = payload.response_format.segment_definitions[0];
  const titleField = definition.fields.find(function findTitle(field) {
    return field.name === "title";
  });
  const summaryField = definition.fields.find(function findSummary(field) {
    return field.name === "summary";
  });

  assert.equal(payload.video.type, "asset_id");
  assert.equal(payload.model_name, "pegasus1.5");
  assert.equal(payload.analysis_mode, "time_based_metadata");
  assert.equal(payload.response_format.type, "segment_definitions");
  assert.equal(definition.id, "subclips");
  assert.match(definition.description, /continuous IN\/OUT sections/);
  assert.match(definition.description, /best bites/);
  assert.match(definition.description, /Known Avid metadata/);
  assert.match(definition.description, /Scene: Exterior alley/);
  assert.match(definition.description, /Granularity: scene/);
  assert.match(definition.description, /Summary guidance: Keep it practical/);
  assert.equal(payload.min_segment_duration, 30);
  assert.equal(payload.max_segment_duration, 180);
  assert.match(titleField.description, /subclip name/);
  assert.match(summaryField.description, /editor-facing summary/);
  assert.match(summaryField.description, /Keep it practical/);
});

test("normalizes legacy marker style into separate generated field styles", function () {
  assert.deepEqual(normalizeMarkerOutputStyle("  House style.   No reasoning.  "), {
    nameStyle: "House style. No reasoning.",
    commentStyle: "House style. No reasoning.",
    subclipSummaryStyle: "Short summaries of why the section is useful. No confidence or reasoning."
  });
});
