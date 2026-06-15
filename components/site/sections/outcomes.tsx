import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Outcomes({ dict }: { dict: Dictionary }) {
  const { outcomes } = dict;
  return (
    <section className="py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {outcomes.title}
          </h2>
          <p className="mt-4 max-w-md text-ink-soft">{outcomes.subtitle}</p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-coral-300/25 px-6 py-4">
            <span className="font-display text-4xl font-semibold text-coral-600">❤</span>
            <p className="max-w-[15rem] text-sm font-medium text-ink">
              {dict.contact.subtitle.split(".")[0]}.
            </p>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {outcomes.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4 text-sm font-medium"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-500 text-cream">
                <Check className="h-3.5 w-3.5" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
