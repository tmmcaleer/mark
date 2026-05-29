const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const { normalizeTwelveLabsMarkers } = require("./markers");

const DEFAULT_MARKER_NAME_STYLE = "Short editor-facing marker names. No confidence, no reasoning, no full sentences.";
const DEFAULT_MARKER_COMMENT_STYLE = "Concise Avid marker notes. No confidence, no reasoning, no full sentences.";

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
      commentStyle: legacyStyle || DEFAULT_MARKER_COMMENT_STYLE
    };
  }

  const style = markerOutputStyle && typeof markerOutputStyle === "object" ? markerOutputStyle : {};
  return {
    nameStyle: sanitizeStyleText(style.nameStyle, DEFAULT_MARKER_NAME_STYLE),
    commentStyle: sanitizeStyleText(style.commentStyle, DEFAULT_MARKER_COMMENT_STYLE)
  };
}

function nameFieldDescription(style) {
  return `Short Avid marker name, maximum 6 words. Style: ${style.nameStyle}. Do not include confidence or reasoning.`;
}

function commentFieldDescription(style) {
  return `Concise Avid marker note, maximum 12 words. Style: ${style.commentStyle}. Do not mention the prompt, matching, confidence, reason, rationale, or instructions.`;
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

  async createAsset(filePath) {
    const form = new FormData();
    form.append("method", "direct");
    form.append("file", fs.createReadStream(filePath));

    const response = await this.http.post("/assets", form, {
      headers: form.getHeaders()
    });

    const assetId = firstId(response.data, ["_id", "id", "asset_id", "assetId"]);
    if (!assetId) {
      throw new Error("TwelveLabs did not return an asset id");
    }

    return {
      id: assetId,
      raw: response.data
    };
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

  buildAnalysisPayload(assetId, prompt, customId, markerOutputStyle) {
    const style = normalizeMarkerOutputStyle(markerOutputStyle);
    const markerDescription = [
      "Create Avid marker suggestions for the requested visual or dialogue moments.",
      `User request: ${prompt}`,
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

  async createAnalysisTask(assetId, prompt, customId, markerOutputStyle) {
    const payload = this.buildAnalysisPayload(assetId, prompt, customId, markerOutputStyle);
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

  async analyzeFile(filePath, prompt, customId, markerOutputStyle) {
    const asset = await this.createAsset(filePath);
    await this.waitForAsset(asset.id);
    const style = normalizeMarkerOutputStyle(markerOutputStyle);
    const task = await this.createAnalysisTask(asset.id, prompt, customId, style);
    const readyTask = await this.waitForAnalysisTask(task.id);
    return {
      asset,
      task: {
        id: task.id,
        raw: readyTask
      },
      markers: normalizeTwelveLabsMarkers(readyTask.result || readyTask)
    };
  }
}

module.exports = {
  TwelveLabsClient,
  normalizeMarkerOutputStyle
};
