"use client";

import { SubscribeForm } from "@/components/site/subscribe-form";
import type { Locale } from "@/i18n/config";
import { useOfferPopup } from "@/components/site/offer-popup";

export function LeadForm({
  locale,
  consent,
  success,
  error: _error,
  segmentTag = "all",
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
  segmentTag?: string;
  source?: string;
  variant?: "default" | "gradient" | "light";
  offerPlacementKey?: string;
  compact?: boolean;
}) {
  const { tryOpenPlacement } = useOfferPopup();

  return (
    <SubscribeForm
      locale={locale}
      source={source}
      baseTags={segmentTag ? [segmentTag] : []}
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
