import { BadgeCheck } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

/**
 * Right under the hero: what clients actually achieved, in numbers. Proof is
 * the one thing a competitor cannot copy, so it comes before any offer.
 */
export function ProofStrip({ dict }: { dict: Dictionary }) {
  const { proof } = dict;

  return (
    <section
      aria-labelledby="proof-title"
      className="border-y border-forest-100 bg-white py-12 sm:py-16"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{proof.eyebrow}</p>
          <h2
            id="proof-title"
            className="mt-2 font-display text-2xl font-semibold text-slate-800 sm:text-3xl"
          >
            {proof.title}
          </h2>
        </div>

        <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
          {proof.items.map((item) => (
            <li
              key={item.name}
              className="flex flex-col rounded-2xl border border-forest-100 bg-cream p-4 sm:p-5"
            >
              <p className="font-display text-[1.45rem] font-semibold leading-none tabular-nums text-forest-600 sm:text-3xl lg:text-4xl">
                {item.value}
              </p>
              <p className="mt-2 text-sm font-semibold leading-snug text-slate-800">
                {item.label}
              </p>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-soft sm:text-sm">{item.note}</p>
              <p className="mt-3 text-xs font-semibold text-slate-700">— {item.name}</p>
            </li>
          ))}
        </ul>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-700 sm:text-sm">
          {proof.credentials.map((line) => (
            <li key={line} className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-forest-500" aria-hidden />
              {line}
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-4 max-w-xl text-center text-[11px] leading-relaxed text-ink-soft/80">
          {proof.disclaimer}
        </p>
      </Container>
    </section>
  );
}
