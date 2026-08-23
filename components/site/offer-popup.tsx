"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { ModalCloseButton } from "@/components/site/modal-close-button";
import {
  resolveOfferCta,
  resolvePlacementOffers,
  type ResolvedOffer,
} from "@/lib/site/cta-placements";
import { isProductPlacementKey } from "@/lib/site/product-placement";
import {
  canBundleCheckout,
  openStripeUrl,
  startPlacementCheckout,
  startStripeCheckout,
} from "@/lib/site/stripe-checkout";
import { productStripeForLocale } from "@/lib/site/product-locale";

type PopupState = {
  /** Which of the two offers is on screen right now. */
  step: "upsell" | "downsell";
  upsell: ResolvedOffer | null;
  downsell: ResolvedOffer | null;
  continueHref: string;
  baseProduct?: SiteProduct;
};

type OfferPopupContextValue = {
  /** Returns false when there is nothing to show — caller continues on its own. */
  tryOpenPlacement: (
    placementKey: string,
    continueHref: string,
    baseProduct?: SiteProduct,
  ) => boolean;
  placements: Record<string, SiteCtaPlacement>;
  locale: Locale;
};

const OfferPopupContext = createContext<OfferPopupContextValue | null>(null);

export function useOfferPopup(): OfferPopupContextValue {
  const ctx = useContext(OfferPopupContext);
  if (!ctx) {
    throw new Error("useOfferPopup must be used within OfferPopupProvider");
  }
  return ctx;
}

function navigateTo(
  href: string,
  router: ReturnType<typeof useRouter>,
  locale: Locale,
) {
  if (!href.trim()) return;
  if (href.startsWith("site-checkout:")) {
    const productId = href.slice("site-checkout:".length).trim();
    if (productId) {
      void startStripeCheckout([productId], locale).catch((err) => {
        console.error("[offer-popup] site checkout failed", err);
      });
    }
    return;
  }
  if (href.startsWith("placement-checkout:")) {
    const key = href.slice("placement-checkout:".length).trim();
    if (key) {
      void startPlacementCheckout(key, locale).catch((err) => {
        console.error("[offer-popup] placement checkout failed", err);
      });
    }
    return;
  }
  if (href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) {
    window.open(href, href.startsWith("http") ? "_blank" : "_self", "noopener,noreferrer");
    return;
  }
  router.push(href);
}

/**
 * An offer can only be added to a purchase in progress when both sides have a
 * Stripe Price ID — that is what lets them share one Checkout session. Without
 * it the only way to "accept" would be to replace the product the buyer already
 * chose, so the offer is skipped instead of costing the sale.
 */
function offerIsAddable(
  offer: ResolvedOffer | null,
  baseProduct: SiteProduct | undefined,
  locale: Locale,
): boolean {
  if (!offer) return false;
  if (!baseProduct) {
    const stripe = productStripeForLocale(offer.offer, locale);
    return Boolean(stripe.stripe_price_id || stripe.stripe_url);
  }
  return canBundleCheckout(locale, baseProduct, offer.offer);
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

  const tryOpenPlacement = useCallback(
    (placementKey: string, continueHref: string, baseProduct?: SiteProduct): boolean => {
      let base = baseProduct;
      if (!base && isProductPlacementKey(placementKey)) {
        base = offersById[placementKey.replace(/^product_/, "")];
      }

      const { upsell, downsell } = resolvePlacementOffers(
        placements[placementKey],
        offersById,
        locale,
        base?.id,
      );

      const showUpsell = offerIsAddable(upsell, base, locale) ? upsell : null;
      const showDownsell = offerIsAddable(downsell, base, locale) ? downsell : null;
      if (!showUpsell && !showDownsell) return false;

      setCheckoutError(null);
      setPopup({
        step: showUpsell ? "upsell" : "downsell",
        upsell: showUpsell,
        downsell: showDownsell,
        continueHref,
        baseProduct: base,
      });
      return true;
    },
    [placements, offersById, locale],
  );

  const ctx = useMemo(
    () => ({ tryOpenPlacement, placements, locale }),
    [tryOpenPlacement, placements, locale],
  );

  const dismiss = useCallback(
    (andContinue = false) => {
      const href = popup?.continueHref;
      setPopup(null);
      setCheckoutError(null);
      if (andContinue && href) navigateTo(href, router, locale);
    },
    [popup?.continueHref, router, locale],
  );

  function checkoutProducts(productIds: string[]) {
    setCheckoutError(null);
    startTransition(async () => {
      try {
        await startStripeCheckout(productIds, locale);
        setPopup(null);
      } catch (err) {
        setCheckoutError(err instanceof Error ? err.message : "Checkout failed");
      }
    });
  }

  /** Keep the original product; skip remaining extra offers. */
  function proceedWithOriginal() {
    if (!popup) return;
    const baseProduct = popup.baseProduct;
    if (baseProduct) {
      if (canBundleCheckout(locale, baseProduct)) {
        checkoutProducts([baseProduct.id]);
        return;
      }
      const url = productStripeForLocale(baseProduct, locale).stripe_url;
      if (url) {
        setPopup(null);
        openStripeUrl(url, [baseProduct.id]);
        return;
      }
    }
    dismiss(true);
  }

  /** Close extra offers and continue whatever the visitor originally clicked. */
  function closeOfferDialog() {
    if (pending) return;
    proceedWithOriginal();
  }

  useEffect(() => {
    if (!popup) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) proceedWithOriginal();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [popup, pending, dismiss]);

  const current = popup
    ? popup.step === "upsell"
      ? popup.upsell
      : popup.downsell
    : null;
  const offer = current?.offer;
  const baseProduct = popup?.baseProduct;

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

  function accept() {
    if (!offer) return;
    if (baseProduct) {
      // Guaranteed addable: tryOpenPlacement never shows a non-bundleable
      // offer next to a base product.
      checkoutProducts([baseProduct.id, offer.id]);
      return;
    }
    if (canBundleCheckout(locale, offer)) {
      checkoutProducts([offer.id]);
      return;
    }
    const url = productStripeForLocale(offer, locale).stripe_url;
    if (url) {
      setPopup(null);
      openStripeUrl(url, [offer.id]);
    }
  }

  /** Decline: try the second-chance offer, otherwise finish what they started. */
  function decline() {
    if (!popup) return;
    if (popup.step === "upsell" && popup.downsell) {
      setCheckoutError(null);
      setPopup({ ...popup, step: "downsell" });
      return;
    }
    proceedWithOriginal();
  }

  const declineLabel = (() => {
    if (popup?.step === "upsell" && popup.downsell) {
      return locale === "bg" ? "Не, благодаря" : "No thanks";
    }
    if (baseTitle) {
      return locale === "bg" ? `Не, само „${baseTitle}“` : `No, just “${baseTitle}”`;
    }
    return locale === "bg" ? "Не, благодаря" : "No thanks";
  })();

  const acceptLabel = (() => {
    if (baseProduct) {
      return locale === "bg" ? "Да, искам и двете — към Stripe" : "Yes, both — go to Stripe";
    }
    return offerCta;
  })();

  return (
    <OfferPopupContext.Provider value={ctx}>
      {children}

      {popup && offer && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-forest-900/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => closeOfferDialog()}
        >
          <div
            className="animate-fade-up relative w-full max-w-lg overflow-hidden rounded-3xl bg-cream-50 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-popup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <ModalCloseButton
              onClick={() => closeOfferDialog()}
              disabled={pending}
              label={locale === "bg" ? "Затвори" : "Close"}
            />

            <div className="bg-slate-800 px-7 py-6 text-white">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-300">
                <Sparkles className="h-4 w-4" />
                {current?.headline}
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

              {baseProduct && basePrice && price && (
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
                <button
                  type="button"
                  onClick={accept}
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold-400 px-6 text-sm font-bold text-forest-900 transition-colors hover:bg-gold-500 disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                  {acceptLabel}
                </button>
                <button
                  type="button"
                  onClick={decline}
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-forest-100 bg-white px-6 text-sm font-semibold text-slate-800 hover:bg-cream disabled:opacity-60"
                >
                  {declineLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OfferPopupContext.Provider>
  );
}
