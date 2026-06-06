import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSubclipBatchName,
  mergeSubclipAt,
  granularityPreset,
  normalizeSubclipNamingOptions,
  normalizeSubclipOptionValues,
  sanitizeSubclipName,
  sanitizeSubclipSuffix,
  selectedCountLabel,
  subclipRenameVerificationWarning,
  uniqueSubclipName
} from "../src/js/subclip-utils.mjs";

test("returns balanced granularity by default", function () {
  assert.equal(granularityPreset("unknown").label, "Balanced");
});

test("normalizes subclip duration options", function () {
  assert.deepEqual(normalizeSubclipOptionValues({
    granularity: "fine",
    minDuration: 6,
    maxDuration: 4
  }), {
    granularity: "fine",
    minDuration: 6,
    maxDuration: 6,
    targetSegmentsPerMinute: 3
  });
});

test("sanitizes and uniquifies subclip names", function () {
  assert.equal(sanitizeSubclipName("  Clip: bad/name?  "), "Clip bad name");
  const used = new Set(["Source - Bite"]);
  assert.equal(uniqueSubclipName("Source - Bite", used), "Source - Bite 2");
  const longBase = "A".repeat(120);
  assert.equal(uniqueSubclipName(longBase, new Set([longBase.toLowerCase()])), `${"A".repeat(118)} 2`);
});

test("builds default Avid-style batch subclip names", function () {
  assert.equal(buildSubclipBatchName("Interview A", 0, {}, new Set()), "Interview A.sub.0");
  assert.equal(buildSubclipBatchName("Interview A", 1, {}, new Set()), "Interview A.sub.1");
});

test("builds batch names with delimiter and numbering options", function () {
  assert.equal(buildSubclipBatchName("Clip", 0, {
    delimiter: " ",
    suffix: "select",
    startNumber: 4,
    padding: 3
  }, new Set()), "Clip select 004");
  assert.equal(buildSubclipBatchName("Clip", 1, {
    delimiter: "_",
    suffix: "take",
    startNumber: 9,
    padding: 1
  }, new Set()), "Clip_take_10");
  assert.equal(buildSubclipBatchName("Clip", 0, {
    delimiter: ".",
    suffix: "",
    startNumber: 1,
    padding: 2
  }, new Set()), "Clip.01");
});

test("normalizes subclip batch naming options", function () {
  assert.deepEqual(normalizeSubclipNamingOptions({
    delimiter: "/",
    suffix: " bad/name? ",
    startNumber: -4,
    padding: 12
  }), {
    delimiter: ".",
    suffix: "bad name",
    startNumber: 0,
    padding: 6
  });
  assert.equal(sanitizeSubclipSuffix("  "), "");
  assert.equal(normalizeSubclipNamingOptions({}).suffix, "sub");
  assert.equal(normalizeSubclipNamingOptions({ suffix: "" }).suffix, "");
});

test("keeps batch subclip names unique", function () {
  const used = new Set(["Clip.sub.0"]);
  assert.equal(buildSubclipBatchName("Clip", 0, {}, used), "Clip.sub.0 2");
});

test("reports subclip rename verification mismatches", function () {
  assert.equal(subclipRenameVerificationWarning("Clip.sub.01", "Clip.sub.01"), "");
  assert.match(
    subclipRenameVerificationWarning("Clip.sub.01", "Clip.01"),
    /instead of "Clip.sub.01"/
  );
  assert.match(
    subclipRenameVerificationWarning("Clip.sub.01", "", { found: false }),
    /could not find/
  );
  assert.match(
    subclipRenameVerificationWarning("Clip.sub.01", "", { readOk: false }),
    /could not re-read/
  );
});

test("formats selected action labels by mode", function () {
  assert.equal(selectedCountLabel("markers", 0), "Apply Selected Markers");
  assert.equal(selectedCountLabel("markers", 1), "Apply 1 Selected Marker");
  assert.equal(selectedCountLabel("subclips", 0), "Create Selected Subclips");
  assert.equal(selectedCountLabel("subclips", 2), "Create 2 Selected Subclips");
});

test("merges a subclip up into the previous subclip", function () {
  const result = mergeSubclipAt([
    { id: "a", use: true, startTime: 0, endTime: 5, summary: "First" },
    { id: "b", use: true, startTime: 5, endTime: 10, summary: "Middle" },
    { id: "c", use: true, startTime: 10, endTime: 15, summary: "Last" }
  ], 1, "up");

  assert.equal(result.length, 2);
  assert.deepEqual({
    id: result[0].id,
    startTime: result[0].startTime,
    endTime: result[0].endTime,
    summary: result[0].summary
  }, {
    id: "a",
    startTime: 0,
    endTime: 10,
    summary: "First / Middle"
  });
});

test("merges a subclip down into the next subclip", function () {
  const result = mergeSubclipAt([
    { id: "a", use: true, startTime: 0, endTime: 4, summary: "Lead" },
    { id: "b", use: true, startTime: 4, endTime: 9, summary: "Main" }
  ], 0, "down");

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "b");
  assert.equal(result[0].startTime, 0);
  assert.equal(result[0].endTime, 9);
  assert.equal(result[0].summary, "Lead / Main");
});

test("merge skips empty summaries when appending with separators", function () {
  const result = mergeSubclipAt([
    { id: "a", use: true, startTime: 0, endTime: 3, summary: "" },
    { id: "b", use: false, startTime: 3, endTime: 6, summary: "Only text" }
  ], 1, "up");

  assert.equal(result[0].summary, "Only text");
});

test("merge preserves selection when either merged subclip is selected", function () {
  const result = mergeSubclipAt([
    { id: "a", use: false, startTime: 0, endTime: 3, summary: "One" },
    { id: "b", use: true, startTime: 3, endTime: 6, summary: "Two" }
  ], 0, "down");

  assert.equal(result[0].use, true);
});

test("merge ignores impossible edge directions", function () {
  const subclips = [
    { id: "a", use: true, startTime: 0, endTime: 3, summary: "One" },
    { id: "b", use: true, startTime: 3, endTime: 6, summary: "Two" }
  ];

  assert.deepEqual(mergeSubclipAt(subclips, 0, "up"), subclips);
  assert.deepEqual(mergeSubclipAt(subclips, 1, "down"), subclips);
});
