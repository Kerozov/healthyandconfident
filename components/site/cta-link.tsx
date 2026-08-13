"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useOfferPopup } from "@/components/site/offer-popup";
import { trackMeta } from "@/lib/meta/client";
import { trackSiteCheckout } from "@/lib/analytics/client";
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
  const { tryOpenPlacement } = useOfferPopup();
  const classes = cn(buttonVariants({ variant, size }), className);

  const external =
    href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");

  function handleClick(e: React.MouseEvent) {
    if (tryOpenPlacement(placementKey, href)) {
      e.preventDefault();
      return;
    }
    if (isStripeCheckoutUrl(href)) {
      trackSiteCheckout();
      trackMeta("InitiateCheckout", {
        contentIds: [placementKey],
        contentType: "product",
        numItems: 1,
      });
    }
  }

  if (external) {
    return (
      <a href={href} target={target} rel={rel} className={classes} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} onClick={handleClick}>
      {children}
    </Link>
  );
}
