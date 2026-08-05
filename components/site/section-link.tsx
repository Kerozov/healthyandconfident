import Link from "next/link";
import type { Locale } from "@/i18n/config";

/**
 * Link to a section of the home page. The actual scrolling is handled globally
 * by `HashScroll`, which also keeps the hash out of the address bar so the same
 * link stays clickable after the visitor scrolls away.
 */
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
  const fullHref = href.startsWith("#") ? `/${locale}${href}` : href;

  return (
    <Link href={fullHref} className={className}>
      {children}
    </Link>
  );
}
