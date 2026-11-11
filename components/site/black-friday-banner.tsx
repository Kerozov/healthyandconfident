import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { SiteBlackFridayConfig } from "@/lib/supabase/types";

/**
 * Slim top banner shown while the campaign is active. Rendered by the site
 * layout above the header; hidden entirely when disabled or without a text.
 */
export function BlackFridayBanner({
  config,
  locale,
}: {
  config: SiteBlackFridayConfig;
  locale: Locale;
}) {
  const text = (locale === "bg" ? config.banner_text_bg : config.banner_text_en).trim();
  if (!text) return null;

  const href = config.banner_href?.trim() || "/black-friday";
  const target = href.startsWith("/") ? `/${locale}${href}` : href;

  return (
    <div className="bg-forest-900 text-white">
      <Link
        href={target}
        className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-semibold hover:opacity-90"
      >
        <span>{text}</span>
        <span aria-hidden className="text-gold-400">
          →
        </span>
      </Link>
    </div>
  );
}
