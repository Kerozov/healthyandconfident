"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Leaf, ChevronDown, ClipboardList } from "lucide-react";
import { localeSwitchHref, type Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { OpenMenuButton } from "@/components/site/open-menu-button";
import { OpenMenuNavAnchor } from "@/components/site/open-menu-nav-link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = new Set(["#programs", "#results", "#about", "#contact"]);

function isExternal(href: string) {
  return href.startsWith("/") && !href.startsWith(`#`);
}

function navHref(locale: Locale, href: string) {
  return href.startsWith("#") ? `/${locale}${href}` : href;
}

function closeParentDetails(event: { currentTarget: HTMLElement }) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

export function Navbar({
  locale,
  items,
  cta,
  className,
  spacerClassName,
}: {
  locale: Locale;
  items: NavItem[];
  cta: string;
  className?: string;
  spacerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
  const switchHref = localeSwitchHref(pathname, other);
  const freeMenuLabel = locale === "bg" ? "Безплатно меню" : "Free menu";
  const shortCta = locale === "bg" ? "Програми" : "Programs";

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-forest-100 bg-cream/95 backdrop-blur-md transition-shadow duration-300",
          scrolled && "shadow-md",
          className,
        )}
      >
        <Container className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:h-16 lg:gap-3">
          <Link
            href={`/${locale}`}
            className="flex min-w-0 shrink-0 items-center gap-2 font-display tracking-tight"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white sm:h-9 sm:w-9">
              <Leaf className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-slate-800 sm:text-base">
                {siteConfig.brand}
              </span>
            </span>
          </Link>

          <nav className="hidden min-w-0 items-center justify-center gap-2 overflow-visible lg:flex xl:gap-3">
            {items.map((item) => {
              const compactOnly = !PRIMARY_NAV.has(item.href) && !isExternal(item.href);
              const className = cn(
                "whitespace-nowrap text-xs font-medium text-slate-700 transition-colors hover:text-forest-500 xl:text-sm",
                compactOnly && "hidden xl:inline",
              );

              if (item.href === "#free-menu") {
                return (
                  <OpenMenuNavAnchor
                    key={item.href}
                    locale={locale}
                    label={item.label}
                    className={cn(className, "text-forest-600 hover:text-forest-500")}
                  />
                );
              }

              if (item.children && item.children.length > 0) {
                return (
                  <details key={item.href} className="group relative">
                    <summary
                      className={cn(
                        className,
                        "flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden",
                      )}
                    >
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-2">
                      <div className="rounded-2xl border border-forest-100 bg-cream p-1.5 shadow-lg">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={navHref(locale, child.href)}
                            onClick={closeParentDetails}
                            className="block rounded-xl px-3 py-2.5 text-sm font-medium leading-snug text-slate-800 transition-colors hover:bg-forest-50 hover:text-forest-700"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </details>
                );
              }

              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={navHref(locale, item.href)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-forest-500/10 px-3 py-1.5 text-xs font-semibold text-forest-700 transition-colors hover:bg-forest-500/20 xl:text-sm"
                  >
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                    {item.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={navHref(locale, item.href)}
                  className={className}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center justify-end gap-1.5 sm:gap-2 lg:flex">
            <Link
              href={switchHref}
              className="rounded-full border border-forest-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:border-forest-300 hover:bg-cream-2 sm:px-2.5 sm:text-[11px]"
            >
              {other}
            </Link>
            <OpenMenuButton
              source="nav-header"
              size="sm"
              variant="outline"
              className="hidden rounded-full px-3 text-xs xl:inline-flex"
            >
              {freeMenuLabel}
            </OpenMenuButton>
            <Button
              href={`/${locale}#programs`}
              size="sm"
              variant="primary"
              className="rounded-full px-3 text-xs xl:px-5 xl:text-sm"
            >
              <span className="xl:hidden">{shortCta}</span>
              <span className="hidden xl:inline">{cta}</span>
            </Button>
          </div>

          <button
            type="button"
            className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center justify-self-end rounded-lg text-slate-800 hover:bg-forest-50 lg:hidden"
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
              {items.map((item) =>
                item.href === "#free-menu" ? (
                  <OpenMenuNavAnchor
                    key={item.href}
                    locale={locale}
                    label={item.label}
                    onNavigate={() => setOpen(false)}
                    className="rounded-xl bg-forest-500/10 px-3 py-3.5 text-base font-semibold text-forest-700 transition-colors hover:bg-forest-500/15"
                  />
                ) : item.children && item.children.length > 0 ? (
                  <details key={item.href} className="group rounded-xl">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3.5 text-base font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
                      {item.label}
                      <ChevronDown className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="flex flex-col pb-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={navHref(locale, child.href)}
                          onClick={() => setOpen(false)}
                          className="rounded-xl px-3 py-2.5 pl-6 text-base text-slate-700 transition-colors hover:bg-cream-2"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                ) : item.highlight ? (
                  <Link
                    key={item.href}
                    href={navHref(locale, item.href)}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-forest-500/10 px-3 py-3.5 text-base font-semibold text-forest-700 transition-colors hover:bg-forest-500/15"
                  >
                    <ClipboardList className="h-5 w-5" aria-hidden />
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={navHref(locale, item.href)}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-3.5 text-base font-medium text-slate-800 transition-colors hover:bg-cream-2"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <div className="mt-3 flex flex-col gap-2 border-t border-forest-100 pt-3">
                <OpenMenuButton
                  source="nav-mobile"
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full"
                  onClick={() => setOpen(false)}
                >
                  {freeMenuLabel}
                </OpenMenuButton>
                <Link
                  href={`/${locale}#programs`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "primary" }),
                    "w-full rounded-full",
                  )}
                >
                  {cta}
                </Link>
                <Link
                  href={switchHref}
                  onClick={() => setOpen(false)}
                  className="mx-auto rounded-full border border-forest-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  {other}
                </Link>
              </div>
            </Container>
          </div>
        )}
      </header>

      <div
        className={cn("h-14 shrink-0 sm:h-16", spacerClassName)}
        aria-hidden
      />
    </>
  );
}
