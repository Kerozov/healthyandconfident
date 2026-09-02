import { Phone, MessageCircle } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { SiteContactConfig } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MessengerIcon } from "@/components/site/messenger-widget";

export function Contact({
  dict,
  locale,
  contactConfig,
}: {
  dict: Dictionary;
  locale: Locale;
  contactConfig: SiteContactConfig;
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
              href={`/${locale}#programs`}
              size="lg"
              variant="forest"
              className="mt-6 w-full px-8 sm:mt-8 sm:w-auto"
            >
              {contact.cta}
            </Button>
          </div>

          <div className="space-y-4">
            <a
              href={contactConfig.messenger_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-700/30 p-5 transition-colors hover:bg-slate-700/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700/60">
                <MessengerIcon className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  {contact.messengerLabel}
                </p>
                <p className="font-medium text-white transition-colors group-hover:text-gold-400">
                  {contact.messengerText}
                </p>
              </div>
            </a>
            <a
              href={contactConfig.phoneHref}
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
                  {contactConfig.phone}
                </p>
              </div>
            </a>
            <a
              href={contactConfig.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-xl border border-slate-600/50 bg-slate-700/30 p-5 transition-colors hover:bg-slate-700/50"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700/60 text-gold-400">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">
                  {contact.whatsappLabel}
                </p>
                <p className="font-medium text-white transition-colors group-hover:text-gold-400">
                  {contactConfig.phone}
                </p>
              </div>
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
