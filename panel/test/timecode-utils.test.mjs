import test from "node:test";
import assert from "node:assert/strict";

import {
  framesToTimecode,
  markerInTimecode,
  markerTimecodeRange,
  secondsToTimecode
} from "../src/js/timecode-utils.mjs";

test("formats non-drop-frame SMPTE timecode", function () {
  assert.equal(framesToTimecode(0, 24, false), "00:00:00:00");
  assert.equal(framesToTimecode(25, 25, false), "00:00:01:00");
  assert.equal(secondsToTimecode(65.5, 24, false), "00:01:05:12");
});

test("formats drop-frame SMPTE timecode for 29.97 and 59.94 projects", function () {
  assert.equal(framesToTimecode(1800, 30000 / 1001, true), "00:01:00;02");
  assert.equal(framesToTimecode(17982, 30000 / 1001, true), "00:10:00;00");
  assert.equal(framesToTimecode(3600, 60000 / 1001, true), "00:01:00;04");
});

test("formats marker ranges from project settings", function () {
  const marker = {
    startTime: 10,
    endTime: 12.5
  };

  assert.equal(markerTimecodeRange(marker, {
    fps: 24,
    dropFrame: false
  }), "00:00:10:00 - 00:00:12:12");
});

test("formats marker IN timecode from project settings", function () {
  assert.equal(markerInTimecode({
    startTime: 10
  }, {
    fps: 24,
    dropFrame: false
  }), "00:00:10:00");
});
