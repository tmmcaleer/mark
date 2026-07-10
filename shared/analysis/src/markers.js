const crypto = require("crypto");

const MARKER_COLORS = [
  "Red",
  "Green",
  "Blue",
  "Cyan",
  "Magenta",
  "Yellow",
  "Black",
  "White",
  "NearWhite",
  "Pink",
  "Forest",
  "Denim",
  "Violet",
  "Purple",
  "Orange",
  "Grey",
  "Gold"
];

function trimText(value, fallback, maxLength) {
  const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
  return text.slice(0, maxLength);
}

function stripMetaLanguage(value) {
  return String(value || "")
    .split(/\r?\n|[•]+/g)
    .map(function cleanPart(part) {
      return part
        .replace(/\b(confidence(?: interval)?|reason(?:ing)?|rationale|matches prompt|match rationale|analysis)\s*[:=-]\s*.*?(?=(?:\s+\b(?:confidence(?: interval)?|reason(?:ing)?|rationale|matches prompt|match rationale|analysis)\s*[:=-])|$)/gi, "")
        .replace(/\b(confidence|confidence interval)\s*[:=-]\s*[0-9.]+\s*[^.;|]*[.;|]?/gi, "")
        .replace(/\b(confidence|confidence interval|reason|reasoning|rationale|matches prompt|match rationale|analysis)\s*[:=-]\s*[^.;|]+[.;|]?/gi, "")
        .replace(/\b(confidence|reasoning|rationale|analysis)\b[^.;|]*[.;|]?/gi, "")
        .trim();
    })
    .filter(Boolean)
    .join(" ");
}

function cleanMarkerText(value, fallback, maxLength) {
  const text = stripMetaLanguage(value)
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[-–—:;,.|]\s*$/g, "")
    .trim();
  return trimText(text, fallback, maxLength);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stableMarkerId(marker, index) {
  const input = [
    index,
    marker.startTime,
    marker.endTime,
    marker.name,
    marker.comment
  ].join("|");
  const hex = crypto.createHash("sha1").update(input).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32)
  ].join("-");
}

function extractSegments(resultData) {
  if (!resultData) {
    return [];
  }

  if (Array.isArray(resultData)) {
    return resultData;
  }

  if (Array.isArray(resultData.markers)) {
    return resultData.markers;
  }

  if (resultData.markers && Array.isArray(resultData.markers.segments)) {
    return resultData.markers.segments;
  }

  if (Array.isArray(resultData.segments)) {
    return resultData.segments;
  }

  if (Array.isArray(resultData.data)) {
    return resultData.data;
  }

  return [];
}

function parseResultData(taskResult) {
  if (typeof taskResult === "string") {
    return JSON.parse(taskResult);
  }

  if (taskResult && typeof taskResult.data === "string") {
    return JSON.parse(taskResult.data);
  }

  if (taskResult && taskResult.data) {
    return taskResult.data;
  }

  return taskResult;
}

function normalizeTwelveLabsMarkers(taskResult) {
  const parsed = parseResultData(taskResult);
  const segments = extractSegments(parsed);

  return segments
    .map(function normalize(segment, index) {
      const metadata = segment.metadata || segment.fields || segment;
      const startTime = numberOrNull(segment.start_time ?? segment.startTime ?? segment.start);
      const endCandidate = numberOrNull(segment.end_time ?? segment.endTime ?? segment.end);

      if (startTime === null) {
        return null;
      }

      const endTime = endCandidate !== null && endCandidate > startTime
        ? endCandidate
        : startTime + 1;

      const title = cleanMarkerText(metadata.title || metadata.name, "Mark marker", 80);
      const comment = cleanMarkerText(metadata.comment || metadata.description, "", 180);

      const marker = {
        name: title,
        comment,
        color: MARKER_COLORS.includes(metadata.color) ? metadata.color : "Yellow",
        startTime,
        endTime
      };

      return {
        id: stableMarkerId(marker, index),
        ...marker
      };
    })
    .filter(Boolean)
    .sort(function sortByTime(left, right) {
      return left.startTime - right.startTime;
    });
}

function secondsToFrames(seconds, fps) {
  const numericSeconds = Number(seconds);
  const numericFps = Number(fps);
  if (!Number.isFinite(numericSeconds) || !Number.isFinite(numericFps) || numericFps <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(numericSeconds * numericFps));
}

function markerLengthFrames(startSeconds, endSeconds, fps) {
  const startFrame = secondsToFrames(startSeconds, fps);
  const endFrame = secondsToFrames(endSeconds, fps);
  return Math.max(1, endFrame - startFrame);
}

function markersToFrameRanges(markers, fps) {
  return markers.map(function toFrameRange(marker) {
    return {
      ...marker,
      offset: secondsToFrames(marker.startTime, fps),
      length: markerLengthFrames(marker.startTime, marker.endTime, fps)
    };
  });
}

module.exports = {
  MARKER_COLORS,
  cleanMarkerText,
  markerLengthFrames,
  markersToFrameRanges,
  normalizeTwelveLabsMarkers,
  secondsToFrames
};
