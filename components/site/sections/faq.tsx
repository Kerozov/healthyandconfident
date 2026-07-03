import { Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Faq({ dict }: { dict: Dictionary }) {
  const { faq } = dict;
  return (
    <section id="faq" className="section-pad scroll-mt-24 bg-white">
      <Container className="max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mt-4 text-ink-soft">{faq.subtitle}</p>
        </div>

        <div className="mt-12 space-y-3">
          {faq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-forest-100 bg-cream transition-shadow hover:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-slate-800">
                {item.q}
                <Plus className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-open:rotate-45" />
              </summary>
              <p className="border-t border-forest-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-ink-soft">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
