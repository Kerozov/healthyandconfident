import { BadgeCheck, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CtaOfferSlot } from "@/components/site/cta-offer-slot";

export function About({
  dict,
  locale,
  placements,
  offersById,
}: {
  dict: Dictionary;
  locale: Locale;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
}) {
  const { about } = dict;
  return (
    <section
      id="about"
      className="scroll-mt-24 bg-gradient-to-br from-cream-50 to-green-50 py-24"
    >
      <Container className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative mx-auto w-full max-w-sm lg:sticky lg:top-28">
          <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-green-400 to-green-600 shadow-soft">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: "url('/images/vessie-about.jpg')" }}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {about.credentials.map((c) => (
              <div
                key={c}
                className="flex items-start gap-2 rounded-xl border border-green-100 bg-white px-4 py-2 text-sm text-forest-800 shadow-sm"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                {c}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow text-green-600">{about.eyebrow}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-3 py-1 text-sm font-bold text-forest-900">
              <Star className="h-3.5 w-3.5 fill-forest-900 text-forest-900" /> 5.0
            </span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {about.title}
          </h2>
          <div className="mt-6 space-y-5 leading-relaxed text-forest-800">
            {about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <Button
            href={`/${locale}#contact`}
            className="mt-8 px-8 py-3.5 font-bold"
            size="lg"
          >
            {about.cta}
          </Button>
          <CtaOfferSlot
            placementKey="about_cta"
            placements={placements}
            offersById={offersById}
            locale={locale}
            className="mt-4 max-w-lg"
          />
        </div>
      </Container>
    </section>
  );
}
