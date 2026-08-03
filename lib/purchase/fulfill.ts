import "server-only";

import { runAutomations } from "@/lib/automation/run";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncContactAfterPurchase } from "@/lib/contacts/payment";
import type { ResolvedLineItem } from "@/lib/stripe/resolve-products";
import type { PurchasePaymentStatus } from "@/lib/purchase/status";
import type { Locale, SiteGuide, SiteProduct } from "@/lib/supabase/types";

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
    if (error) {
      throw new Error(`[purchase] update failed: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase.from("subscriber_purchases").insert(row);
  if (!error) return;

  if (error.code === "23505") {
    // Concurrent webhook — update the row that won the insert race.
    const { error: raceError } = await supabase
      .from("subscriber_purchases")
      .update(row)
      .eq("stripe_session_id", input.stripeSessionId)
      .eq("stripe_product_id", input.item.stripeProductId);
    if (raceError) {
      throw new Error(`[purchase] race update failed: ${raceError.message}`);
    }
    return;
  }

  throw new Error(`[purchase] insert failed: ${error.message}`);
}

/** Record purchase, apply purchase segments, run purchase automations. */
export async function fulfillPurchase(input: FulfillPurchaseInput): Promise<{
  ok: boolean;
  productIds: string[];
  guideIds: string[];
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
  const guideIds = Array.from(
    new Set(
      lineItems
        .map((i) => i.internalGuideId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (!email || lineItems.length === 0) {
    return { ok: false, productIds: [], guideIds: [], tags: [] };
  }

  const paymentStatus = input.paymentStatus ?? "paid";
  if (paymentStatus !== "paid") {
    try {
      for (const item of lineItems) {
        await upsertPurchaseRow({
          subscriberId: null,
          email,
          item,
          stripeSessionId: input.stripeSessionId,
          paymentStatus,
        });
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      return { ok: false, productIds, guideIds, tags: [] };
    }
    return { ok: true, productIds, guideIds, tags: [] };
  }

  const supabase = getAdminClient();
  const locale: Locale = input.locale === "en" ? "en" : "bg";

  const [{ data: productRows }, { data: guideRows }] = await Promise.all([
    productIds.length > 0
      ? supabase.from("site_products").select("*").in("id", productIds)
      : Promise.resolve({ data: [] as SiteProduct[] }),
    guideIds.length > 0
      ? supabase.from("site_guides").select("*").in("id", guideIds)
      : Promise.resolve({ data: [] as SiteGuide[] }),
  ]);

  const products = (productRows as SiteProduct[]) ?? [];
  const guides = (guideRows as SiteGuide[]) ?? [];
  const purchaseTags = mergeTags(
    ...products.map((p) => p.purchase_tags ?? []),
    ...guides.map((g) => g.purchase_tags ?? []),
    productIds.map((id) => `product:${id}`),
    guideIds.map((id) => `guide:${id}`),
  );

  let { data: existing } = await supabase
    .from("subscribers")
    .select("id, tags, name, phone, locale")
    .eq("email", email)
    .maybeSingle();

  let isNew = !existing;
  let subscriberId = existing?.id as string | undefined;
  let priorTags = (existing?.tags as string[]) ?? [];
  let finalTags = mergeTags(priorTags, purchaseTags);

  if (existing) {
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({
        tags: finalTags,
        status: "subscribed",
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      })
      .eq("id", existing.id as string);
    if (updateError) {
      console.error("[purchase] subscriber update failed:", updateError.message);
      return { ok: false, productIds, guideIds, tags: [] };
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
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

    if (insertError?.code === "23505") {
      // Concurrent webhook/signup — load winner and merge purchase tags.
      const { data: raced } = await supabase
        .from("subscribers")
        .select("id, tags, name, phone, locale")
        .eq("email", email)
        .maybeSingle();
      if (!raced) {
        console.error("[purchase] subscriber race: duplicate but row missing");
        return { ok: false, productIds, guideIds, tags: [] };
      }
      existing = raced;
      isNew = false;
      subscriberId = raced.id as string;
      priorTags = (raced.tags as string[]) ?? [];
      finalTags = mergeTags(priorTags, purchaseTags);
      const { error: raceUpdateError } = await supabase
        .from("subscribers")
        .update({
          tags: finalTags,
          status: "subscribed",
          ...(input.name?.trim() ? { name: input.name.trim() } : {}),
        })
        .eq("id", subscriberId);
      if (raceUpdateError) {
        console.error("[purchase] subscriber race update failed:", raceUpdateError.message);
        return { ok: false, productIds, guideIds, tags: [] };
      }
    } else if (insertError || !inserted) {
      console.error(
        "[purchase] subscriber insert failed:",
        insertError?.message ?? "no row",
      );
      return { ok: false, productIds, guideIds, tags: [] };
    } else {
      subscriberId = (inserted as { id: string }).id;
    }
  }

  try {
    for (const item of lineItems) {
      await upsertPurchaseRow({
        subscriberId,
        email,
        item,
        stripeSessionId: input.stripeSessionId,
        paymentStatus: "paid",
      });
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return { ok: false, productIds, guideIds, tags: [] };
  }

  const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
    "@/lib/automation/cancel"
  );
  const { canceled, failed } = await cancelIneligibleAutomationDeliveriesForSubscriber(
    email,
    finalTags,
  );
  if (canceled > 0 || failed > 0) {
    console.info(
      `[purchase] canceled ${canceled} scheduled automation(s) for ${email}` +
        (failed > 0 ? ` (${failed} cancel failed)` : ""),
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

  return { ok: true, productIds, guideIds, tags: finalTags };
}
