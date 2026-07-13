import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProduct } from "@/lib/supabase/types";
import type { StripeCatalogRow } from "@/lib/stripe/catalog-types";
import {
  getStripeCatalogProduct,
  listStripeCatalog,
} from "@/lib/stripe/catalog";

import type { StripeCatalogItem } from "@/lib/admin/stripe-product-types";

export type { StripeCatalogItem };

export async function getStripeCatalogForAdmin(): Promise<StripeCatalogItem[]> {
  const [catalog, siteProducts] = await Promise.all([
    listStripeCatalog(),
    loadSiteProductsStripeIndex(),
  ]);

  return catalog.map((row) => {
    const linked = siteProducts.get(row.stripeProductId);
    return {
      ...row,
      linkedProductId: linked?.id ?? null,
      linkedProductTitle: linked?.title_bg ?? null,
    };
  });
}

async function loadSiteProductsStripeIndex(): Promise<Map<string, SiteProduct>> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("site_products")
    .select("*")
    .not("stripe_product_id", "is", null);

  const map = new Map<string, SiteProduct>();
  for (const row of (data as SiteProduct[]) ?? []) {
    const id = row.stripe_product_id?.trim();
    if (id) map.set(id, row);
  }
  return map;
}

export function siteProductRowFromStripeCatalog(
  catalog: StripeCatalogRow,
  sortOrder: number,
): Omit<SiteProduct, "id" | "created_at" | "updated_at"> {
  const title = catalog.name.trim() || "Продукт";
  const description = catalog.description?.trim() ?? "";
  const price = catalog.priceLabel.trim();

  return {
    title_bg: title,
    title_en: title,
    description_bg: description,
    description_en: description,
    stripe_url: "",
    stripe_product_id: catalog.stripeProductId,
    stripe_price_id: catalog.stripePriceId ?? "",
    price_label_bg: price,
    price_label_en: price,
    image_url: catalog.imageUrl,
    offer_type: "upsell",
    headline_bg: "",
    headline_en: "",
    cta_label_bg: "",
    cta_label_en: "",
    audience_tags: [],
    purchase_tags: [],
    enabled: false,
    sort_order: sortOrder,
  };
}

export async function refreshSiteProductFromStripe(
  stripeProductId: string,
): Promise<StripeCatalogRow | null> {
  return getStripeCatalogProduct(stripeProductId);
}
