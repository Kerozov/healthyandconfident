import { Mail, Phone, MessageCircle, CalendarHeart } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { CtaOfferSlot } from "@/components/site/cta-offer-slot";

export function Contact({
  dict,
  locale,
  placements,
  offersById,
}: {
  dict: Dictionary;
  locale: Locale;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
}) {
  const { contact } = dict;
  return (
    <section id="contact" className="scroll-mt-24 py-24">
      <Container>
        <div className="grid items-center gap-12 rounded-[2.5rem] border border-ink/10 bg-bg-card p-8 shadow-soft sm:p-12 lg:grid-cols-2">
          <div>
            <span className="font-display text-5xl">❤</span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {contact.title}
            </h2>
            <p className="mt-4 max-w-md text-ink-soft">{contact.subtitle}</p>
            <Button href={siteConfig.whatsapp} variant="primary" size="lg" className="mt-8">
              <CalendarHeart className="h-5 w-5" /> {contact.cta}
            </Button>
            <CtaOfferSlot
              placementKey="contact_cta"
              placements={placements}
              offersById={offersById}
              locale={locale}
              className="mt-4"
            />
          </div>

          <div className="space-y-4">
            <a
              href={`mailto:${siteConfig.email}`}
              className="flex items-center gap-4 rounded-2xl border border-ink/10 p-5 transition-colors hover:border-coral-400"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <Mail className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-soft/70">
                  {contact.emailLabel}
                </p>
                <p className="font-medium">{siteConfig.email}</p>
              </div>
            </a>
            <a
              href={siteConfig.phoneHref}
              className="flex items-center gap-4 rounded-2xl border border-ink/10 p-5 transition-colors hover:border-coral-400"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <Phone className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-soft/70">
                  {contact.phoneLabel}
                </p>
                <p className="font-medium">{siteConfig.phone}</p>
              </div>
            </a>
            <a
              href={siteConfig.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-ink/10 p-5 transition-colors hover:border-coral-400"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-ink-soft/70">
                  Viber / WhatsApp
                </p>
                <p className="font-medium">{siteConfig.phone}</p>
              </div>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
