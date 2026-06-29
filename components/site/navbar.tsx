"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Leaf } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import type { SiteCtaPlacement, SiteProduct, Segment } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { CtaOfferSlot } from "@/components/site/cta-offer-slot";

export function Navbar({
  locale,
  items,
  cta,
  placements,
  offersById,
  segments,
}: {
  locale: Locale;
  items: NavItem[];
  cta: string;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
  segments: Segment[];
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const other: Locale = locale === "bg" ? "en" : "bg";
  const switchHref = pathname.replace(/^\/(bg|en)/, `/${other}`) || `/${other}`;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-green-100 bg-white/95 backdrop-blur-md transition-all duration-300",
        scrolled && "shadow-sm",
      )}
    >
      <Container className="flex h-18 items-center justify-between py-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 font-display tracking-tight"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold text-green-700">
              {siteConfig.brand}
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-forest-800/70">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
              className="text-sm font-medium text-forest-800 transition-colors hover:text-green-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={switchHref}
            className="rounded-full border border-green-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-forest-800 transition-colors hover:border-green-300 hover:bg-green-50"
          >
            {other}
          </Link>
          <Button
            href={`/${locale}#contact`}
            size="sm"
            className="bg-gold-400 font-semibold text-forest-900 shadow-sm hover:bg-gold-500"
          >
            {cta}
          </Button>
        </div>

        <button
          className="text-forest-800 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-green-100 bg-white lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-forest-800 hover:bg-green-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3">
              <Link
                href={switchHref}
                onClick={() => setOpen(false)}
                className="rounded-full border border-green-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-forest-800"
              >
                {other}
              </Link>
              <Button href={`/${locale}#contact`} size="sm" className="flex-1">
                {cta}
              </Button>
            </div>
            <CtaOfferSlot
              placementKey="nav_cta"
              placements={placements}
              offersById={offersById}
              segments={segments}
              locale={locale}
              compact
              className="mt-3"
            />
          </Container>
        </div>
      )}
    </header>
  );
}
