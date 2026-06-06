const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanSubclipText,
  normalizeSubclipOptions,
  normalizeTwelveLabsSubclips
} = require("../src/subclips");

test("normalizes subclip option presets and duration overrides", function () {
  assert.deepEqual(normalizeSubclipOptions({
    granularity: "fine"
  }), {
    granularity: "fine",
    minDuration: 4,
    maxDuration: 20,
    targetSegmentsPerMinute: 3
  });

  assert.deepEqual(normalizeSubclipOptions({
    granularity: "unknown",
    minDuration: 12,
    maxDuration: 6,
    targetSegmentsPerMinute: 2
  }), {
    granularity: "balanced",
    minDuration: 12,
    maxDuration: 12,
    targetSegmentsPerMinute: 2
  });
});

test("normalizes TwelveLabs subclip segment definitions", function () {
  const subclips = normalizeTwelveLabsSubclips({
    data: JSON.stringify({
      subclips: [
        {
          start_time: 10,
          end_time: 28.5,
          metadata: {
            title: "Strong continuous reaction",
            summary: "Usable beat. Confidence: 0.93."
          }
        }
      ]
    })
  }, {
    granularity: "balanced"
  });

  assert.equal(subclips.length, 1);
  assert.equal(subclips[0].use, true);
  assert.equal(subclips[0].name, "Strong continuous reaction");
  assert.equal(subclips[0].summary, "Usable beat");
  assert.equal(subclips[0].startTime, 10);
  assert.equal(subclips[0].endTime, 28.5);
  assert.equal(subclips[0].duration, 18.5);
  assert.match(subclips[0].id, /^[0-9a-f-]{36}$/);
});

test("repairs missing or oversized subclip ranges using options", function () {
  const subclips = normalizeTwelveLabsSubclips({
    subclips: [
      { start_time: 5, end_time: 6, metadata: { title: "Short" } },
      { start_time: 20, end_time: 80, metadata: { title: "Long" } },
      { end_time: 5, metadata: { title: "Invalid" } }
    ]
  }, {
    minDuration: 8,
    maxDuration: 30
  });

  assert.equal(subclips.length, 2);
  assert.equal(subclips[0].startTime, 5);
  assert.equal(subclips[0].endTime, 13);
  assert.equal(subclips[1].startTime, 20);
  assert.equal(subclips[1].endTime, 50);
});

test("cleans meta language from subclip copy", function () {
  assert.equal(
    cleanSubclipText("Good exchange. Reasoning: matches the prompt.", "", 80),
    "Good exchange"
  );
});
