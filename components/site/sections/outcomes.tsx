import { Check } from "lucide-react";
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
    <section className="bg-rose-50 py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
            {outcomes.title}
          </h2>
          <p className="mt-4 max-w-md text-warm-800">{outcomes.subtitle}</p>
          <Button href={`/${locale}#contact`} size="lg" className="mt-8">
            {dict.contact.cta}
          </Button>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {outcomes.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-[#F0D5CC] bg-white p-4 text-sm font-medium text-warm-800"
            >
              <span className="mt-0.5 shrink-0 text-sage-500">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
