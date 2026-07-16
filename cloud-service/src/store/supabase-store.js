const { HttpError } = require("../http-error");

function parseErrorHint(error) {
  if (!error || !error.hint) {
    return null;
  }
  try {
    const parsed = JSON.parse(error.hint);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (parseError) {
    return null;
  }
}

function requireData(data, error) {
  if (error) {
    const hint = parseErrorHint(error);
    if ((hint && hint.code === "INSUFFICIENT_CREDITS") || /Buy more Mark credits/i.test(error.message || "")) {
      throw new HttpError(error.message || "Buy more Mark credits to analyze this media", {
        code: "INSUFFICIENT_CREDITS",
        statusCode: 402,
        details: hint ? {
          balanceMinutes: Number(hint.balanceMinutes) || 0,
          requiredMinutes: Number(hint.requiredMinutes) || 0
        } : undefined
      });
    }
    throw new HttpError(error.message, {
      code: error.code || "SUPABASE_ERROR",
      statusCode: 500,
      details: error
    });
  }
  return data;
}

function notFound(message) {
  return new HttpError(message, {
    code: "NOT_FOUND",
    statusCode: 404
  });
}

class SupabaseStore {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async createDeviceSession(session) {
    const { data, error } = await this.supabase
      .from("device_sessions")
      .insert({
        device_code_hash: session.deviceCodeHash,
        user_code: session.userCode,
        status: "pending",
        expires_at: session.expiresAt
      })
      .select("*")
      .single();
    return requireData(data, error);
  }

  async completeDeviceSession(input) {
    const existing = await this.pollDeviceSession(input.deviceCodeHash);
    if (existing.status === "expired") {
      throw new HttpError("Device sign-in session expired", {
        code: "DEVICE_SESSION_EXPIRED",
        statusCode: 410
      });
    }
    if (existing.status !== "pending") {
      throw new HttpError("Device sign-in session was already authorized", {
        code: "DEVICE_SESSION_ALREADY_AUTHORIZED",
        statusCode: 409
      });
    }

    await this.ensureProfile(input.userId, input.email || "");
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("device_sessions")
      .update({
        status: "authorized",
        user_id: input.userId,
        email: input.email || "",
        mark_session_token: input.markSessionToken,
        authorized_at: now
      })
      .eq("device_code_hash", input.deviceCodeHash)
      .eq("status", "pending")
      .gt("expires_at", now)
      .select("*")
      .maybeSingle();
    requireData(data, error);
    if (!data) {
      const latest = await this.pollDeviceSession(input.deviceCodeHash);
      if (latest.status === "expired") {
        throw new HttpError("Device sign-in session expired", {
          code: "DEVICE_SESSION_EXPIRED",
          statusCode: 410
        });
      }
      throw new HttpError("Device sign-in session was already authorized", {
        code: "DEVICE_SESSION_ALREADY_AUTHORIZED",
        statusCode: 409
      });
    }
    return data;
  }

  async pollDeviceSession(deviceCodeHash) {
    const { data, error } = await this.supabase
      .from("device_sessions")
      .select("*")
      .eq("device_code_hash", deviceCodeHash)
      .single();
    if (error) {
      throw notFound("Device sign-in session was not found");
    }
    if (data.status === "pending" && new Date(data.expires_at).getTime() <= Date.now()) {
      const updated = await this.supabase
        .from("device_sessions")
        .update({ status: "expired" })
        .eq("id", data.id)
        .eq("status", "pending")
        .select("*")
        .maybeSingle();
      requireData(updated.data, updated.error);
      return updated.data || this.pollDeviceSession(deviceCodeHash);
    }
    return data;
  }

  async ensureProfile(userId, email) {
    const { data, error } = await this.supabase
      .from("profiles")
      .upsert({
        id: userId,
        email: email || "",
        updated_at: new Date().toISOString()
      }, {
        onConflict: "id"
      })
      .select("*")
      .single();
    return requireData(data, error);
  }

  async getAccount(user) {
    const profile = await this.ensureProfile(user.id, user.email || "");
    const balance = await this.supabase.rpc("mark_credit_balance", {
      p_user_id: user.id
    });
    requireData(balance.data, balance.error);
    const stripeCustomerId = await this.getStripeCustomer(user.id);
    return {
      user: {
        id: profile.id,
        email: profile.email || user.email || ""
      },
      credits: {
        balanceMinutes: Number(balance.data) || 0
      },
      stripeCustomerId
    };
  }

  async getStripeCustomer(userId) {
    const { data, error } = await this.supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new HttpError(error.message, {
        code: error.code || "SUPABASE_ERROR",
        statusCode: 500
      });
    }
    return data && data.stripe_customer_id || "";
  }

  async upsertStripeCustomer(userId, customerId) {
    if (!customerId) {
      return;
    }
    const { error } = await this.supabase
      .from("stripe_customers")
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      });
    requireData(true, error);
  }

  async grantCreditPack(input) {
    const { data, error } = await this.supabase.rpc("mark_grant_credit_pack", {
      p_user_id: input.userId,
      p_email: input.email || "",
      p_minutes: input.minutes,
      p_pack_id: input.packId,
      p_stripe_event_id: input.stripeEventId,
      p_stripe_event_type: input.eventType || "checkout.session.completed",
      p_checkout_session_id: input.checkoutSessionId,
      p_customer_id: input.customerId || ""
    });
    return requireData(data, error);
  }

  async createAnalysisJob(input) {
    const { data, error } = await this.supabase.rpc("mark_create_analysis_job", {
      p_user_id: input.user.id,
      p_email: input.user.email || "",
      p_prompt: input.prompt || "",
      p_output_mode: input.outputMode || "markers",
      p_estimated_minutes: input.estimatedMinutes,
      p_request: input.request || {}
    });
    return requireData(data, error);
  }

  async getAnalysisJob(jobId, userId) {
    const { data, error } = await this.supabase
      .from("analysis_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();
    if (error) {
      throw notFound("Analysis job was not found");
    }
    return data;
  }

  async reserveAdditionalCredits(jobId, userId, additionalMinutes) {
    const { data, error } = await this.supabase.rpc("mark_reserve_additional_credits", {
      p_job_id: jobId,
      p_user_id: userId,
      p_additional_minutes: additionalMinutes
    });
    return requireData(data, error);
  }

  async recordAnalysisSegment(input) {
    const { data, error } = await this.supabase
      .from("analysis_segments")
      .insert({
        job_id: input.jobId,
        user_id: input.userId,
        segment_index: input.segmentIndex,
        start_seconds: input.startSeconds,
        duration_seconds: input.durationSeconds,
        billable_minutes: input.billableMinutes,
        result_count: input.resultCount,
        twelvelabs_asset_id: input.twelveLabsAssetId || "",
        twelvelabs_task_id: input.twelveLabsTaskId || ""
      })
      .select("*")
      .single();
    const segment = requireData(data, error);
    const totals = await this.supabase
      .from("analysis_segments")
      .select("billable_minutes")
      .eq("job_id", input.jobId)
      .eq("user_id", input.userId);
    const totalMinutes = requireData(totals.data, totals.error).reduce(function sum(total, row) {
      return total + (Number(row.billable_minutes) || 0);
    }, 0);
    const update = await this.supabase
      .from("analysis_jobs")
      .update({
        actual_minutes: totalMinutes,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.jobId)
      .eq("user_id", input.userId);
    requireData(true, update.error);
    return segment;
  }

  async completeAnalysisJob(jobId, userId) {
    const { data, error } = await this.supabase.rpc("mark_complete_analysis_job", {
      p_job_id: jobId,
      p_user_id: userId
    });
    return requireData(data, error);
  }

  async failAnalysisJob(jobId, userId, errorInfo) {
    const { data, error } = await this.supabase.rpc("mark_fail_analysis_job", {
      p_job_id: jobId,
      p_user_id: userId,
      p_error_code: errorInfo && errorInfo.code || "ANALYSIS_FAILED",
      p_error_message: errorInfo && errorInfo.message || "Analysis failed"
    });
    return requireData(data, error);
  }
}

module.exports = {
  SupabaseStore
};
