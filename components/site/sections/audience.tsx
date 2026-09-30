import { Check, X } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { SectionLink } from "@/components/site/section-link";
import { cn } from "@/lib/utils";

/**
 * Says plainly who this is for — and who it is not for. Turning the wrong
 * people away makes the right ones lean in.
 */
export function Audience({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { audience } = dict;

  return (
    <section id="audience" className="section-pad scroll-mt-24 bg-white">
      {/* The problems checklist this replaced. */}
      <div id="problems" className="sr-only" />
      <Container className="max-w-5xl">
        <div className="text-center">
          <p className="eyebrow">{audience.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {audience.title}
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-forest-200 bg-forest-50 p-6 sm:p-8">
            <h3 className="font-display text-xl font-semibold text-forest-700">
              {audience.yesTitle}
            </h3>
            <ul className="mt-5 space-y-3">
              {audience.yes.map((line) => (
                <li key={line} className="flex items-start gap-3 text-[15px] text-slate-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h3 className="font-display text-xl font-semibold text-slate-600">
              {audience.noTitle}
            </h3>
            <ul className="mt-5 space-y-3">
              {audience.no.map((line) => (
                <li key={line} className="flex items-start gap-3 text-[15px] text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-white">
                    <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <SectionLink
            href="#programs"
            locale={locale}
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              "w-full rounded-full sm:w-auto",
            )}
          >
            {audience.cta}
          </SectionLink>
        </div>
      </Container>
    </section>
  );
}
