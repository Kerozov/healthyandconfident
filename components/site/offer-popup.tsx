"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { X, ArrowUpRight, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Segment, SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { offerMatchesVisitor } from "@/lib/site/audience";
import { resolveOffer, resolveOfferHeadline, resolveOfferCta, normalizeOfferType } from "@/lib/site/cta-placements";
import { readVisitorTags } from "@/lib/site/visitor-tags";
import { cn } from "@/lib/utils";

type PopupState = {
  offer: SiteProduct;
  headline: string;
  continueHref: string;
};

type OfferPopupContextValue = {
  tryOpenPlacement: (placementKey: string, continueHref: string) => boolean;
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
  segments,
  locale,
}: {
  children: React.ReactNode;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
  segments: Segment[];
  locale: Locale;
}) {
  const router = useRouter();
  const [visitorTags, setVisitorTags] = useState<string[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);

  useEffect(() => {
    setVisitorTags(readVisitorTags());
  }, []);

  const resolveForPlacement = useCallback(
    (placementKey: string): PopupState | null => {
      const placement = placements[placementKey];
      if (!placement?.offer_enabled) return null;

      const offer = resolveOffer(placement.offer_id, offersById);
      if (!offer || !offerMatchesVisitor(offer, visitorTags, segments)) return null;

      const customHeadline =
        locale === "bg" ? placement.offer_headline_bg : placement.offer_headline_en;

      return {
        offer,
        headline: resolveOfferHeadline(locale, offer, customHeadline),
        continueHref: "",
      };
    },
    [placements, offersById, visitorTags, segments, locale],
  );

  const tryOpenPlacement = useCallback(
    (placementKey: string, continueHref: string): boolean => {
      const resolved = resolveForPlacement(placementKey);
      if (!resolved) return false;
      setPopup({ ...resolved, continueHref });
      return true;
    },
    [resolveForPlacement],
  );

  const ctx = useMemo(() => ({ tryOpenPlacement }), [tryOpenPlacement]);

  function close(andContinue = false) {
    const href = popup?.continueHref;
    setPopup(null);
    if (andContinue && href) navigateTo(href, router);
  }

  const offer = popup?.offer;
  const isDownsell = offer ? normalizeOfferType(offer.offer_type) === "downsell" : false;
  const title = offer ? (locale === "bg" ? offer.title_bg : offer.title_en) : "";
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
  const checkoutUrl = offer?.stripe_url?.trim() ?? "";
  const cta = offer ? resolveOfferCta(locale, offer) : "";

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
              aria-label={locale === "bg" ? "Затвори" : "Close"}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-forest-800/5 text-forest-800 transition-colors hover:bg-forest-800/10"
            >
              <X className="h-5 w-5" />
            </button>

            <div
              className={cn(
                "px-7 py-6 text-white",
                isDownsell ? "bg-gold-600" : "bg-green-700",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
                  isDownsell ? "text-cream-100" : "text-gold-300",
                )}
              >
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

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {checkoutUrl ? (
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-colors",
                      isDownsell
                        ? "bg-gold-500 text-forest-900 hover:bg-gold-400"
                        : "bg-gold-400 text-forest-900 hover:bg-gold-500",
                    )}
                  >
                    {cta}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-green-200 bg-white px-6 text-sm font-semibold text-green-800 hover:bg-green-50"
                >
                  {locale === "bg" ? "Не, благодаря" : "No thanks"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OfferPopupContext.Provider>
  );
}
