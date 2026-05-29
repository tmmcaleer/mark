const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanMarkerText,
  markerLengthFrames,
  markersToFrameRanges,
  normalizeTwelveLabsMarkers,
  secondsToFrames
} = require("../src/markers");

test("normalizes segment definition results into Mark marker proposals", function () {
  const markers = normalizeTwelveLabsMarkers({
    data: JSON.stringify({
      markers: [
        {
          start_time: 10.5,
          end_time: 12.25,
          metadata: {
            title: "Good bite",
            comment: "Strong quote",
            confidence: 0.91,
            reason: "Matches prompt"
          }
        }
      ]
    })
  });

  assert.equal(markers.length, 1);
  assert.equal(markers[0].name, "Good bite");
  assert.equal(markers[0].color, "Yellow");
  assert.equal(markers[0].startTime, 10.5);
  assert.equal(markers[0].endTime, 12.25);
  assert.equal(markers[0].comment, "Strong quote");
  assert.doesNotMatch(markers[0].comment, /Confidence|Reason|Matches prompt/);
  assert.match(markers[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(Object.prototype.hasOwnProperty.call(markers[0], "confidence"), false);
});

test("cleans confidence and reasoning language from marker text", function () {
  assert.equal(
    cleanMarkerText("Strong reaction. Confidence: 0.92. Reasoning: matches the prompt.", "", 80),
    "Strong reaction"
  );

  const markers = normalizeTwelveLabsMarkers({
    markers: [
      {
        start_time: 1,
        end_time: 2,
        metadata: {
          title: "Laugh beat - confidence high",
          comment: "Laugh beat. Rationale: the speaker smiles and crowd laughs."
        }
      }
    ]
  });

  assert.equal(markers[0].name, "Laugh beat");
  assert.equal(markers[0].comment, "Laugh beat");
});

test("normalizes marker title and comment text", function () {
  const markers = normalizeTwelveLabsMarkers({
    markers: [
      {
        start_time: 3,
        end_time: 5,
        metadata: {
          title: "Exterior House",
          comment: "Wide exterior. Confidence: 0.82."
        }
      }
    ]
  });

  assert.equal(markers[0].name, "Exterior House");
  assert.equal(markers[0].comment, "Wide exterior");
});

test("uses standard sanitizer limits for marker text", function () {
  const markers = normalizeTwelveLabsMarkers({
    markers: [
      {
        start_time: 3,
        end_time: 5,
        metadata: {
          title: "A very long title that should be shortened for a compact marker name",
          comment: "A very long comment that should be shortened for a compact marker note but should still keep useful editorial words"
        }
      }
    ]
  });

  assert.ok(markers[0].name.length <= 80);
  assert.ok(markers[0].comment.length <= 180);
});

test("drops invalid marker segments and repairs zero-length spans", function () {
  const markers = normalizeTwelveLabsMarkers({
    markers: [
      { end_time: 4, metadata: { title: "Missing start" } },
      { start_time: 8, end_time: 7, metadata: { title: "Short" } }
    ]
  });

  assert.equal(markers.length, 1);
  assert.equal(markers[0].startTime, 8);
  assert.equal(markers[0].endTime, 9);
});

test("maps seconds to Avid frame offsets across common project rates", function () {
  const rates = [24000 / 1001, 24, 25, 30000 / 1001, 60000 / 1001];

  for (const fps of rates) {
    const oneSecond = secondsToFrames(1, fps);
    assert.equal(oneSecond, Math.round(fps));
    assert.ok(Math.abs(oneSecond - fps) <= 1);
    assert.equal(markerLengthFrames(10, 10.01, fps), 1);
  }
});

test("adds frame ranges to normalized markers", function () {
  const framed = markersToFrameRanges([
    {
      name: "Marker",
      startTime: 1.25,
      endTime: 3.25
    }
  ], 24);

  assert.equal(framed[0].offset, 30);
  assert.equal(framed[0].length, 48);
});

test("throws on truncated JSON task output", function () {
  assert.throws(function parseBadJson() {
    normalizeTwelveLabsMarkers({
      data: "{\"markers\":["
    });
  }, /Unexpected end/);
});
