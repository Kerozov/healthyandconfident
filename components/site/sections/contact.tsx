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
    <section
      id="contact"
      className="scroll-mt-24 bg-gradient-to-br from-sage-600 to-sage-800 py-24 text-white"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="font-display text-5xl">❤</span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {contact.title}
            </h2>
            <p className="mt-4 max-w-md text-white/90">{contact.subtitle}</p>
            <Button
              href={siteConfig.whatsapp}
              size="lg"
              className="mt-8 bg-rose-400 px-8 py-4 text-lg font-medium text-white shadow-lg hover:bg-rose-300"
            >
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
              className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:bg-white/10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-rose-300">
                <Mail className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/60">
                  {contact.emailLabel}
                </p>
                <p className="font-medium text-white">{siteConfig.email}</p>
              </div>
            </a>
            <a
              href={siteConfig.phoneHref}
              className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:bg-white/10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-rose-300">
                <Phone className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/60">
                  {contact.phoneLabel}
                </p>
                <p className="font-medium text-white">{siteConfig.phone}</p>
              </div>
            </a>
            <a
              href={siteConfig.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:bg-white/10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-rose-300">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/60">
                  Viber / WhatsApp
                </p>
                <p className="font-medium text-white">{siteConfig.phone}</p>
              </div>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
