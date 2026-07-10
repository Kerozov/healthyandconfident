import "server-only";

import { runAutomations } from "@/lib/automation/run";
import { getAdminClient } from "@/lib/supabase/admin";
import { ensureContactForSubscriber } from "@/lib/contacts/ensure";
import { syncContactAfterPurchase } from "@/lib/contacts/payment";
import type { Locale, SiteProduct } from "@/lib/supabase/types";

export type FulfillPurchaseInput = {
  email: string;
  name?: string | null;
  locale?: Locale;
  productIds: string[];
  stripeSessionId: string;
  stripePriceIds?: string[];
  amountCents?: number | null;
  currency?: string | null;
};

function mergeTags(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat().filter(Boolean)));
}

/** Record purchase, tag subscriber, run purchase automations. */
export async function fulfillPurchase(input: FulfillPurchaseInput): Promise<{
  ok: boolean;
  productIds: string[];
  tags: string[];
}> {
  const email = input.email.trim().toLowerCase();
  const productIds = Array.from(new Set(input.productIds.filter(Boolean)));
  if (!email || productIds.length === 0) {
    return { ok: false, productIds: [], tags: [] };
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

  const priceIds = input.stripePriceIds ?? [];
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i]!;
    const stripePriceId = priceIds[i] ?? null;
    const { error: purchaseError } = await supabase
      .from("subscriber_purchases")
      .insert({
        subscriber_id: subscriberId ?? null,
        email,
        product_id: productId,
        stripe_session_id: input.stripeSessionId,
        stripe_price_id: stripePriceId,
        purchased_at: new Date().toISOString(),
      });
    if (purchaseError && purchaseError.code !== "23505") {
      console.error("[purchase] record failed:", purchaseError.message);
    }
  }

  await runAutomations({
    email,
    name: input.name ?? (existing?.name as string | null) ?? null,
    phone: (existing?.phone as string | null) ?? null,
    locale: (existing?.locale as Locale) ?? locale,
    subscriberId: subscriberId ?? null,
    tags: finalTags,
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
    });
  }

  return { ok: true, productIds, tags: finalTags };
}
