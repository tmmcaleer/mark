const { TwelveLabsClient } = require("@mark/analysis");

const { HttpError } = require("./http-error");
const { billableMinutesForSeconds } = require("./probe");

function createAnalyzer(config, options = {}) {
  if (options.analyzer) {
    return options.analyzer;
  }
  if (!config.twelveLabsApiKey) {
    return null;
  }
  return new TwelveLabsClient({
    apiKey: config.twelveLabsApiKey,
    baseUrl: config.twelveLabsBaseUrl
  });
}

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  return JSON.parse(String(value));
}

function resultCountForMode(result, outputMode) {
  return outputMode === "subclips"
    ? (result.subclips || []).length
    : (result.markers || []).length;
}

async function analyzeUploadedSegment(deps, job, upload, body, verifiedDurationSeconds) {
  if (!upload || !upload.path) {
    throw new HttpError("Analysis segment upload is required", {
      code: "SEGMENT_UPLOAD_REQUIRED",
      statusCode: 400
    });
  }
  if (!deps.analyzer || typeof deps.analyzer.analyzeFile !== "function") {
    throw new HttpError("TwelveLabs analysis is not configured", {
      code: "TWELVELABS_NOT_CONFIGURED",
      statusCode: 503
    });
  }

  const segment = parseJsonField(body.segment, {});
  const request = job.request || {};
  const prompt = body.prompt || job.prompt || request.prompt || "";
  const outputMode = job.outputMode || job.output_mode || request.outputMode || "markers";
  const durationSeconds = Number(verifiedDurationSeconds) || await deps.probeDuration(upload.path);
  const billableMinutes = billableMinutesForSeconds(durationSeconds);
  const segmentIndex = Number(segment.index !== undefined ? segment.index : body.segmentIndex) || 0;
  const result = await deps.analyzer.analyzeFile(
    upload.path,
    prompt,
    `${job.id}_${segmentIndex + 1}`,
    parseJsonField(body.markerOutputStyle, request.markerOutputStyle || {}),
    outputMode,
    parseJsonField(body.subclipOptions, request.subclipOptions || {}),
    parseJsonField(body.promptContext, request.promptContext || {})
  );

  const resultCount = resultCountForMode(result, outputMode);
  await deps.store.recordAnalysisSegment({
    jobId: job.id,
    userId: job.userId || job.user_id,
    segmentIndex,
    startSeconds: Number(segment.startSeconds) || 0,
    durationSeconds,
    billableMinutes,
    resultCount,
    twelveLabsAssetId: result.asset && result.asset.id || "",
    twelveLabsTaskId: result.task && result.task.id || ""
  });

  return {
    outputMode,
    durationSeconds,
    billableMinutes,
    result
  };
}

module.exports = {
  analyzeUploadedSegment,
  createAnalyzer
};
