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
        "sticky top-0 z-50 border-b border-forest-100 bg-cream/95 backdrop-blur-md transition-all duration-300",
        scrolled && "shadow-sm",
      )}
    >
      <Container className="flex h-18 items-center justify-between py-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 font-display tracking-tight"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold text-slate-800">
              {siteConfig.brand}
            </span>
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
              className="text-sm font-medium text-forest-800 transition-colors hover:text-slate-500"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={switchHref}
            className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-forest-800 transition-colors hover:border-forest-300 hover:bg-forest-50"
          >
            {other}
          </Link>
          <Button
            href={`/${locale}#contact`}
            size="sm"
            variant="forest"
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
        <div className="border-t border-forest-100 bg-cream lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-forest-800 hover:bg-forest-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-3">
              <Link
                href={switchHref}
                onClick={() => setOpen(false)}
                className="rounded-full border border-forest-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-forest-800"
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
