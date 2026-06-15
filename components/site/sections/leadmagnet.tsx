import { Gift } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { LeadForm } from "@/components/site/lead-form";

export function LeadMagnet({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { leadMagnet } = dict;
  return (
    <section id="lead" className="scroll-mt-24 py-24">
      <Container>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-forest-600 px-7 py-14 text-cream sm:px-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-coral-400/30 blur-3xl" />
          <div className="relative mx-auto max-w-2xl text-center">
            <span className="eyebrow justify-center text-coral-300">
              <Gift className="h-4 w-4" />
              {locale === "bg" ? "Безплатен подарък" : "Free gift"}
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {leadMagnet.title}
            </h2>
            <p className="mt-4 text-cream/80">{leadMagnet.subtitle}</p>
            <div className="mt-8 [&_p]:text-cream/60">
              <LeadForm
                locale={locale}
                placeholder={leadMagnet.placeholder}
                button={leadMagnet.button}
                consent={leadMagnet.consent}
                success={leadMagnet.success}
                error={leadMagnet.error}
                segmentTag="weight-loss"
                source="lead-magnet"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
