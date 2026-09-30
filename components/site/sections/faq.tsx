import { MessageCircle, Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { SectionLink } from "@/components/site/section-link";

export function Faq({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { faq, programs } = dict;

  return (
    <section id="faq" className="section-pad scroll-mt-24 bg-white">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mt-4 text-ink-soft">{faq.subtitle}</p>
          <SectionLink
            href="#contact"
            locale={locale}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 underline-offset-4 hover:underline"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {programs.helpCta}
          </SectionLink>
        </div>

        <div className="space-y-3">
          {faq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-forest-100 bg-cream transition-shadow open:bg-white open:shadow-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
