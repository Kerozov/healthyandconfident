import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillPurchase } from "@/lib/purchase/fulfill";
import { updatePurchaseStatusBySession } from "@/lib/purchase/status";
import { resolveLineItemsFromCheckoutSession } from "@/lib/stripe/resolve-products";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

async function handlePaidSession(session: Stripe.Checkout.Session) {
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

  await fulfillPurchase({
    email,
    name,
    locale,
    lineItems,
    stripeSessionId: session.id,
    paymentStatus: "paid",
    amountCents: session.amount_total ?? null,
    currency: session.currency ?? null,
  });

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

  await fulfillPurchase({
    email: email || "unknown@stripe.local",
    locale: session.metadata?.locale === "en" ? "en" : "bg",
    lineItems,
    stripeSessionId: session.id,
    paymentStatus: "failed",
    amountCents: session.amount_total ?? null,
    currency: session.currency ?? null,
  });

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
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ ok: true, skipped: "not_paid" });
    }
    const result = await handlePaidSession(session);
    return NextResponse.json(result);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await handleFailedSession(session);
    return NextResponse.json(result);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const piId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (piId) {
      const session = await findSessionForPaymentIntent(piId);
      if (session) {
        const lineItems = await resolveLineItemsFromCheckoutSession(session);
        await updatePurchaseStatusBySession(session.id, "refunded", lineItems);
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
      if (session.payment_status === "paid") {
        const result = await handlePaidSession(session);
        return NextResponse.json(result);
      }
    }
  }

  return NextResponse.json({ received: true });
}
