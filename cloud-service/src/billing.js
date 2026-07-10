const Stripe = require("stripe");

const { HttpError } = require("./http-error");

function publicCreditPack(pack) {
  return {
    id: pack.id,
    label: pack.label,
    minutes: pack.minutes
  };
}

function findCreditPack(config, packId) {
  const pack = config.creditPacks.find(function match(candidate) {
    return candidate.id === packId;
  });
  if (!pack) {
    throw new HttpError("Unknown credit pack", {
      code: "UNKNOWN_CREDIT_PACK",
      statusCode: 400
    });
  }
  return pack;
}

function createStripeClient(config, options = {}) {
  if (options.stripe) {
    return options.stripe;
  }
  if (!config.stripeSecretKey) {
    return null;
  }
  return new Stripe(config.stripeSecretKey);
}

async function createCheckoutSession(deps, user, packId, urls = {}) {
  const pack = findCreditPack(deps.config, packId);
  if (!deps.stripe) {
    throw new HttpError("Stripe is not configured", {
      code: "STRIPE_NOT_CONFIGURED",
      statusCode: 503
    });
  }

  let customerId = await deps.store.getStripeCustomer(user.id);
  const createOptions = {
    mode: "payment",
    line_items: [{
      price: pack.stripePriceId,
      quantity: 1
    }],
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      packId: pack.id,
      creditMinutes: String(pack.minutes)
    },
    success_url: urls.successUrl || `${deps.config.appUrl}/billing/success`,
    cancel_url: urls.cancelUrl || `${deps.config.appUrl}/billing/cancel`,
    automatic_tax: {
      enabled: true
    }
  };

  if (customerId) {
    createOptions.customer = customerId;
  } else {
    createOptions.customer_email = user.email || undefined;
    createOptions.customer_creation = "always";
  }

  const session = await deps.stripe.checkout.sessions.create(createOptions);
  customerId = session.customer || customerId;
  if (customerId) {
    await deps.store.upsertStripeCustomer(user.id, customerId);
  }

  return {
    id: session.id,
    url: session.url,
    pack: publicCreditPack(pack)
  };
}

function constructWebhookEvent(deps, req) {
  if (!deps.stripe || !deps.config.stripeWebhookSecret) {
    throw new HttpError("Stripe webhook handling is not configured", {
      code: "STRIPE_WEBHOOK_NOT_CONFIGURED",
      statusCode: 503
    });
  }
  return deps.stripe.webhooks.constructEvent(
    req.body,
    req.headers["stripe-signature"],
    deps.config.stripeWebhookSecret
  );
}

async function handleStripeEvent(deps, event) {
  if (event.type !== "checkout.session.completed") {
    return {
      ignored: true
    };
  }

  const session = event.data.object;
  if (session.payment_status && session.payment_status !== "paid") {
    return {
      ignored: true,
      reason: "payment_not_paid"
    };
  }

  const metadata = session.metadata || {};
  const pack = findCreditPack(deps.config, metadata.packId);
  const userId = metadata.userId || session.client_reference_id;
  if (!userId) {
    throw new HttpError("Checkout session is missing Mark user metadata", {
      code: "CHECKOUT_USER_MISSING",
      statusCode: 400
    });
  }

  return deps.store.grantCreditPack({
    userId,
    email: session.customer_details && session.customer_details.email || session.customer_email || "",
    minutes: pack.minutes,
    packId: pack.id,
    stripeEventId: event.id,
    eventType: event.type,
    checkoutSessionId: session.id,
    customerId: typeof session.customer === "string" ? session.customer : ""
  });
}

module.exports = {
  constructWebhookEvent,
  createCheckoutSession,
  createStripeClient,
  findCreditPack,
  handleStripeEvent,
  publicCreditPack
};
