"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useOfferPopup } from "@/components/site/offer-popup";
import { trackMeta } from "@/lib/meta/client";
import { trackSiteCheckout } from "@/lib/analytics/client";
import {
  openStripeUrl,
  startPlacementCheckout,
} from "@/lib/site/stripe-checkout";
import {
  resolvePlacementButton,
  targetIsPayment,
  type PlacementTarget,
} from "@/lib/site/cta-placements";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type CtaLinkProps = VariantProps<typeof buttonVariants> & {
  placementKey: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
};

/** How the offer popup should continue once the visitor is done with it. */
function continueToken(target: PlacementTarget): string {
  if (target.kind === "checkout") return `placement-checkout:${target.placementKey}`;
  if (target.kind === "payment-link") return target.url;
  if (target.kind === "link") return target.href;
  return "";
}

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
  const [error, setError] = useState<string | null>(null);
  const resolved = resolvePlacementButton(
    placements,
    placementKey,
    locale,
    { label: "", href },
  );

  if (resolved.hidden) return null;

  const classes = cn(buttonVariants({ variant, size }), className);
  const label = resolved.label || children;
  const btnTarget = resolved.target;
  const isPayment = targetIsPayment(btnTarget);

  // A payment button never behaves like a link: its work happens in the new tab
  // the click opens, so it is rendered as a real button and cannot be
  // middle-clicked into a half-finished checkout.
  const linkHref =
    btnTarget.kind === "link" ? btnTarget.href : `/${locale}#contact`;
  const external =
    linkHref.startsWith("http") ||
    linkHref.startsWith("tel:") ||
    linkHref.startsWith("mailto:");

  function pay() {
    setError(null);
    if (btnTarget.kind === "payment-link") {
      openStripeUrl(btnTarget.url, [placementKey]);
      return;
    }
    if (btnTarget.kind !== "checkout") return;
    setPending(true);
    void startPlacementCheckout(placementKey, locale)
      .catch((err: unknown) => {
        console.error("[cta] placement checkout failed", err);
        setError(
          locale === "bg"
            ? "Плащането не можа да се отвори. Опитай пак или ни пиши."
            : "Checkout could not be opened. Please try again or contact us.",
        );
      })
      .finally(() => setPending(false));
  }

  function handleClick(e: React.MouseEvent) {
    if (tryOpenPlacement(placementKey, continueToken(btnTarget))) {
      e.preventDefault();
      return;
    }
    if (isPayment) {
      e.preventDefault();
      pay();
      return;
    }
    trackLinkClick();
  }

  function trackLinkClick() {
    if (!/^https?:\/\/[a-z0-9-]*\.?stripe\.com/i.test(linkHref)) return;
    trackSiteCheckout();
    trackMeta("InitiateCheckout", {
      contentIds: [placementKey],
      contentType: "product",
      numItems: 1,
    });
  }

  const button = (() => {
    if (pending) {
      return (
        <span className={cn(classes, "pointer-events-none opacity-70")}>{label}</span>
      );
    }
    if (isPayment) {
      return (
        <button type="button" className={classes} onClick={handleClick}>
          {label}
        </button>
      );
    }
    if (external) {
      return (
        <a
          href={linkHref}
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
      <Link href={linkHref} className={classes} onClick={handleClick}>
        {label}
      </Link>
    );
  })();

  if (!error) return button;

  return (
    <span className="inline-flex flex-col items-start gap-2">
      {button}
      <span className="text-sm font-medium text-coral-600">{error}</span>
    </span>
  );
}
