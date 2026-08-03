import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillPurchase } from "@/lib/purchase/fulfill";
import { updatePurchaseStatusBySession } from "@/lib/purchase/status";
import { resolveLineItemsFromCheckoutSession } from "@/lib/stripe/resolve-products";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

function isSessionPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid";
}

async function handlePaidSession(session: Stripe.Checkout.Session) {
  if (!isSessionPaid(session)) {
    console.info("[stripe] skip fulfill — not paid yet", session.id, session.payment_status);
    return { ok: true, skipped: "not_paid" };
  }

  const email =
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    "";

  if (!email) {
    console.warn("[stripe] paid session without email", session.id);
    return { ok: true, skipped: "no_email" };
  }

  const lineItems = await resolveLineItemsFromCheckoutSession(session);
  if (lineItems.length === 0) {
    console.warn("[stripe] no mapped products for session", session.id);
    return { ok: true, skipped: "no_products" };
  }

  const locale = session.metadata?.locale === "en" ? "en" : "bg";
  const name = session.customer_details?.name ?? null;

  const result = await fulfillPurchase({
    email,
    name,
    locale,
    lineItems,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    amountCents: session.amount_total ?? null,
    currency: session.currency ?? null,
  });

  if (!result.ok) {
    console.error("[stripe] fulfillPurchase failed for session", session.id);
    return { ok: false, error: "fulfill_failed" };
  }

  return { ok: true };
}

async function handleFailedSession(session: Stripe.Checkout.Session) {
  const email =
    session.customer_details?.email?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    "";

  const lineItems = await resolveLineItemsFromCheckoutSession(session);
  if (lineItems.length === 0) {
    return { ok: true, skipped: "no_products" };
  }

  if (!email) {
    console.warn("[stripe] failed session without email", session.id);
    return { ok: true, skipped: "no_email" };
  }

  const result = await fulfillPurchase({
    email,
    locale: session.metadata?.locale === "en" ? "en" : "bg",
    lineItems,
    stripeSessionId: session.id,
    paymentStatus: "failed",
    amountCents: session.amount_total ?? null,
    currency: session.currency ?? null,
  });

  if (!result.ok) {
    console.error("[stripe] failed-session record failed", session.id);
    return { ok: false, error: "fulfill_failed" };
  }

  return { ok: true };
}

async function findSessionForPaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripe();
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  return sessions.data[0] ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Only fulfill when Stripe confirms payment. Async methods stay unpaid until
    // checkout.session.async_payment_succeeded.
    if (!isSessionPaid(session)) {
      return NextResponse.json({ ok: true, skipped: "awaiting_payment" });
    }
    const result = await handlePaidSession(session);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await handlePaidSession(session);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await handleFailedSession(session);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const isFullRefund =
      typeof charge.amount === "number" &&
      typeof charge.amount_refunded === "number" &&
      charge.amount_refunded >= charge.amount;

    if (!isFullRefund) {
      return NextResponse.json({ ok: true, skipped: "partial_refund" });
    }

    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (piId) {
      const session = await findSessionForPaymentIntent(piId);
      if (session) {
        const lineItems = await resolveLineItemsFromCheckoutSession(session);
        await updatePurchaseStatusBySession(session.id, "refunded", lineItems);

        const email =
          session.customer_details?.email?.trim().toLowerCase() ||
          session.customer_email?.trim().toLowerCase() ||
          charge.billing_details?.email?.trim().toLowerCase() ||
          charge.receipt_email?.trim().toLowerCase() ||
          "";
        if (email) {
          const { markContactUnpaidByEmail } = await import("@/lib/contacts/payment");
          await markContactUnpaidByEmail({
            email,
            stripeSessionId: session.id,
            amountCents: charge.amount_refunded ?? null,
            currency: charge.currency ?? null,
          });
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const sessionId =
      typeof intent.metadata?.checkout_session_id === "string"
        ? intent.metadata.checkout_session_id
        : null;
    if (sessionId) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (isSessionPaid(session)) {
        const result = await handlePaidSession(session);
        if (!result.ok) {
          return NextResponse.json(result, { status: 500 });
        }
        return NextResponse.json(result);
      }
    }
  }

  return NextResponse.json({ received: true });
}
