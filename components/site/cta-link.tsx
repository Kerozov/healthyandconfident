"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useOfferPopup } from "@/components/site/offer-popup";
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
