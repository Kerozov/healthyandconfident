import type { SiteGuide, SiteSection } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { BookOpen } from "lucide-react";
import { GuidesGrid } from "@/components/site/sections/guides-grid";

export function GuidesSection({
  dict,
  locale,
  section,
  guides,
}: {
  dict: Dictionary;
  locale: Locale;
  section: SiteSection;
  guides: SiteGuide[];
}) {
  if (guides.length === 0) return null;

  const title =
    locale === "bg"
      ? section.title_bg || dict.guides.title
      : section.title_en || dict.guides.title;

  return (
    <section id="guides" className="section-pad scroll-mt-24 bg-cream-2/40">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">
            <BookOpen className="h-4 w-4" /> {dict.guides.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-ink-soft">{dict.guides.subtitle}</p>
        </div>

        <GuidesGrid guides={guides} locale={locale} cta={dict.guides.cta} />
      </Container>
    </section>
  );
}
