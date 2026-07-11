"use client";

import { SubscribeForm } from "@/components/site/subscribe-form";
import type { Locale } from "@/i18n/config";
import { useOfferPopup } from "@/components/site/offer-popup";

export function LeadForm({
  locale,
  consent,
  success,
  error: _error,
  segmentTag,
  source = "lead-magnet",
  variant = "default",
  offerPlacementKey,
  button,
  compact = false,
}: {
  locale: Locale;
  placeholder?: string;
  button: string;
  consent: string;
  success: string;
  error: string;
  /** Extra non-health tag (e.g. newsletter). Do not pass weight-loss / diabetes. */
  segmentTag?: string;
  source?: string;
  variant?: "default" | "gradient" | "light";
  offerPlacementKey?: string;
  compact?: boolean;
}) {
  const { tryOpenPlacement } = useOfferPopup();

  const baseTags =
    segmentTag && segmentTag !== "all" && segmentTag !== "weight-loss"
      ? [segmentTag]
      : [];

  return (
    <SubscribeForm
      locale={locale}
      source={source}
      baseTags={baseTags}
      consent={consent}
      success={success}
      buttonLabel={button}
      variant={variant}
      compact={compact}
      onSuccess={() => {
        if (offerPlacementKey) {
          tryOpenPlacement(offerPlacementKey, "");
        }
      }}
    />
  );
}
