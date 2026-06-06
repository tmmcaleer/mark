const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const { normalizeTwelveLabsMarkers } = require("./markers");
const {
  formatPromptContext,
  promptContextUserMetadata
} = require("./prompt-context");
const { normalizeSubclipOptions, normalizeTwelveLabsSubclips } = require("./subclips");

const DEFAULT_MARKER_NAME_STYLE = "Short editor-facing marker names. No confidence, no reasoning, no full sentences.";
const DEFAULT_MARKER_COMMENT_STYLE = "Concise Avid marker notes. No confidence, no reasoning, no full sentences.";
const DEFAULT_SUBCLIP_SUMMARY_STYLE = "Short summaries of why the section is useful. No confidence or reasoning.";

function sleep(ms) {
  return new Promise(function wait(resolve) {
    setTimeout(resolve, ms);
  });
}

function firstId(payload, keys) {
  for (const key of keys) {
    if (payload && typeof payload[key] === "string" && payload[key]) {
      return payload[key];
    }
  }
  return "";
}

function sanitizeStyleText(value, fallback) {
  const text = String(value || "").replace(/\s+/g, " ").trim().slice(0, 500);
  return text || fallback;
}

function normalizeMarkerOutputStyle(markerOutputStyle) {
  if (typeof markerOutputStyle === "string") {
    const legacyStyle = sanitizeStyleText(markerOutputStyle, "");
    return {
      nameStyle: legacyStyle || DEFAULT_MARKER_NAME_STYLE,
      commentStyle: legacyStyle || DEFAULT_MARKER_COMMENT_STYLE,
      subclipSummaryStyle: DEFAULT_SUBCLIP_SUMMARY_STYLE
    };
  }

  const style = markerOutputStyle && typeof markerOutputStyle === "object" ? markerOutputStyle : {};
  return {
    nameStyle: sanitizeStyleText(style.nameStyle, DEFAULT_MARKER_NAME_STYLE),
    commentStyle: sanitizeStyleText(style.commentStyle, DEFAULT_MARKER_COMMENT_STYLE),
    subclipSummaryStyle: sanitizeStyleText(style.subclipSummaryStyle, DEFAULT_SUBCLIP_SUMMARY_STYLE)
  };
}

function nameFieldDescription(style) {
  return `Short Avid marker name, maximum 6 words. Style: ${style.nameStyle}. Do not include confidence or reasoning.`;
}

function commentFieldDescription(style) {
  return `Concise Avid marker note, maximum 12 words. Style: ${style.commentStyle}. Do not mention the prompt, matching, confidence, reason, rationale, or instructions.`;
}

function normalizeOutputMode(value) {
  return String(value || "").trim().toLowerCase() === "subclips" ? "subclips" : "markers";
}

function subclipNameFieldDescription() {
  return "Short Avid subclip name, maximum 8 words. Describe the continuous usable section, not the prompt or reasoning.";
}

function subclipSummaryFieldDescription(style) {
  return `Concise editor-facing summary, maximum 16 words. Style: ${style.subclipSummaryStyle}. Do not mention the prompt, matching, confidence, reason, rationale, or instructions.`;
}

class TwelveLabsClient {
  constructor(options) {
    const opts = options || {};
    if (!opts.apiKey) {
      throw new Error("TWELVELABS_API_KEY is required");
    }

    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl || "https://api.twelvelabs.io/v1.3").replace(/\/+$/, "");
    this.http = opts.http || axios.create({
      baseURL: this.baseUrl,
      timeout: opts.timeoutMs || 120000,
      headers: {
        "x-api-key": this.apiKey
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    this.pollIntervalMs = opts.pollIntervalMs || 3000;
    this.assetTimeoutMs = opts.assetTimeoutMs || 10 * 60 * 1000;
    this.taskTimeoutMs = opts.taskTimeoutMs || 20 * 60 * 1000;
  }

  async getAsset(assetId) {
    const response = await this.http.get(`/assets/${encodeURIComponent(assetId)}`);
    return response.data;
  }

  async waitForAsset(assetId) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.assetTimeoutMs) {
      const asset = await this.getAsset(assetId);
      const status = String(asset.status || "").toLowerCase();
      if (!status || status === "ready") {
        return asset;
      }
      if (status === "failed" || status === "error") {
        throw new Error(asset.error || asset.message || "TwelveLabs asset processing failed");
      }
      await sleep(this.pollIntervalMs);
    }

    throw new Error("Timed out waiting for TwelveLabs asset processing");
  }

  createAsset(filePath, promptContext) {
    const form = new FormData();
    const userMetadata = promptContextUserMetadata(promptContext);
    form.append("method", "direct");
    if (Object.keys(userMetadata).length > 0) {
      form.append("user_metadata", JSON.stringify(userMetadata));
    }
    form.append("file", fs.createReadStream(filePath));

    return this.http.post("/assets", form, {
      headers: form.getHeaders()
    }).then(function parseAsset(response) {
      const assetId = firstId(response.data, ["_id", "id", "asset_id", "assetId"]);
      if (!assetId) {
        throw new Error("TwelveLabs did not return an asset id");
      }

      return {
        id: assetId,
        raw: response.data
      };
    });
  }

  buildAnalysisPayload(assetId, prompt, customId, markerOutputStyle, outputMode, subclipOptions, promptContext) {
    if (normalizeOutputMode(outputMode) === "subclips") {
      return this.buildSubclipAnalysisPayload(assetId, prompt, customId, subclipOptions, markerOutputStyle, promptContext);
    }

    const style = normalizeMarkerOutputStyle(markerOutputStyle);
    const contextText = formatPromptContext(promptContext);
    const markerDescription = [
      "Create Avid marker suggestions for the requested visual or dialogue moments.",
      `User request: ${prompt}`,
      contextText,
      `Marker name guidance: ${style.nameStyle}`,
      `Comment guidance: ${style.commentStyle}`,
      "Return only short editor-facing marker text.",
      "Never include confidence, confidence interval, reasoning, rationale, matching explanation, prompt text, or analysis.",
      "Do not write stage directions or describe yourself reading/transcribing the prompt."
    ].join(" ");

    return {
      video: {
        type: "asset_id",
        asset_id: assetId
      },
      model_name: "pegasus1.5",
      analysis_mode: "time_based_metadata",
      custom_id: customId,
      response_format: {
        type: "segment_definitions",
        segment_definitions: [
          {
            id: "markers",
            description: markerDescription,
            fields: [
              {
                name: "title",
                type: "string",
                description: nameFieldDescription(style)
              },
              {
                name: "comment",
                type: "string",
                description: commentFieldDescription(style)
              }
            ]
          }
        ]
      },
      temperature: 0.1,
      max_tokens: 4096,
      min_segment_duration: 2,
      max_segment_duration: 60
    };
  }

  buildSubclipAnalysisPayload(assetId, prompt, customId, subclipOptions, markerOutputStyle, promptContext) {
    const options = normalizeSubclipOptions(subclipOptions);
    const style = normalizeMarkerOutputStyle(markerOutputStyle);
    const contextText = formatPromptContext(promptContext);
    const subclipDescription = [
      "Create Avid subclip suggestions as continuous IN/OUT sections from the source clip.",
      `User request: ${prompt}`,
      contextText,
      `Granularity: ${options.granularity}.`,
      `Aim for about ${options.targetSegmentsPerMinute} useful subclip section${options.targetSegmentsPerMinute === 1 ? "" : "s"} per minute when the source contains matching material.`,
      `Each section should be between ${options.minDuration} and ${options.maxDuration} seconds when possible.`,
      "Prefer complete usable beats over isolated bookmark moments.",
      `Summary guidance: ${style.subclipSummaryStyle}`,
      "Return short editor-facing summaries.",
      "Never include confidence, confidence interval, reasoning, rationale, matching explanation, prompt text, or analysis."
    ].join(" ");

    return {
      video: {
        type: "asset_id",
        asset_id: assetId
      },
      model_name: "pegasus1.5",
      analysis_mode: "time_based_metadata",
      custom_id: customId,
      response_format: {
        type: "segment_definitions",
        segment_definitions: [
          {
            id: "subclips",
            description: subclipDescription,
            fields: [
              {
                name: "title",
                type: "string",
                description: subclipNameFieldDescription()
              },
              {
                name: "summary",
                type: "string",
                description: subclipSummaryFieldDescription(style)
              }
            ]
          }
        ]
      },
      temperature: 0.1,
      max_tokens: 4096,
      min_segment_duration: options.minDuration,
      max_segment_duration: options.maxDuration
    };
  }

  async createAnalysisTask(assetId, prompt, customId, markerOutputStyle, outputMode, subclipOptions, promptContext) {
    const payload = this.buildAnalysisPayload(assetId, prompt, customId, markerOutputStyle, outputMode, subclipOptions, promptContext);
    const response = await this.http.post("/analyze/tasks", payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    const taskId = firstId(response.data, ["id", "task_id", "taskId"]);
    if (!taskId) {
      throw new Error("TwelveLabs did not return an analysis task id");
    }

    return {
      id: taskId,
      raw: response.data
    };
  }

  async getAnalysisTask(taskId) {
    const response = await this.http.get(`/analyze/tasks/${encodeURIComponent(taskId)}`);
    return response.data;
  }

  async waitForAnalysisTask(taskId) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.taskTimeoutMs) {
      const task = await this.getAnalysisTask(taskId);
      const status = String(task.status || "").toLowerCase();
      if (status === "ready") {
        return task;
      }
      if (status === "failed" || status === "error") {
        throw new Error(task.error || task.message || "TwelveLabs analysis task failed");
      }
      await sleep(this.pollIntervalMs);
    }

    throw new Error("Timed out waiting for TwelveLabs analysis task");
  }

  async analyzeFile(filePath, prompt, customId, markerOutputStyle, outputMode, subclipOptions, promptContext) {
    const asset = await this.createAsset(filePath, promptContext);
    await this.waitForAsset(asset.id);
    const style = normalizeMarkerOutputStyle(markerOutputStyle);
    const mode = normalizeOutputMode(outputMode);
    const task = await this.createAnalysisTask(asset.id, prompt, customId, style, mode, subclipOptions, promptContext);
    const readyTask = await this.waitForAnalysisTask(task.id);
    const resultData = readyTask.result || readyTask;
    const result = {
      asset,
      task: {
        id: task.id,
        raw: readyTask
      }
    };
    if (mode === "subclips") {
      result.subclips = normalizeTwelveLabsSubclips(resultData, subclipOptions);
      return result;
    }

    return {
      ...result,
      markers: normalizeTwelveLabsMarkers(resultData)
    };
  }
}

module.exports = {
  TwelveLabsClient,
  normalizeMarkerOutputStyle
};
