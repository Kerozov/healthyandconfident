"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useOfferPopup } from "@/components/site/offer-popup";
import { trackMeta } from "@/lib/meta/client";
import { trackSiteCheckout } from "@/lib/analytics/client";
import { startPlacementCheckout } from "@/lib/site/stripe-checkout";
import { resolvePlacementButton } from "@/lib/site/cta-placements";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

/** Stripe payment links leave the site, so the click is the only conversion signal. */
function isStripeCheckoutUrl(href: string): boolean {
  return /^https?:\/\/(buy\.stripe\.com|checkout\.stripe\.com|[a-z0-9-]+\.stripe\.com)/i.test(
    href,
  );
}

type CtaLinkProps = VariantProps<typeof buttonVariants> & {
  placementKey: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
};

export function CtaLink({
  placementKey,
  href,
  variant,
  size,
  className,
  children,
  target,
  rel,
}: CtaLinkProps) {
  const { tryOpenPlacement, placements, locale } = useOfferPopup();
  const [pending, setPending] = useState(false);
  const resolved = resolvePlacementButton(
    placements,
    placementKey,
    locale,
    { label: "", href },
  );

  if (resolved.hidden) return null;

  const finalHref = resolved.href;
  const classes = cn(buttonVariants({ variant, size }), className);
  const label = resolved.label || children;
  const external =
    finalHref.startsWith("http") ||
    finalHref.startsWith("tel:") ||
    finalHref.startsWith("mailto:");

  function continueHref(): string {
    if (resolved.stripePriceId) return `placement-checkout:${placementKey}`;
    return finalHref;
  }

  function handleClick(e: React.MouseEvent) {
    if (tryOpenPlacement(placementKey, continueHref())) {
      e.preventDefault();
      return;
    }
    if (resolved.stripePriceId) {
      e.preventDefault();
      setPending(true);
      void startPlacementCheckout(placementKey, locale)
        .catch((err) => {
          console.error("[cta] placement checkout failed", err);
        })
        .finally(() => setPending(false));
      return;
    }
    if (isStripeCheckoutUrl(finalHref)) {
      trackSiteCheckout();
      trackMeta("InitiateCheckout", {
        contentIds: [placementKey],
        contentType: "product",
        numItems: 1,
      });
    }
  }

  if (pending) {
    return (
      <span className={cn(classes, "pointer-events-none opacity-70")}>{label}</span>
    );
  }

  if (resolved.stripePriceId && !resolved.stripeUrl) {
    return (
      <button type="button" className={classes} onClick={handleClick}>
        {label}
      </button>
    );
  }

  if (external) {
    return (
      <a
        href={finalHref}
        target={target}
        rel={rel}
        className={classes}
        onClick={handleClick}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={finalHref} className={classes} onClick={handleClick}>
      {label}
    </Link>
  );
}
