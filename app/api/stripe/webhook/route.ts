import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillPurchase } from "@/lib/purchase/fulfill";
import { resolveProductIdsFromCheckoutSession } from "@/lib/stripe/resolve-products";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

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

    const email =
      session.customer_details?.email?.trim().toLowerCase() ||
      session.customer_email?.trim().toLowerCase() ||
      "";

    if (!email) {
      console.warn("[stripe] checkout.session.completed without email", session.id);
      return NextResponse.json({ ok: true, skipped: "no_email" });
    }

    const { productIds, priceIds } = await resolveProductIdsFromCheckoutSession(session);
    if (productIds.length === 0) {
      console.warn("[stripe] no mapped products for session", session.id);
      return NextResponse.json({ ok: true, skipped: "no_products" });
    }

    const locale = session.metadata?.locale === "en" ? "en" : "bg";
    const name = session.customer_details?.name ?? null;

    await fulfillPurchase({
      email,
      name,
      locale,
      productIds,
      stripeSessionId: session.id,
      stripePriceIds: priceIds,
    });
  }

  return NextResponse.json({ received: true });
}
