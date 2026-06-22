"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Leaf } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Navbar({
  locale,
  items,
  cta,
}: {
  locale: Locale;
  items: NavItem[];
  cta: string;
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
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-ink/10 bg-cream/85 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <Container className="flex h-18 items-center justify-between py-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 font-display tracking-tight"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-cream">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold">{siteConfig.brand}</span>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-soft">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={switchHref}
            className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:border-ink hover:bg-ink hover:text-cream"
          >
            {other}
          </Link>
          <Button href={`/${locale}#contact`} size="sm">
            {cta}
          </Button>
        </div>

        <button
          className="lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>

      {open && (
        <div className="border-t border-ink/10 bg-cream lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium hover:bg-ink/5"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3">
              <Link
                href={switchHref}
                onClick={() => setOpen(false)}
                className="rounded-full border border-ink/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider"
              >
                {other}
              </Link>
              <Button href={`/${locale}#contact`} size="sm" className="flex-1">
                {cta}
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
