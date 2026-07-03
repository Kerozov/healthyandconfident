"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { X, ArrowUpRight, Sparkles, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { resolveOffer, resolveOfferHeadline, resolveOfferCta } from "@/lib/site/cta-placements";
import { isProductPlacementKey } from "@/lib/site/product-placement";
import {
  canBundleCheckout,
  openStripeUrl,
  startStripeCheckout,
} from "@/lib/site/stripe-checkout";

type PopupState = {
  offer: SiteProduct;
  headline: string;
  continueHref: string;
  baseProduct?: SiteProduct;
};

type OfferPopupContextValue = {
  tryOpenPlacement: (
    placementKey: string,
    continueHref: string,
    baseProduct?: SiteProduct,
  ) => boolean;
};

const OfferPopupContext = createContext<OfferPopupContextValue | null>(null);

export function useOfferPopup(): OfferPopupContextValue {
  const ctx = useContext(OfferPopupContext);
  if (!ctx) {
    throw new Error("useOfferPopup must be used within OfferPopupProvider");
  }
  return ctx;
}

function navigateTo(href: string, router: ReturnType<typeof useRouter>) {
  if (!href.trim()) return;
  if (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) {
    window.open(href, href.startsWith("http") ? "_blank" : "_self", "noopener,noreferrer");
    return;
  }
  router.push(href);
}

export function OfferPopupProvider({
  children,
  placements,
  offersById,
  locale,
}: {
  children: React.ReactNode;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
  locale: Locale;
}) {
  const router = useRouter();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [pending, startTransition] = useTransition();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const resolveForPlacement = useCallback(
    (
      placementKey: string,
      baseProduct?: SiteProduct,
    ): Omit<PopupState, "continueHref"> | null => {
      const placement = placements[placementKey];
      if (!placement?.offer_enabled) return null;

      const offer = resolveOffer(placement.offer_id, offersById);
      if (!offer) return null;

      const customHeadline =
        locale === "bg" ? placement.offer_headline_bg : placement.offer_headline_en;

      return {
        offer,
        headline: resolveOfferHeadline(locale, offer, customHeadline),
        baseProduct,
      };
    },
    [placements, offersById, locale],
  );

  const tryOpenPlacement = useCallback(
    (placementKey: string, continueHref: string, baseProduct?: SiteProduct): boolean => {
      let base = baseProduct;
      if (!base && isProductPlacementKey(placementKey)) {
        const productId = placementKey.replace(/^product_/, "");
        base = offersById[productId];
      }

      const resolved = resolveForPlacement(placementKey, base);
      if (!resolved) return false;
      setCheckoutError(null);
      setPopup({ ...resolved, continueHref });
      return true;
    },
    [resolveForPlacement, offersById],
  );

  const ctx = useMemo(() => ({ tryOpenPlacement }), [tryOpenPlacement]);

  function close(andContinue = false) {
    const href = popup?.continueHref;
    setPopup(null);
    setCheckoutError(null);
    if (andContinue && href) navigateTo(href, router);
  }

  function checkoutProducts(productIds: string[], onFallback?: () => void) {
    setCheckoutError(null);
    startTransition(async () => {
      try {
        await startStripeCheckout(productIds, locale);
        setPopup(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Checkout failed";
        setCheckoutError(message);
        onFallback?.();
      }
    });
  }

  const offer = popup?.offer;
  const baseProduct = popup?.baseProduct;
  const bundleReady = baseProduct ? canBundleCheckout(baseProduct, offer) : false;

  const title = offer ? (locale === "bg" ? offer.title_bg : offer.title_en) : "";
  const baseTitle = baseProduct
    ? locale === "bg"
      ? baseProduct.title_bg
      : baseProduct.title_en
    : "";
  const description = offer
    ? locale === "bg"
      ? offer.description_bg
      : offer.description_en
    : "";
  const price = offer
    ? locale === "bg"
      ? offer.price_label_bg
      : offer.price_label_en
    : "";
  const basePrice = baseProduct
    ? locale === "bg"
      ? baseProduct.price_label_bg
      : baseProduct.price_label_en
    : "";
  const offerCta = offer ? resolveOfferCta(locale, offer) : "";
  const offerUrl = offer?.stripe_url?.trim() ?? "";
  const baseUrl = baseProduct?.stripe_url?.trim() ?? "";

  function acceptBundle() {
    if (!offer || !baseProduct) return;
    if (bundleReady) {
      checkoutProducts([baseProduct.id, offer.id]);
      return;
    }
    if (offerUrl) openStripeUrl(offerUrl);
  }

  function declineToBaseOnly() {
    if (!baseProduct) {
      close(true);
      return;
    }
    if (canBundleCheckout(baseProduct)) {
      checkoutProducts([baseProduct.id]);
      return;
    }
    if (baseUrl) {
      setPopup(null);
      openStripeUrl(baseUrl);
      return;
    }
    close(true);
  }

  return (
    <OfferPopupContext.Provider value={ctx}>
      {children}

      {popup && offer && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-forest-900/55 p-4 backdrop-blur-sm sm:items-center">
          <div
            className="animate-fade-up relative w-full max-w-lg overflow-hidden rounded-3xl bg-cream-50 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-popup-title"
          >
            <button
              type="button"
              onClick={() => close(true)}
              disabled={pending}
              aria-label={locale === "bg" ? "Затвори" : "Close"}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-forest-800/5 text-forest-800 transition-colors hover:bg-forest-800/10 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="bg-slate-800 px-7 py-6 text-white">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-300">
                <Sparkles className="h-4 w-4" />
                {popup.headline}
              </p>
              <h3
                id="offer-popup-title"
                className="mt-2 font-display text-2xl font-semibold leading-tight"
              >
                {title}
              </h3>
              {price && (
                <p className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                  {price}
                </p>
              )}
            </div>

            <div className="px-7 py-6">
              {description && (
                <p className="text-sm leading-relaxed text-forest-800">{description}</p>
              )}

              {baseProduct && bundleReady && basePrice && price && (
                <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-slate-800">
                  {locale === "bg" ? "Общо в Stripe:" : "Stripe total:"}{" "}
                  <strong>
                    {basePrice} + {price}
                  </strong>
                </p>
              )}

              {checkoutError && (
                <p className="mt-4 text-sm text-rose-700">{checkoutError}</p>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {baseProduct ? (
                  <>
                    <button
                      type="button"
                      onClick={acceptBundle}
                      disabled={pending}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-forest-900 transition-colors hover:bg-gold-500 disabled:opacity-60"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                      {locale === "bg"
                        ? `Да, искам и двете — към Stripe`
                        : `Yes, both — go to Stripe`}
                    </button>
                    <button
                      type="button"
                      onClick={declineToBaseOnly}
                      disabled={pending}
                      className="inline-flex h-12 items-center justify-center rounded-lg border border-forest-100 bg-white px-6 text-sm font-semibold text-slate-800 hover:bg-cream disabled:opacity-60"
                    >
                      {locale === "bg"
                        ? `Не, само „${baseTitle}“`
                        : `No, just “${baseTitle}”`}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {offerUrl ? (
                      <a
                        href={offerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-forest-900 transition-colors hover:bg-gold-500"
                      >
                        {offerCta}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => close(true)}
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-forest-100 bg-white px-6 text-sm font-semibold text-slate-800 hover:bg-cream"
                    >
                      {locale === "bg" ? "Не, благодаря" : "No thanks"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </OfferPopupContext.Provider>
  );
}
