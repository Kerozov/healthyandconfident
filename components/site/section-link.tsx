"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

export function SectionLink({
  href,
  locale,
  className,
  children,
}: {
  href: string;
  locale: Locale;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const fullHref = href.startsWith("#") ? `/${locale}${href}` : href;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!href.startsWith("#")) return;

    const homePath = `/${locale}`;
    const onHome = pathname === homePath || pathname === `${homePath}/`;
    if (!onHome) return;

    event.preventDefault();
    const target = document.getElementById(href.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", fullHref);
    }
  }

  return (
    <Link href={fullHref} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
