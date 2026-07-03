import { Mail, Phone, MessageCircle, CalendarHeart } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
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
      className="section-pad scroll-mt-24 bg-slate-800 text-white"
    >
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="font-display text-5xl text-forest-400">❤</span>
            <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
              {contact.title}
            </h2>
            <p className="mt-4 max-w-md text-slate-300">{contact.subtitle}</p>
            <Button
              href={siteConfig.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              variant="forest"
              className="mt-8 px-10"
            >
              <CalendarHeart className="h-5 w-5" /> {contact.cta}
            </Button>
          </div>

          <div className="space-y-4">
            <a
              href={`mailto:${siteConfig.email}`}
              className="group flex items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-700/30 p-5 transition-colors hover:bg-slate-700/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700/60 text-gold-400">
                <Mail className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  {contact.emailLabel}
                </p>
                <p className="font-medium text-white transition-colors group-hover:text-gold-400">
                  {siteConfig.email}
                </p>
              </div>
            </a>
            <a
              href={siteConfig.phoneHref}
              className="group flex items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-700/30 p-5 transition-colors hover:bg-slate-700/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700/60 text-gold-400">
                <Phone className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
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
              className="group flex items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-700/30 p-5 transition-colors hover:bg-slate-700/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700/60 text-gold-400">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
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
