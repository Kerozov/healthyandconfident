import { Check, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CtaOfferSlot } from "@/components/site/cta-offer-slot";

export function Programs({
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
  const { programs } = dict;
  return (
    <section id="programs" className="scroll-mt-24 bg-white py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-rose-500">
            <Star className="h-4 w-4" /> {locale === "bg" ? "Програми" : "Programs"}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
            {programs.title}
          </h2>
          <p className="mt-4 text-warm-800">{programs.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {programs.items.map((p, index) => (
            <div
              key={p.title}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all hover:-translate-y-1",
                p.highlight
                  ? "border-2 border-rose-400 bg-white shadow-lg lg:-mt-4 lg:mb-4"
                  : "border-[#F0D5CC] bg-warm-50",
              )}
            >
              {p.badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold",
                    p.highlight
                      ? "bg-rose-400 text-white"
                      : "bg-sage-50 text-sage-600",
                  )}
                >
                  {p.badge}
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold text-warm-900">{p.title}</h3>
              <span className="mt-2 inline-flex w-fit rounded-full bg-sage-50 px-3 py-1 text-xs text-sage-600">
                {p.duration}
              </span>
              <p className="mt-5 font-display text-3xl font-semibold text-rose-500">
                {p.price}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-warm-800">{p.description}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-warm-800">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                href={`/${locale}${p.href}`}
                variant={p.highlight ? "primary" : "secondary"}
                className="mt-8 w-full"
              >
                {p.cta}
              </Button>
              <CtaOfferSlot
                placementKey={`programs_${index}`}
                placements={placements}
                offersById={offersById}
                locale={locale}
                compact
                className="mt-4"
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
