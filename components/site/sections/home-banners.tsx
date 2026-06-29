import Link from "next/link";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { cn } from "@/lib/utils";

const BANNER_BG = "/images/program-banner.png";

function BannerBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative bg-cover bg-center bg-no-repeat py-14 sm:py-20"
      style={{ backgroundImage: `url('${BANNER_BG}')` }}
    >
      <div className="absolute inset-0 bg-forest-900/15" aria-hidden />
      <Container className="relative">{children}</Container>
    </div>
  );
}

export function MenuGiftBanner({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { menuBanner } = dict;

  return (
    <section aria-label={menuBanner.cta}>
      <BannerBackdrop>
        <div className="mx-auto max-w-4xl border-2 border-forest-900 bg-white px-6 py-8 text-center shadow-lg sm:px-12 sm:py-10">
          <p className="font-display text-lg font-semibold leading-snug text-forest-800 sm:text-xl">
            {menuBanner.text}
          </p>
          <Link
            href={`/${locale}#lead`}
            className={cn(
              "mt-6 inline-flex items-center justify-center rounded-sm px-8 py-3.5",
              "bg-forest-600 text-sm font-bold uppercase tracking-wide text-white",
              "transition-colors hover:bg-forest-700",
            )}
          >
            {menuBanner.cta}
          </Link>
        </div>
      </BannerBackdrop>
    </section>
  );
}

export function BioCommunityBanner({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { bioBanner } = dict;

  return (
    <section aria-label={bioBanner.cta}>
      <BannerBackdrop>
        <div className="mx-auto max-w-2xl border-2 border-forest-900 bg-white px-6 py-10 text-center shadow-lg sm:px-10 sm:py-12">
          <h2 className="font-display text-3xl font-bold text-forest-600 sm:text-4xl">
            {bioBanner.title}
          </h2>
          <ul className="mt-6 space-y-2 text-left text-sm leading-relaxed text-forest-800 sm:text-base">
            {bioBanner.credentials.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-600" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-forest-700 sm:text-base">
            {bioBanner.invite}
          </p>
          <CtaLink
            placementKey="programs_2"
            href={bioBanner.href.replace("{locale}", locale)}
            variant="forest"
            size="lg"
            className="mt-6 rounded-sm px-10 py-3.5 text-sm font-bold uppercase tracking-wide"
          >
            {bioBanner.cta}
          </CtaLink>
        </div>
      </BannerBackdrop>
    </section>
  );
}
