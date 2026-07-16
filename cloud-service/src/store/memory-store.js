const crypto = require("crypto");

const { HttpError } = require("../http-error");

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class MemoryStore {
  constructor() {
    this.profiles = new Map();
    this.deviceSessions = new Map();
    this.stripeCustomers = new Map();
    this.stripeWebhookEvents = new Map();
    this.creditTransactions = [];
    this.analysisJobs = new Map();
    this.analysisSegments = [];
  }

  async createDeviceSession(session) {
    const record = {
      id: uuid(),
      deviceCodeHash: session.deviceCodeHash,
      userCode: session.userCode,
      status: "pending",
      markSessionToken: "",
      userId: null,
      email: "",
      expiresAt: session.expiresAt,
      createdAt: nowIso(),
      authorizedAt: null
    };
    this.deviceSessions.set(record.deviceCodeHash, record);
    return clone(record);
  }

  async completeDeviceSession(input) {
    const record = this.deviceSessions.get(input.deviceCodeHash);
    if (!record) {
      throw new HttpError("Device sign-in session was not found", {
        code: "DEVICE_SESSION_NOT_FOUND",
        statusCode: 404
      });
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      record.status = "expired";
      throw new HttpError("Device sign-in session expired", {
        code: "DEVICE_SESSION_EXPIRED",
        statusCode: 410
      });
    }
    if (record.status !== "pending") {
      throw new HttpError("Device sign-in session was already authorized", {
        code: "DEVICE_SESSION_ALREADY_AUTHORIZED",
        statusCode: 409
      });
    }

    record.status = "authorized";
    record.userId = input.userId;
    record.email = input.email || "";
    record.markSessionToken = input.markSessionToken;
    record.authorizedAt = nowIso();
    this.ensureProfile(input.userId, input.email || "");
    return clone(record);
  }

  async pollDeviceSession(deviceCodeHash) {
    const record = this.deviceSessions.get(deviceCodeHash);
    if (!record) {
      throw new HttpError("Device sign-in session was not found", {
        code: "DEVICE_SESSION_NOT_FOUND",
        statusCode: 404
      });
    }
    if (record.status === "pending" && new Date(record.expiresAt).getTime() <= Date.now()) {
      record.status = "expired";
    }
    return clone(record);
  }

  ensureProfile(userId, email) {
    if (!this.profiles.has(userId)) {
      this.profiles.set(userId, {
        id: userId,
        email: email || "",
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    } else if (email) {
      const profile = this.profiles.get(userId);
      profile.email = email;
      profile.updatedAt = nowIso();
    }
    return this.profiles.get(userId);
  }

  balanceForUser(userId) {
    return this.creditTransactions.reduce(function sum(total, transaction) {
      if (transaction.userId !== userId || transaction.status === "void") {
        return total;
      }
      return total + transaction.amountMinutes;
    }, 0);
  }

  async getAccount(user) {
    const profile = this.ensureProfile(user.id, user.email || "");
    return {
      user: {
        id: profile.id,
        email: profile.email
      },
      credits: {
        balanceMinutes: this.balanceForUser(user.id)
      },
      stripeCustomerId: this.stripeCustomers.get(user.id) || ""
    };
  }

  async getStripeCustomer(userId) {
    return this.stripeCustomers.get(userId) || "";
  }

  async upsertStripeCustomer(userId, customerId) {
    if (customerId) {
      this.stripeCustomers.set(userId, customerId);
    }
  }

  async grantCreditPack(input) {
    if (this.stripeWebhookEvents.has(input.stripeEventId)) {
      return {
        duplicate: true
      };
    }

    this.stripeWebhookEvents.set(input.stripeEventId, {
      id: input.stripeEventId,
      type: input.eventType || "checkout.session.completed",
      checkoutSessionId: input.checkoutSessionId,
      createdAt: nowIso()
    });

    const existing = this.creditTransactions.find(function same(transaction) {
      return transaction.referenceType === "stripe_checkout"
        && transaction.referenceId === input.checkoutSessionId
        && transaction.kind === "credit_pack";
    });
    if (!existing) {
      this.ensureProfile(input.userId, input.email || "");
      this.creditTransactions.push({
        id: uuid(),
        userId: input.userId,
        amountMinutes: input.minutes,
        kind: "credit_pack",
        status: "posted",
        description: input.packId,
        referenceType: "stripe_checkout",
        referenceId: input.checkoutSessionId,
        createdAt: nowIso()
      });
    }

    if (input.customerId) {
      await this.upsertStripeCustomer(input.userId, input.customerId);
    }

    return {
      duplicate: false,
      balanceMinutes: this.balanceForUser(input.userId)
    };
  }

  reserveCredits(userId, jobId, minutes, description) {
    const amount = Math.max(0, Math.floor(Number(minutes) || 0));
    if (amount === 0) {
      return;
    }
    const balance = this.balanceForUser(userId);
    if (balance < amount) {
      throw new HttpError("Buy more Mark credits to analyze this media", {
        code: "INSUFFICIENT_CREDITS",
        statusCode: 402,
        details: {
          balanceMinutes: balance,
          requiredMinutes: amount
        }
      });
    }
    this.creditTransactions.push({
      id: uuid(),
      userId,
      amountMinutes: -amount,
      kind: "analysis_reservation",
      status: "reserved",
      description: description || "Analysis reservation",
      referenceType: "analysis_job",
      referenceId: jobId,
      createdAt: nowIso()
    });
  }

  reservedMinutesForJob(jobId) {
    return -this.creditTransactions.reduce(function sum(total, transaction) {
      if (transaction.referenceType !== "analysis_job" || transaction.referenceId !== jobId) {
        return total;
      }
      if (transaction.kind !== "analysis_reservation" || transaction.status === "void") {
        return total;
      }
      return total + transaction.amountMinutes;
    }, 0);
  }

  actualMinutesForJob(jobId) {
    return this.analysisSegments.reduce(function sum(total, segment) {
      return segment.jobId === jobId ? total + segment.billableMinutes : total;
    }, 0);
  }

  async createAnalysisJob(input) {
    const id = uuid();
    this.ensureProfile(input.user.id, input.user.email || "");
    this.reserveCredits(input.user.id, id, input.estimatedMinutes, "Analysis reservation");
    const record = {
      id,
      userId: input.user.id,
      status: "reserved",
      outputMode: input.outputMode || "markers",
      prompt: input.prompt || "",
      request: input.request || {},
      estimatedMinutes: Math.max(0, Math.floor(Number(input.estimatedMinutes) || 0)),
      actualMinutes: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      completedAt: null,
      failedAt: null,
      errorCode: "",
      errorMessage: ""
    };
    this.analysisJobs.set(id, record);
    return clone(record);
  }

  async getAnalysisJob(jobId, userId) {
    const job = this.analysisJobs.get(jobId);
    if (!job || job.userId !== userId) {
      throw new HttpError("Analysis job was not found", {
        code: "ANALYSIS_JOB_NOT_FOUND",
        statusCode: 404
      });
    }
    return clone(job);
  }

  async reserveAdditionalCredits(jobId, userId, additionalMinutes) {
    const job = await this.getAnalysisJob(jobId, userId);
    this.reserveCredits(userId, jobId, additionalMinutes, "Additional analysis reservation");
    job.estimatedMinutes += Math.max(0, Math.floor(Number(additionalMinutes) || 0));
    job.updatedAt = nowIso();
    this.analysisJobs.set(jobId, job);
    return clone(job);
  }

  async recordAnalysisSegment(input) {
    await this.getAnalysisJob(input.jobId, input.userId);
    const record = {
      id: uuid(),
      jobId: input.jobId,
      userId: input.userId,
      segmentIndex: Number(input.segmentIndex) || 0,
      startSeconds: Number(input.startSeconds) || 0,
      durationSeconds: Number(input.durationSeconds) || 0,
      billableMinutes: Math.max(0, Math.floor(Number(input.billableMinutes) || 0)),
      resultCount: Math.max(0, Math.floor(Number(input.resultCount) || 0)),
      twelveLabsAssetId: input.twelveLabsAssetId || "",
      twelveLabsTaskId: input.twelveLabsTaskId || "",
      createdAt: nowIso()
    };
    this.analysisSegments.push(record);
    const job = this.analysisJobs.get(input.jobId);
    job.actualMinutes = this.actualMinutesForJob(input.jobId);
    job.updatedAt = nowIso();
    return clone(record);
  }

  async completeAnalysisJob(jobId, userId) {
    const job = await this.getAnalysisJob(jobId, userId);
    job.status = "completed";
    job.actualMinutes = this.actualMinutesForJob(jobId);
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    this.creditTransactions.forEach(function commit(transaction) {
      if (transaction.referenceType === "analysis_job" && transaction.referenceId === jobId && transaction.status === "reserved") {
        transaction.status = "posted";
      }
    });
    this.analysisJobs.set(jobId, job);
    return clone(job);
  }

  async failAnalysisJob(jobId, userId, error) {
    const job = await this.getAnalysisJob(jobId, userId);
    job.status = "failed";
    job.failedAt = nowIso();
    job.updatedAt = nowIso();
    job.errorCode = error && error.code || "ANALYSIS_FAILED";
    job.errorMessage = error && error.message || "Analysis failed";
    this.creditTransactions.forEach(function release(transaction) {
      if (transaction.referenceType === "analysis_job" && transaction.referenceId === jobId && transaction.status === "reserved") {
        transaction.status = "void";
      }
    });
    this.analysisJobs.set(jobId, job);
    return clone(job);
  }
}

module.exports = {
  MemoryStore
};
