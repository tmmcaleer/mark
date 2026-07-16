const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../src/server");
const { signSessionToken } = require("../src/auth");
const { handleStripeEvent, createCheckoutSession } = require("../src/billing");
const { MemoryStore } = require("../src/store/memory-store");
const { SupabaseStore } = require("../src/store/supabase-store");
const defaultConfig = require("../src/config");

function listen(app) {
  return new Promise(function start(resolve) {
    const server = app.listen(0, function onListen() {
      resolve(server);
    });
  });
}

function close(server) {
  return new Promise(function stop(resolve, reject) {
    server.close(function onClose(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function config() {
  return {
    appUrl: "http://localhost:4510",
    webAppUrl: "https://markmarks.app",
    corsOrigins: ["https://markmarks.app", "http://localhost:5173"],
    deviceSessionTtlSeconds: 600,
    sessionSecret: "test-session-secret",
    sessionTtlSeconds: 3600,
    supabaseUrl: "https://project.supabase.co",
    supabasePublishableKey: "sb_publishable_test",
    supabaseSecretKey: "",
    stripeSecretKey: "sk_test_mock",
    stripeWebhookSecret: "whsec_test",
    twelveLabsApiKey: "tl-test",
    twelveLabsBaseUrl: "https://api.twelvelabs.test",
    uploadDir: require("node:os").tmpdir(),
    creditPacks: [{
      id: "starter",
      label: "Starter",
      minutes: 60,
      amountCents: 499,
      currency: "usd",
      stripePriceId: "price_starter"
    }]
  };
}

test("default credit packs expose the production catalog without Stripe price ids", function () {
  assert.deepEqual(defaultConfig.creditPacks.map(function publicFields(pack) {
    return {
      id: pack.id,
      label: pack.label,
      minutes: pack.minutes,
      amountCents: pack.amountCents,
      currency: pack.currency
    };
  }), [{
    id: "starter",
    label: "Starter",
    minutes: 60,
    amountCents: 499,
    currency: "usd"
  }, {
    id: "studio",
    label: "Studio",
    minutes: 240,
    amountCents: 1499,
    currency: "usd"
  }, {
    id: "production",
    label: "Production",
    minutes: 600,
    amountCents: 3599,
    currency: "usd"
  }]);
});

function markToken(user) {
  return signSessionToken(user, {
    secret: config().sessionSecret,
    ttlSeconds: 3600
  });
}

test("device flow completes with a validated Supabase session", async function () {
  const store = new MemoryStore();
  const { app } = createApp({
    config: config(),
    store,
    supabaseAuth: {
      auth: {
        getUser: async function getUser(token) {
          assert.ok(["supabase-token", "other-supabase-token"].includes(token));
          return {
            data: {
              user: {
                id: token === "supabase-token"
                  ? "00000000-0000-4000-8000-000000000001"
                  : "00000000-0000-4000-8000-000000000002",
                email: token === "supabase-token" ? "editor@example.com" : "other@example.com"
              }
            },
            error: null
          };
        }
      }
    },
    analyzer: {
      analyzeFile: async function analyzeFile() {
        return {};
      }
    },
    stripe: null
  });
  const server = await listen(app);
  const port = server.address().port;

  try {
    const start = await fetch(`http://127.0.0.1:${port}/auth/device/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: "{}"
    });
    assert.equal(start.status, 201);
    const startBody = await start.json();
    assert.match(startBody.verificationUri, /^https:\/\/markmarks\.app\/auth\/device\?device_code=/);

    const complete = await fetch(`http://127.0.0.1:${port}/auth/device/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer supabase-token"
      },
      body: JSON.stringify({
        deviceCode: startBody.deviceCode
      })
    });
    assert.equal(complete.status, 200);

    const rebound = await fetch(`http://127.0.0.1:${port}/auth/device/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer other-supabase-token"
      },
      body: JSON.stringify({
        deviceCode: startBody.deviceCode
      })
    });
    assert.equal(rebound.status, 409);
    assert.equal((await rebound.json()).error.code, "DEVICE_SESSION_ALREADY_AUTHORIZED");

    const poll = await fetch(`http://127.0.0.1:${port}/auth/device/poll?deviceCode=${encodeURIComponent(startBody.deviceCode)}`);
    const pollBody = await poll.json();
    assert.equal(pollBody.status, "authorized");
    assert.ok(pollBody.markSessionToken);
  } finally {
    await close(server);
  }
});

test("checkout sessions use server-side pack price ids", async function () {
  const calls = [];
  const store = new MemoryStore();
  const stripe = {
    checkout: {
      sessions: {
        create: async function create(payload) {
          calls.push(payload);
          return {
            id: "cs_test_1",
            url: "https://checkout.stripe.test/session",
            customer: "cus_123"
          };
        }
      }
    }
  };

  const session = await createCheckoutSession({
    config: config(),
    store,
    stripe
  }, {
    id: "00000000-0000-4000-8000-000000000001",
    email: "editor@example.com"
  }, "starter");

  assert.equal(session.url, "https://checkout.stripe.test/session");
  assert.equal(calls[0].mode, "payment");
  assert.equal(calls[0].line_items[0].price, "price_starter");
  assert.equal(calls[0].metadata.creditMinutes, "60");
  assert.equal(calls[0].metadata.amountCents, "499");
  assert.equal(calls[0].metadata.currency, "usd");
  assert.equal(calls[0].metadata.packLabel, "Starter");
  assert.equal(calls[0].success_url, "https://markmarks.app/billing/success");
  assert.deepEqual(session.pack, {
    id: "starter",
    label: "Starter",
    minutes: 60,
    amountCents: 499,
    currency: "usd",
    displayPrice: "$4.99"
  });
});

test("browser account dashboard endpoints use Supabase sessions", async function () {
  const calls = [];
  const store = new MemoryStore();
  await store.grantCreditPack({
    userId: "00000000-0000-4000-8000-000000000001",
    email: "editor@example.com",
    minutes: 15,
    packId: "seed",
    stripeEventId: "evt_seed",
    checkoutSessionId: "cs_seed"
  });
  const stripe = {
    checkout: {
      sessions: {
        create: async function create(payload) {
          calls.push(payload);
          return {
            id: "cs_browser",
            url: "https://checkout.stripe.test/browser",
            customer: "cus_browser"
          };
        }
      }
    }
  };
  const { app } = createApp({
    config: config(),
    store,
    supabaseAuth: {
      auth: {
        getUser: async function getUser(token) {
          assert.equal(token, "supabase-browser-token");
          return {
            data: {
              user: {
                id: "00000000-0000-4000-8000-000000000001",
                email: "editor@example.com"
              }
            },
            error: null
          };
        }
      }
    },
    analyzer: {
      analyzeFile: async function analyzeFile() {
        return {};
      }
    },
    stripe
  });
  const server = await listen(app);
  const port = server.address().port;

  try {
    const account = await fetch(`http://127.0.0.1:${port}/browser/account`, {
      headers: {
        Authorization: "Bearer supabase-browser-token"
      }
    });
    assert.equal(account.status, 200);
    const accountBody = await account.json();
    assert.equal(accountBody.credits.balanceMinutes, 15);
    assert.equal(accountBody.creditPacks[0].id, "starter");
    assert.equal(accountBody.creditPacks[0].amountCents, 499);
    assert.equal(accountBody.creditPacks[0].currency, "usd");
    assert.equal(accountBody.creditPacks[0].displayPrice, "$4.99");
    assert.equal(Object.prototype.hasOwnProperty.call(accountBody.creditPacks[0], "stripePriceId"), false);

    const publicPacks = await fetch(`http://127.0.0.1:${port}/browser/credit-packs`);
    assert.equal(publicPacks.status, 200);
    assert.deepEqual((await publicPacks.json()).creditPacks, accountBody.creditPacks);

    const checkout = await fetch(`http://127.0.0.1:${port}/browser/billing/checkout-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer supabase-browser-token"
      },
      body: JSON.stringify({
        packId: "starter"
      })
    });
    assert.equal(checkout.status, 201);
    const checkoutBody = await checkout.json();
    assert.equal(checkoutBody.url, "https://checkout.stripe.test/browser");
    assert.equal(calls[0].success_url, "https://markmarks.app/billing/success");
    assert.equal(calls[0].cancel_url, "https://markmarks.app/billing/cancel");
  } finally {
    await close(server);
  }
});

test("cors allows configured web origins and rejects other browser origins", async function () {
  const { app } = createApp({
    config: config(),
    store: new MemoryStore(),
    analyzer: {
      analyzeFile: async function analyzeFile() {
        return {};
      }
    },
    stripe: null
  });
  const server = await listen(app);
  const port = server.address().port;

  try {
    for (const origin of ["https://markmarks.app", "http://localhost:5173"]) {
      const allowed = await fetch(`http://127.0.0.1:${port}/browser/credit-packs`, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "GET"
        }
      });
      assert.equal(allowed.headers.get("access-control-allow-origin"), origin);
    }

    const rejected = await fetch(`http://127.0.0.1:${port}/browser/credit-packs`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://untrusted.example",
        "Access-Control-Request-Method": "GET"
      }
    });
    assert.equal(rejected.headers.get("access-control-allow-origin"), null);
  } finally {
    await close(server);
  }
});

test("hosted auth and billing pages expose account flow copy", async function () {
  const { app } = createApp({
    config: config(),
    store: new MemoryStore(),
    analyzer: {
      analyzeFile: async function analyzeFile() {
        return {};
      }
    },
    stripe: null
  });
  const server = await listen(app);
  const port = server.address().port;

  try {
    const auth = await fetch(`http://127.0.0.1:${port}/auth/device?device_code=abc`);
    assert.equal(auth.status, 200);
    const authHtml = await auth.text();
    assert.match(authHtml, /Mark account/);
    assert.match(authHtml, /Buy credits/);
    assert.match(authHtml, /browser\/billing\/checkout-sessions/);

    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    const homeHtml = await home.text();
    assert.match(homeHtml, /Avid Media Composer/);
    assert.match(homeHtml, /analyzed-minute credit packs/);

    const success = await fetch(`http://127.0.0.1:${port}/billing/success`);
    assert.equal(success.status, 200);
    assert.match(await success.text(), /Payment received/);
  } finally {
    await close(server);
  }
});

test("stripe fulfillment is idempotent", async function () {
  const store = new MemoryStore();
  const deps = {
    config: config(),
    store
  };
  const event = {
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        customer: "cus_1",
        customer_details: {
          email: "editor@example.com"
        },
        metadata: {
          userId: "00000000-0000-4000-8000-000000000001",
          packId: "starter"
        }
      }
    }
  };

  const first = await handleStripeEvent(deps, event);
  const second = await handleStripeEvent(deps, event);
  const account = await store.getAccount({
    id: "00000000-0000-4000-8000-000000000001",
    email: "editor@example.com"
  });

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(account.credits.balanceMinutes, 60);
});

test("async Stripe fulfillment uses checkout-time credit metadata", async function () {
  const store = new MemoryStore();
  const userId = "00000000-0000-4000-8000-000000000001";
  const result = await handleStripeEvent({
    config: config(),
    store
  }, {
    id: "evt_async_1",
    type: "checkout.session.async_payment_succeeded",
    data: {
      object: {
        id: "cs_async_1",
        payment_status: "paid",
        customer: "cus_async_1",
        metadata: {
          userId,
          packId: "archived-pack",
          creditMinutes: "17",
          amountCents: "299",
          currency: "usd"
        }
      }
    }
  });
  const account = await store.getAccount({
    id: userId,
    email: "editor@example.com"
  });

  assert.equal(result.duplicate, false);
  assert.equal(account.credits.balanceMinutes, 17);
});

test("Supabase credit errors preserve the insufficient-credit API contract", async function () {
  const store = new SupabaseStore({
    rpc: async function rpc() {
      return {
        data: null,
        error: {
          code: "P0001",
          message: "Buy more Mark credits to analyze this media",
          hint: JSON.stringify({
            code: "INSUFFICIENT_CREDITS",
            balanceMinutes: 2,
            requiredMinutes: 5
          })
        }
      };
    }
  });

  await assert.rejects(store.createAnalysisJob({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "editor@example.com"
    },
    prompt: "faces",
    outputMode: "markers",
    estimatedMinutes: 5,
    request: {}
  }), function verify(error) {
    assert.equal(error.code, "INSUFFICIENT_CREDITS");
    assert.equal(error.statusCode, 402);
    assert.deepEqual(error.details, {
      balanceMinutes: 2,
      requiredMinutes: 5
    });
    return true;
  });
});

test("credit reservations prevent overspending", async function () {
  const store = new MemoryStore();
  await store.grantCreditPack({
    userId: "00000000-0000-4000-8000-000000000001",
    email: "editor@example.com",
    minutes: 2,
    packId: "tiny",
    stripeEventId: "evt_tiny",
    checkoutSessionId: "cs_tiny"
  });

  await store.createAnalysisJob({
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "editor@example.com"
    },
    outputMode: "markers",
    prompt: "faces",
    estimatedMinutes: 2,
    request: {}
  });

  await assert.rejects(
    store.createAnalysisJob({
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        email: "editor@example.com"
      },
      outputMode: "markers",
      prompt: "more faces",
      estimatedMinutes: 1,
      request: {}
    }),
    /Buy more Mark credits/
  );
});

test("analysis upload records billable minutes and completes the job", async function () {
  const store = new MemoryStore();
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "editor@example.com"
  };
  await store.grantCreditPack({
    userId: user.id,
    email: user.email,
    minutes: 10,
    packId: "starter",
    stripeEventId: "evt_analysis",
    checkoutSessionId: "cs_analysis"
  });

  const { app } = createApp({
    config: config(),
    store,
    probeDuration: async function probeDuration() {
      return 61;
    },
    analyzer: {
      analyzeFile: async function analyzeFile() {
        return {
          asset: {
            id: "asset_1"
          },
          task: {
            id: "task_1"
          },
          markers: [{
            startTime: 1,
            endTime: 2,
            name: "Face",
            comment: "Face appears"
          }]
        };
      }
    },
    stripe: null
  });
  const server = await listen(app);
  const port = server.address().port;
  const token = markToken(user);

  try {
    const create = await fetch(`http://127.0.0.1:${port}/analysis/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: "faces",
        outputMode: "markers",
        estimatedMinutes: 1
      })
    });
    assert.equal(create.status, 201);
    const job = await create.json();

    const form = new FormData();
    form.append("file", new Blob(["fake video"]), "segment.mp4");
    form.append("segment", JSON.stringify({
      index: 0,
      startSeconds: 0,
      durationSeconds: 30
    }));
    form.append("prompt", "faces");
    form.append("outputMode", "markers");

    const segment = await fetch(`http://127.0.0.1:${port}/analysis/jobs/${job.id}/segments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    assert.equal(segment.status, 200);
    const segmentBody = await segment.json();
    assert.equal(segmentBody.billableMinutes, 2);
    assert.equal(segmentBody.markers.length, 1);

    const complete = await fetch(`http://127.0.0.1:${port}/analysis/jobs/${job.id}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: "{}"
    });
    assert.equal(complete.status, 200);
    const account = await store.getAccount(user);
    assert.equal(account.credits.balanceMinutes, 8);
  } finally {
    await close(server);
  }
});
