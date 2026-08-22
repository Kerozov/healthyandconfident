"use client";

import { useCallback } from "react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { productPlacementKey } from "@/lib/site/product-placement";
import {
  productCanBeBought,
  productStripeForLocale,
} from "@/lib/site/product-locale";
import { openStripeUrl, startStripeCheckout } from "@/lib/site/stripe-checkout";
import { useOfferPopup } from "@/components/site/offer-popup";

export function canBuyProduct(product: SiteProduct, locale: Locale): boolean {
  return productCanBeBought(product, locale);
}

/**
 * The single way a product gets bought on the site — shop grid, program pages
 * and the landing page email links point at. Runs the configured offer first,
 * then falls through to checkout so every product is upsellable from anywhere.
 */
export function useProductCheckout(locale: Locale) {
  const { tryOpenPlacement } = useOfferPopup();

  return useCallback(
    async (product: SiteProduct): Promise<void> => {
      const placementKey = productPlacementKey(product.id);
      const stripe = productStripeForLocale(product, locale);
      const checkoutUrl = stripe.stripe_url;
      const hasSiteCheckout = Boolean(stripe.stripe_price_id);

      if (hasSiteCheckout) {
        if (!tryOpenPlacement(placementKey, `site-checkout:${product.id}`, product)) {
          await startStripeCheckout([product.id], locale);
        }
        return;
      }
      if (checkoutUrl) {
        if (!tryOpenPlacement(placementKey, checkoutUrl, product)) {
          openStripeUrl(checkoutUrl, [product.id]);
        }
      }
    },
    [tryOpenPlacement, locale],
  );
}
