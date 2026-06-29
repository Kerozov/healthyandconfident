import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export function Outcomes({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { outcomes } = dict;
  return (
    <section className="bg-gradient-to-r from-green-700 to-green-800 py-24 text-white">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {outcomes.title}
          </h2>
          <p className="mt-4 max-w-md text-white">{outcomes.subtitle}</p>
          <Button
            href={`/${locale}#contact`}
            size="lg"
            className="mt-8 bg-gold-400 px-8 py-4 font-bold text-forest-900 shadow-lg hover:bg-gold-500 hover:shadow-xl"
          >
            {dict.contact.cta}
          </Button>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {outcomes.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-green-600/40 bg-green-800/30 p-4 text-sm font-medium text-green-100"
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
