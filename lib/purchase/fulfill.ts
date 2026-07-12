import "server-only";

import { runAutomations } from "@/lib/automation/run";
import { getAdminClient } from "@/lib/supabase/admin";
import { ensureContactForSubscriber } from "@/lib/contacts/ensure";
import { syncContactAfterPurchase } from "@/lib/contacts/payment";
import type { ResolvedLineItem } from "@/lib/stripe/resolve-products";
import type { PurchasePaymentStatus } from "@/lib/purchase/status";
import type { Locale, SiteProduct } from "@/lib/supabase/types";

export type FulfillPurchaseInput = {
  email: string;
  name?: string | null;
  locale?: Locale;
  lineItems: ResolvedLineItem[];
  stripeSessionId: string;
  paymentStatus?: PurchasePaymentStatus;
  amountCents?: number | null;
  currency?: string | null;
};

function mergeTags(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat().filter(Boolean)));
}

async function upsertPurchaseRow(input: {
  subscriberId: string | null | undefined;
  email: string;
  item: ResolvedLineItem;
  stripeSessionId: string;
  paymentStatus: PurchasePaymentStatus;
}): Promise<void> {
  const supabase = getAdminClient();
  const row = {
    subscriber_id: input.subscriberId ?? null,
    email: input.email,
    product_id: input.item.internalProductId,
    stripe_session_id: input.stripeSessionId,
    stripe_price_id: input.item.stripePriceId || null,
    stripe_product_id: input.item.stripeProductId,
    payment_status: input.paymentStatus,
    amount_cents: input.item.amountCents,
    currency: input.item.currency,
    purchased_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("stripe_session_id", input.stripeSessionId)
    .eq("stripe_product_id", input.item.stripeProductId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriber_purchases")
      .update(row)
      .eq("id", (existing as { id: string }).id);
    if (error) console.error("[purchase] update failed:", error.message);
    return;
  }

  const { error } = await supabase.from("subscriber_purchases").insert(row);
  if (error && error.code !== "23505") {
    console.error("[purchase] insert failed:", error.message);
  }
}

/** Record purchase, tag subscriber, run purchase automations. */
export async function fulfillPurchase(input: FulfillPurchaseInput): Promise<{
  ok: boolean;
  productIds: string[];
  tags: string[];
}> {
  const email = input.email.trim().toLowerCase();
  const lineItems = input.lineItems.filter((i) => i.stripeProductId);
  const productIds = Array.from(
    new Set(
      lineItems
        .map((i) => i.internalProductId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!email || lineItems.length === 0) {
    return { ok: false, productIds: [], tags: [] };
  }

  const paymentStatus = input.paymentStatus ?? "paid";
  if (paymentStatus !== "paid") {
    for (const item of lineItems) {
      await upsertPurchaseRow({
        subscriberId: null,
        email,
        item,
        stripeSessionId: input.stripeSessionId,
        paymentStatus,
      });
    }
    return { ok: true, productIds, tags: [] };
  }

  const supabase = getAdminClient();
  const locale: Locale = input.locale === "en" ? "en" : "bg";

  const { data: productRows } = await supabase
    .from("site_products")
    .select("*")
    .in("id", productIds);

  const products = (productRows as SiteProduct[]) ?? [];
  const purchaseTags = mergeTags(
    ...products.map((p) => p.purchase_tags ?? []),
    productIds.map((id) => `product:${id}`),
  );

  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, tags, name, phone, locale")
    .eq("email", email)
    .maybeSingle();

  const isNew = !existing;
  let subscriberId = existing?.id as string | undefined;
  const priorTags = (existing?.tags as string[]) ?? [];
  const finalTags = mergeTags(priorTags, purchaseTags);

  if (existing) {
    await supabase
      .from("subscribers")
      .update({
        tags: finalTags,
        status: "subscribed",
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      })
      .eq("id", existing.id as string);
  } else {
    const { data: inserted } = await supabase
      .from("subscribers")
      .insert({
        email,
        name: input.name?.trim() || null,
        locale,
        source: "purchase",
        tags: finalTags,
        consent: true,
      })
      .select("id")
      .single();
    subscriberId = (inserted as { id: string } | null)?.id;
  }

  for (const item of lineItems) {
    await upsertPurchaseRow({
      subscriberId,
      email,
      item,
      stripeSessionId: input.stripeSessionId,
      paymentStatus: "paid",
    });
  }

  const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
    "@/lib/automation/cancel"
  );
  const { canceled } = await cancelIneligibleAutomationDeliveriesForSubscriber(
    email,
    finalTags,
  );
  if (canceled > 0) {
    console.info(
      `[purchase] canceled ${canceled} scheduled automation(s) for ${email}`,
    );
  }

  await runAutomations({
    email,
    name: input.name ?? (existing?.name as string | null) ?? null,
    phone: (existing?.phone as string | null) ?? null,
    locale: (existing?.locale as Locale) ?? locale,
    subscriberId: subscriberId ?? null,
    tags: finalTags,
    priorTags,
    isNew,
    source: "purchase",
    purchasedProductIds: productIds,
  });

  if (subscriberId) {
    await syncContactAfterPurchase({
      subscriberId,
      email,
      name: input.name ?? (existing?.name as string | null) ?? null,
      stripeSessionId: input.stripeSessionId,
      amountCents: input.amountCents,
      currency: input.currency,
      productIds,
      stripeProductIds: lineItems.map((i) => i.stripeProductId),
    });
  }

  return { ok: true, productIds, tags: finalTags };
}
