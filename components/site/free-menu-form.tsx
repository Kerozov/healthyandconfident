"use client";

import type { Locale } from "@/i18n/config";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { useOfferPopup } from "@/components/site/offer-popup";
import { useSignupThankYouButton } from "@/components/site/signup-thank-you-provider";
import { FREE_MENU_PAGE_SOURCE, freeMenuTags } from "@/lib/site/free-menu";

/** The free menu popup's form, laid out on its own page - same fields, tags and next step. */
export function FreeMenuForm({
  locale,
  segmentTag,
  button,
  consent,
  success,
}: {
  locale: Locale;
  segmentTag?: string | null;
  button: string;
  consent: string;
  success: string;
}) {
  const { tryOpenPlacement } = useOfferPopup();
  const thankYouButton = useSignupThankYouButton();

  return (
    <SubscribeForm
      locale={locale}
      source={FREE_MENU_PAGE_SOURCE}
      baseTags={freeMenuTags(segmentTag)}
      consent={consent}
      success={success}
      buttonLabel={button}
      onSuccess={() => {
        // A configured thank-you button is the next step; otherwise offer what the popup offers.
        if (!thankYouButton) tryOpenPlacement("leadmagnet_cta", "");
      }}
    />
  );
}
