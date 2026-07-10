const fs = require("fs");

const axios = require("axios");
const FormData = require("form-data");

const { MarkError } = require("./mark-error");

function billableMinutes(durationSeconds) {
  return Math.max(1, Math.ceil((Number(durationSeconds) || 0) / 60));
}

class CloudAnalysisClient {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || "").replace(/\/+$/, "");
    this.getSessionToken = options.getSessionToken || function noToken() {
      return "";
    };
    this.http = options.http || axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeoutMs || 20 * 60 * 1000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    this.remoteJob = null;
  }

  authHeaders(extra) {
    const token = this.getSessionToken();
    if (!token) {
      throw new MarkError("Sign in to Mark before analyzing media", {
        code: "AUTH_REQUIRED",
        statusCode: 401
      });
    }
    return {
      ...(extra || {}),
      Authorization: `Bearer ${token}`
    };
  }

  async startJob(job, segments) {
    const estimatedMinutes = (segments || []).reduce(function sum(total, segment) {
      return total + billableMinutes(segment && segment.durationSeconds);
    }, 0);
    const response = await this.http.post("/analysis/jobs", {
      prompt: job.prompt,
      outputMode: job.outputMode,
      markerOutputStyle: job.markerOutputStyle,
      subclipOptions: job.subclipOptions,
      promptContext: job.promptContext,
      clip: job.clip,
      project: job.project,
      mediaSourceKind: job.mediaSourceKind,
      estimatedMinutes
    }, {
      headers: this.authHeaders({
        "Content-Type": "application/json"
      })
    });
    this.remoteJob = response.data;
    return this.remoteJob;
  }

  async analyzeFile(filePath, prompt, customId, markerOutputStyle, outputMode, subclipOptions, promptContext, context = {}) {
    if (!this.remoteJob || !this.remoteJob.id) {
      throw new MarkError("Cloud analysis job was not started", {
        code: "CLOUD_JOB_NOT_STARTED",
        statusCode: 500
      });
    }

    const form = new FormData();
    const segment = context.segment || {};
    form.append("file", fs.createReadStream(filePath));
    form.append("segment", JSON.stringify({
      index: context.segmentIndex || 0,
      startSeconds: segment.startSeconds || 0,
      durationSeconds: segment.durationSeconds || 0,
      sourceKind: segment.sourceKind || ""
    }));
    form.append("prompt", prompt);
    form.append("markerOutputStyle", JSON.stringify(markerOutputStyle || {}));
    form.append("outputMode", outputMode || "markers");
    form.append("subclipOptions", JSON.stringify(subclipOptions || {}));
    form.append("promptContext", JSON.stringify(promptContext || {}));

    const response = await this.http.post(`/analysis/jobs/${encodeURIComponent(this.remoteJob.id)}/segments`, form, {
      headers: this.authHeaders(form.getHeaders())
    });

    return {
      asset: response.data.asset,
      task: response.data.task,
      markers: response.data.markers || [],
      subclips: response.data.subclips || []
    };
  }

  async completeJob() {
    if (!this.remoteJob || !this.remoteJob.id) {
      return null;
    }
    const response = await this.http.post(`/analysis/jobs/${encodeURIComponent(this.remoteJob.id)}/complete`, {}, {
      headers: this.authHeaders({
        "Content-Type": "application/json"
      })
    });
    return response.data;
  }

  async failJob(error) {
    if (!this.remoteJob || !this.remoteJob.id) {
      return null;
    }
    const response = await this.http.post(`/analysis/jobs/${encodeURIComponent(this.remoteJob.id)}/fail`, {
      code: error && error.code || "ANALYSIS_FAILED",
      message: error && error.message || "Analysis failed"
    }, {
      headers: this.authHeaders({
        "Content-Type": "application/json"
      })
    });
    return response.data;
  }
}

module.exports = {
  billableMinutes,
  CloudAnalysisClient
};
