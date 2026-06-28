import { Plus } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Faq({ dict }: { dict: Dictionary }) {
  const { faq } = dict;
  return (
    <section className="bg-warm-50 py-24">
      <Container className="max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mt-4 text-warm-800">{faq.subtitle}</p>
        </div>

        <div className="mt-12 space-y-3">
          {faq.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-[#F0D5CC] bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-warm-900">
                {item.q}
                <Plus className="h-5 w-5 shrink-0 text-rose-400 transition-transform group-open:rotate-45" />
              </summary>
              <p className="border-t border-[#F0D5CC] px-5 pb-4 pt-3 text-sm leading-relaxed text-warm-700">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
