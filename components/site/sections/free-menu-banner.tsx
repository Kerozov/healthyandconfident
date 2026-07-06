import { Gift } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { OpenMenuButton } from "@/components/site/open-menu-button";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const FOOD_IMAGE = "/images/11.jpg";

export function FreeMenuBanner({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { leadMagnet, hero } = dict;

  return (
    <section
      id="free-menu"
      className="section-pad scroll-mt-24 bg-cream-2/50"
    >
      <Container>
        <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-forest-100">
          <div className="grid lg:grid-cols-2">
            <div className="relative aspect-[4/3] min-h-[220px] lg:aspect-auto lg:min-h-[320px]">
              <SiteImage
                src={FOOD_IMAGE}
                alt={mediaAlt(FOOD_IMAGE, locale)}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-900/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-forest-900/10" />
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <span className="eyebrow">
                <Gift className="h-4 w-4" />
                {locale === "bg" ? "Безплатен подарък" : "Free gift"}
              </span>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-slate-800 sm:text-3xl">
                {leadMagnet.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                {leadMagnet.subtitle}
              </p>
              <OpenMenuButton
                source="free-menu-banner"
                variant="forest"
                size="lg"
                className="mt-6 w-full sm:w-auto"
              >
                {hero.freeMenuCta}
              </OpenMenuButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
