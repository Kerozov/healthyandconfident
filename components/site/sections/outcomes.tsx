import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";

export function Outcomes({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { outcomes } = dict;
  return (
    <section className="section-pad bg-slate-800 text-white">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {outcomes.title}
          </h2>
          <p className="mt-4 max-w-md text-white">{outcomes.subtitle}</p>
          <CtaLink
            placementKey="outcomes_cta"
            href={`/${locale}#contact`}
            size="lg"
            className="mt-8 bg-slate-500 px-8 py-4 font-bold text-white shadow-lg hover:bg-slate-600 hover:shadow-xl"
          >
            {dict.contact.cta}
          </CtaLink>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {outcomes.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-slate-500/40 bg-slate-800/30 p-4 text-sm font-medium text-slate-100"
            >
              <span className="mt-0.5 shrink-0 text-gold-400">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
