const crypto = require("crypto");

const SUBCLIP_GRANULARITY_PRESETS = {
  fine: {
    label: "Fine",
    minDuration: 4,
    maxDuration: 20,
    targetSegmentsPerMinute: 3
  },
  balanced: {
    label: "Balanced",
    minDuration: 8,
    maxDuration: 45,
    targetSegmentsPerMinute: 1.5
  },
  broad: {
    label: "Broad",
    minDuration: 15,
    maxDuration: 90,
    targetSegmentsPerMinute: 0.75
  },
  scene: {
    label: "Scene",
    minDuration: 30,
    maxDuration: 180,
    targetSegmentsPerMinute: 0.35
  }
};

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function trimText(value, fallback, maxLength) {
  const text = String(value || fallback || "")
    .replace(/\s+/g, " ")
    .trim();
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

function cleanSubclipText(value, fallback, maxLength) {
  const text = stripMetaLanguage(value)
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[-–—:;,.|]\s*$/g, "")
    .trim();
  return trimText(text, fallback, maxLength);
}

function stableSubclipId(subclip, index) {
  const input = [
    index,
    subclip.startTime,
    subclip.endTime,
    subclip.name,
    subclip.summary
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

function normalizeGranularity(value) {
  const key = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SUBCLIP_GRANULARITY_PRESETS, key)
    ? key
    : "balanced";
}

function normalizeSubclipOptions(options) {
  const input = options && typeof options === "object" ? options : {};
  const granularity = normalizeGranularity(input.granularity);
  const preset = SUBCLIP_GRANULARITY_PRESETS[granularity];
  let minDuration = positiveNumber(input.minDuration ?? input.minSegmentDuration, preset.minDuration);
  let maxDuration = positiveNumber(input.maxDuration ?? input.maxSegmentDuration, preset.maxDuration);

  minDuration = Math.max(1, Math.min(3600, minDuration));
  maxDuration = Math.max(1, Math.min(7200, maxDuration));
  if (maxDuration < minDuration) {
    maxDuration = minDuration;
  }

  return {
    granularity,
    minDuration,
    maxDuration,
    targetSegmentsPerMinute: positiveNumber(
      input.targetSegmentsPerMinute,
      preset.targetSegmentsPerMinute
    )
  };
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

function extractSubclipSegments(resultData) {
  if (!resultData) {
    return [];
  }

  if (Array.isArray(resultData)) {
    return resultData;
  }

  if (Array.isArray(resultData.subclips)) {
    return resultData.subclips;
  }

  if (resultData.subclips && Array.isArray(resultData.subclips.segments)) {
    return resultData.subclips.segments;
  }

  if (Array.isArray(resultData.segments)) {
    return resultData.segments;
  }

  if (Array.isArray(resultData.data)) {
    return resultData.data;
  }

  return [];
}

function normalizeTwelveLabsSubclips(taskResult, options) {
  const normalizedOptions = normalizeSubclipOptions(options);
  const parsed = parseResultData(taskResult);
  const segments = extractSubclipSegments(parsed);

  return segments
    .map(function normalize(segment, index) {
      const metadata = segment.metadata || segment.fields || segment;
      const startTime = numberOrNull(segment.start_time ?? segment.startTime ?? segment.start);
      const endCandidate = numberOrNull(segment.end_time ?? segment.endTime ?? segment.end);

      if (startTime === null) {
        return null;
      }

      let endTime = endCandidate !== null && endCandidate > startTime
        ? endCandidate
        : startTime + normalizedOptions.minDuration;

      if (endTime - startTime < normalizedOptions.minDuration) {
        endTime = startTime + normalizedOptions.minDuration;
      }
      if (endTime - startTime > normalizedOptions.maxDuration) {
        endTime = startTime + normalizedOptions.maxDuration;
      }

      const subclip = {
        use: true,
        name: cleanSubclipText(metadata.title || metadata.name, "Mark subclip", 100),
        summary: cleanSubclipText(metadata.summary || metadata.comment || metadata.description, "", 240),
        startTime,
        endTime,
        duration: Number((endTime - startTime).toFixed(3))
      };

      return {
        id: stableSubclipId(subclip, index),
        ...subclip
      };
    })
    .filter(Boolean)
    .sort(function sortByTime(left, right) {
      return left.startTime - right.startTime;
    });
}

module.exports = {
  SUBCLIP_GRANULARITY_PRESETS,
  cleanSubclipText,
  normalizeSubclipOptions,
  normalizeTwelveLabsSubclips
};
