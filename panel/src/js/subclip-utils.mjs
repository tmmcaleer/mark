export const SUBCLIP_GRANULARITY_PRESETS = {
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

export const DEFAULT_SUBCLIP_NAMING_OPTIONS = {
  delimiter: ".",
  suffix: "sub",
  startNumber: 0,
  padding: 1
};

const SUBCLIP_NAME_DELIMITERS = [".", " ", "-", "_"];

export function normalizeGranularity(value) {
  const key = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SUBCLIP_GRANULARITY_PRESETS, key)
    ? key
    : "balanced";
}

export function granularityPreset(value) {
  return SUBCLIP_GRANULARITY_PRESETS[normalizeGranularity(value)];
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function normalizeSubclipOptionValues(values) {
  const input = values && typeof values === "object" ? values : {};
  const granularity = normalizeGranularity(input.granularity);
  const preset = SUBCLIP_GRANULARITY_PRESETS[granularity];
  let minDuration = positiveNumber(input.minDuration, preset.minDuration);
  let maxDuration = positiveNumber(input.maxDuration, preset.maxDuration);

  minDuration = Math.max(1, Math.min(3600, minDuration));
  maxDuration = Math.max(1, Math.min(7200, maxDuration));
  if (maxDuration < minDuration) {
    maxDuration = minDuration;
  }

  return {
    granularity,
    minDuration,
    maxDuration,
    targetSegmentsPerMinute: positiveNumber(input.targetSegmentsPerMinute, preset.targetSegmentsPerMinute)
  };
}

export function sanitizeSubclipName(value, fallback = "Mark subclip") {
  const text = String(value || fallback || "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (text || fallback).slice(0, 120);
}

export function sanitizeSubclipSuffix(value) {
  const text = String(value || "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 40);
}

export function normalizeSubclipNamingOptions(values) {
  const input = values && typeof values === "object" ? values : {};
  const delimiter = SUBCLIP_NAME_DELIMITERS.indexOf(input.delimiter) === -1
    ? DEFAULT_SUBCLIP_NAMING_OPTIONS.delimiter
    : input.delimiter;
  const rawStartNumber = Number(input.startNumber);
  const rawPadding = Number(input.padding);
  const startNumber = Number.isFinite(rawStartNumber) && rawStartNumber >= 0
    ? Math.floor(rawStartNumber)
    : DEFAULT_SUBCLIP_NAMING_OPTIONS.startNumber;
  const padding = Number.isFinite(rawPadding) && rawPadding > 0
    ? Math.max(1, Math.min(6, Math.floor(rawPadding)))
    : DEFAULT_SUBCLIP_NAMING_OPTIONS.padding;

  return {
    delimiter,
    suffix: input.suffix === undefined || input.suffix === null
      ? DEFAULT_SUBCLIP_NAMING_OPTIONS.suffix
      : sanitizeSubclipSuffix(input.suffix),
    startNumber,
    padding
  };
}

export function buildSubclipBatchName(sourceName, index, options, usedNames) {
  const normalized = normalizeSubclipNamingOptions(options);
  const source = sanitizeSubclipName(sourceName, "Source clip");
  const number = String(normalized.startNumber + Math.max(0, Number(index) || 0)).padStart(normalized.padding, "0");
  return uniqueSubclipName([source, normalized.suffix, number].filter(Boolean).join(normalized.delimiter), usedNames);
}

export function combineSubclipSummaries(subclips) {
  return subclips.map(function summaryText(subclip) {
    return String(subclip && subclip.summary || "").trim();
  }).filter(Boolean).join(" / ");
}

export function mergeSubclipAt(subclips, index, direction) {
  const source = Array.isArray(subclips) ? subclips : [];
  const sourceIndex = Math.floor(Number(index));
  const mergeDown = direction === "down";
  const targetIndex = mergeDown ? sourceIndex + 1 : sourceIndex - 1;

  if (
    !Number.isFinite(sourceIndex)
    || sourceIndex < 0
    || sourceIndex >= source.length
    || targetIndex < 0
    || targetIndex >= source.length
  ) {
    return source.slice();
  }

  const sourceSubclip = source[sourceIndex] || {};
  const targetSubclip = source[targetIndex] || {};
  const timelineMembers = [sourceSubclip, targetSubclip].sort(function byTimeline(left, right) {
    return (Number(left.startTime) || 0) - (Number(right.startTime) || 0);
  });
  const startTime = Math.min.apply(null, timelineMembers.map(function startTime(subclip) {
    return Number(subclip.startTime) || 0;
  }));
  const endTime = Math.max.apply(null, timelineMembers.map(function endTime(subclip) {
    return Number(subclip.endTime) || 0;
  }));
  const merged = {
    ...targetSubclip,
    use: sourceSubclip.use !== false || targetSubclip.use !== false,
    startTime,
    endTime,
    summary: combineSubclipSummaries(timelineMembers),
    duration: Number((endTime - startTime).toFixed(3))
  };

  return source.reduce(function buildMergedSubclips(result, subclip, subclipIndex) {
    if (subclipIndex === sourceIndex) {
      return result;
    }
    result.push(subclipIndex === targetIndex ? merged : { ...subclip });
    return result;
  }, []);
}

export function selectedSubclipsForApply(subclips) {
  return (Array.isArray(subclips) ? subclips : []).filter(function selectedOnly(subclip) {
    return subclip && subclip.use !== false;
  });
}

export function uniqueSubclipName(baseName, usedNames) {
  const used = usedNames instanceof Set ? usedNames : new Set();
  Array.from(used).forEach(function normalizeUsedName(name) {
    used.add(String(name || "").toLowerCase());
  });
  const base = sanitizeSubclipName(baseName);
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix}`;
    candidate = sanitizeSubclipName(`${base.slice(0, 120 - suffixText.length)}${suffixText}`);
    suffix += 1;
  }

  used.add(candidate.toLowerCase());
  return candidate;
}

export function subclipRenameVerificationWarning(requestedName, finalName, options) {
  const readOk = !options || options.readOk !== false;
  const found = !options || options.found !== false;
  const expectedName = sanitizeSubclipName(requestedName);
  const observedName = sanitizeSubclipName(finalName, "");

  if (!readOk) {
    return "SetMobInfo returned, but Mark could not re-read the destination bin to verify the final subclip name.";
  }
  if (!found) {
    return `SetMobInfo returned, but Mark could not find the created subclip to verify "${expectedName}".`;
  }
  if (observedName !== expectedName) {
    return `SetMobInfo returned, but Avid reported "${observedName || "unnamed subclip"}" instead of "${expectedName}".`;
  }
  return "";
}

export function selectedCountLabel(mode, count) {
  const isSubclipMode = mode === "subclips";
  const singular = isSubclipMode ? "Subclip" : "Marker";
  const plural = isSubclipMode ? "Subclips" : "Markers";
  const verb = isSubclipMode ? "Create" : "Apply";
  return count > 0
    ? `${verb} ${count} Selected ${count === 1 ? singular : plural}`
    : `${verb} Selected ${plural}`;
}
