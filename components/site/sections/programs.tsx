import { Check, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { cn } from "@/lib/utils";

export function Programs({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { programs } = dict;
  return (
    <section id="programs" className="scroll-mt-24 bg-forest-100 py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-green-600">
            <Star className="h-4 w-4" /> {locale === "bg" ? "Програми" : "Programs"}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {programs.title}
          </h2>
          <p className="mt-4 text-forest-800">{programs.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {programs.items.map((p, index) => (
            <div
              key={p.title}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6 transition-all",
                p.highlight
                  ? "scale-[1.02] border-2 border-green-500 bg-white shadow-lg"
                  : "border-green-100 bg-white hover:border-green-300 hover:shadow-md",
              )}
            >
              {p.badge && (
                <span
                  className={cn(
                    "absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold",
                    p.highlight
                      ? "bg-green-600 text-white"
                      : "bg-green-100 text-green-700",
                  )}
                >
                  {p.badge}
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold text-forest-800">{p.title}</h3>
              <span className="mt-2 inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                {p.duration}
              </span>
              <span className="mt-3 inline-flex w-fit rounded-full bg-cream-100 px-3 py-1 text-xs text-green-800">
                {p.price}
              </span>
              <p className="mt-4 text-sm leading-relaxed text-forest-800">{p.description}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-forest-800">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <CtaLink
                placementKey={`programs_${index}`}
                href={
                  p.href.startsWith("#")
                    ? `/${locale}${p.href}`
                    : `/${locale}${p.href}`
                }
                variant={p.highlight ? "primary" : "outline"}
                className={cn("mt-8 w-full py-3", p.highlight && "font-semibold")}
              >
                {p.cta}
              </CtaLink>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
