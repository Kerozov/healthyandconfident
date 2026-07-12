import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { ResolvedLineItem } from "@/lib/stripe/resolve-products";

export type PurchasePaymentStatus = "paid" | "refunded" | "failed";

export async function updatePurchaseStatusBySession(
  stripeSessionId: string,
  paymentStatus: PurchasePaymentStatus,
  lineItems?: ResolvedLineItem[],
): Promise<number> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();

  if (lineItems && lineItems.length > 0) {
    let updated = 0;
    for (const item of lineItems) {
      const { data, error } = await supabase
        .from("subscriber_purchases")
        .update({ payment_status: paymentStatus, purchased_at: now })
        .eq("stripe_session_id", stripeSessionId)
        .eq("stripe_product_id", item.stripeProductId)
        .select("id");

      if (error) {
        console.error("[purchase] status update failed:", error.message);
        continue;
      }
      updated += (data as { id: string }[] | null)?.length ?? 0;
    }
    return updated;
  }

  const { data, error } = await supabase
    .from("subscriber_purchases")
    .update({ payment_status: paymentStatus, purchased_at: now })
    .eq("stripe_session_id", stripeSessionId)
    .select("id");

  if (error) {
    console.error("[purchase] bulk status update failed:", error.message);
    return 0;
  }

  return (data as { id: string }[] | null)?.length ?? 0;
}
