import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

/** All products this email has actually paid for (refunded/failed excluded). */
export async function loadPaidProductIds(email: string): Promise<string[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("subscriber_purchases")
    .select("product_id")
    .eq("email", normalized)
    .eq("payment_status", "paid");

  if (error) {
    console.error("[purchase] load history failed:", error.message);
    return [];
  }

  return Array.from(
    new Set(
      ((data as { product_id: string | null }[]) ?? [])
        .map((row) => row.product_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}
