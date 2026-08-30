import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProduct } from "@/lib/supabase/types";
import { getStripeCatalogProduct } from "@/lib/stripe/catalog";
import type { StripeCatalogRow } from "@/lib/stripe/catalog-types";
import {
  expandEmailProductMarkers,
  extractProductIdsFromHtml,
  extractStripeProductIdsFromHtml,
} from "@/lib/email/products-block";

export async function expandEmailProducts(
  html: string,
  locale: "bg" | "en",
): Promise<string> {
  const siteIds = extractProductIdsFromHtml(html);
  const stripeIds = extractStripeProductIdsFromHtml(html);
  if (siteIds.length === 0 && stripeIds.length === 0) return html;

  const [byId, stripeById] = await Promise.all([
    loadSiteProducts(siteIds),
    loadStripeCatalogProducts(stripeIds),
  ]);

  return expandEmailProductMarkers(html, byId, locale, stripeById);
}

async function loadSiteProducts(
  ids: string[],
): Promise<Map<string, SiteProduct>> {
  if (ids.length === 0) return new Map();
  const supabase = getAdminClient();
  const { data } = await supabase.from("site_products").select("*").in("id", ids);
  const products = (data as SiteProduct[]) ?? [];
  return new Map(products.map((product) => [product.id.toLowerCase(), product]));
}

async function loadStripeCatalogProducts(
  ids: string[],
): Promise<Map<string, StripeCatalogRow>> {
  const byId = new Map<string, StripeCatalogRow>();
  if (ids.length === 0) return byId;

  await Promise.all(
    ids.map(async (id) => {
      try {
        const row = await getStripeCatalogProduct(id);
        if (row) byId.set(row.stripeProductId, row);
      } catch (err) {
        console.warn(
          "[email] Stripe product unavailable:",
          id,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );
  return byId;
}
