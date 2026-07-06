"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Leaf } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import { Button, buttonVariants } from "@/components/ui/button";
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const other: Locale = locale === "bg" ? "en" : "bg";
  const switchHref = pathname.replace(/^\/(bg|en)/, `/${other}`) || `/${other}`;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-forest-100 bg-cream/95 backdrop-blur-md transition-all duration-300",
        scrolled && "shadow-sm",
      )}
    >
      <Container className="flex min-h-[3.5rem] items-center justify-between gap-3 py-2.5 sm:min-h-[4rem] sm:py-3">
        <Link
          href={`/${locale}`}
          className="flex min-w-0 items-center gap-2 font-display tracking-tight sm:gap-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white sm:h-9 sm:w-9">
            <Leaf className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-semibold text-slate-800 sm:text-lg">
              {siteConfig.brand}
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-wider text-ink-soft sm:block">
              {siteConfig.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-forest-500",
                item.href === "#free-menu"
                  ? "font-semibold text-forest-600"
                  : "text-slate-700",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={switchHref}
            className="rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:border-forest-300 hover:bg-cream-2"
          >
            {other}
          </Link>
          <Button
            href={`/${locale}#free-menu`}
            size="sm"
            variant="forest"
          >
            {locale === "bg" ? "Безплатно меню" : "Free menu"}
          </Button>
          <Button
            href={`/${locale}#contact`}
            size="sm"
            variant="outline"
          >
            {cta}
          </Button>
        </div>

        <button
          type="button"
          className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-800 hover:bg-forest-50 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>

      {open && (
        <div className="max-h-[min(85vh,32rem)] overflow-y-auto border-t border-forest-100 bg-cream lg:hidden">
          <Container className="flex flex-col gap-0.5 py-3 pb-5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href.startsWith("#") ? `/${locale}${item.href}` : item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-3.5 text-base font-medium transition-colors hover:bg-cream-2",
                  item.href === "#free-menu"
                    ? "bg-forest-500/10 font-semibold text-forest-700"
                    : "text-slate-800",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                href={`/${locale}#free-menu`}
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "forest", size: "sm" }), "w-full")}
              >
                {locale === "bg" ? "Безплатно меню" : "Free menu"}
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href={switchHref}
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-forest-200 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  {other}
                </Link>
                <Link
                  href={`/${locale}#contact`}
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ size: "sm" }), "flex-1")}
                >
                  {cta}
                </Link>
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
