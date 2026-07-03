import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProduct } from "@/lib/supabase/types";
import {
  expandEmailProductMarkers,
  extractProductIdsFromHtml,
} from "@/lib/email/products-block";

export async function expandEmailProducts(
  html: string,
  locale: "bg" | "en",
): Promise<string> {
  const ids = extractProductIdsFromHtml(html);
  if (ids.length === 0) return html;

  const supabase = getAdminClient();
  const { data } = await supabase.from("site_products").select("*").in("id", ids);
  const products = (data as SiteProduct[]) ?? [];
  const byId = new Map(products.map((product) => [product.id.toLowerCase(), product]));

  return expandEmailProductMarkers(html, byId, locale);
}
