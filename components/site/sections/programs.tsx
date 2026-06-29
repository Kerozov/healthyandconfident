import { Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { ProgramsShowcaseGrid } from "@/components/site/sections/programs-grid";

export function Programs({
  dict,
  locale,
  products = [],
}: {
  dict: Dictionary;
  locale: Locale;
  products?: SiteProduct[];
}) {
  const { programs } = dict;
  return (
    <section id="programs" className="scroll-mt-24 bg-forest-100 py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-green-600">
            <Star className="h-4 w-4" /> {locale === "bg" ? "Програми" : "Programs"}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {programs.title}
          </h2>
          <p className="mt-4 text-forest-800">{programs.subtitle}</p>
        </div>

        <ProgramsShowcaseGrid items={programs.items} products={products} locale={locale} />
      </Container>
    </section>
  );
}
