import { Mail, Phone, MessageCircle, CalendarHeart } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { siteConfig } from "@/lib/site";

export function Contact({
  dict,
}: {
  dict: Dictionary;
}) {
  const { contact } = dict;
  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-gradient-to-br from-green-800 to-green-900 py-24 text-white"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="font-display text-5xl">❤</span>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {contact.title}
            </h2>
            <p className="mt-4 max-w-md text-green-300">{contact.subtitle}</p>
            <CtaLink
              placementKey="contact_cta"
              href={siteConfig.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              className="mt-8 bg-gold-400 px-10 py-4 text-lg font-bold text-forest-900 shadow-xl hover:bg-gold-500 hover:shadow-2xl"
            >
              <CalendarHeart className="h-5 w-5" /> {contact.cta}
            </CtaLink>
          </div>

          <div className="space-y-4">
            <a
              href={`mailto:${siteConfig.email}`}
              className="group flex items-center gap-4 rounded-2xl border border-green-700/50 bg-green-900/30 p-5 transition-colors hover:bg-green-900/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-800/50 text-gold-400">
                <Mail className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-green-300">
                  {contact.emailLabel}
                </p>
                <p className="font-medium text-white transition-colors group-hover:text-gold-400">
                  {siteConfig.email}
                </p>
              </div>
            </a>
            <a
              href={siteConfig.phoneHref}
              className="group flex items-center gap-4 rounded-2xl border border-green-700/50 bg-green-900/30 p-5 transition-colors hover:bg-green-900/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-800/50 text-gold-400">
                <Phone className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-green-300">
                  {contact.phoneLabel}
                </p>
                <p className="font-medium text-white transition-colors group-hover:text-gold-400">
                  {siteConfig.phone}
                </p>
              </div>
            </a>
            <a
              href={siteConfig.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-green-700/50 bg-green-900/30 p-5 transition-colors hover:bg-green-900/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-800/50 text-gold-400">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-green-300">
                  Viber / WhatsApp
                </p>
                <p className="font-medium text-white transition-colors group-hover:text-gold-400">
                  {siteConfig.phone}
                </p>
              </div>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
