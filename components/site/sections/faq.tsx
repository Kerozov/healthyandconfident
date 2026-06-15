import { Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Faq({ dict }: { dict: Dictionary }) {
  const { faq } = dict;
  return (
    <section className="py-24">
      <Container className="max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mt-4 text-ink-soft">{faq.subtitle}</p>
        </div>

        <div className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
          {faq.items.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium">
                {item.q}
                <Plus className="h-5 w-5 shrink-0 text-coral-500 transition-transform group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
