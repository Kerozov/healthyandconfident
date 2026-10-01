import { ArrowRight, Gift, MessageCircle, Phone } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import type { SiteContactConfig } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { OpenMenuButton } from "@/components/site/open-menu-button";
import { SectionLink } from "@/components/site/section-link";
import { SiteImage } from "@/components/site/site-image";
import { MessengerIcon } from "@/components/site/messenger-widget";
import { ContactLinkIconGlyph } from "@/components/site/contact-link-icon";
import { mediaAlt } from "@/lib/site/media-gallery";
import {
  isExternalContactHref,
  visibleContactLinks,
} from "@/lib/site/contact-links";
import { cn } from "@/lib/utils";

const MENU_IMAGE = "/images/11.jpg";

/**
 * The close: one more push to a programme, a free menu for everyone who is not
 * ready to pay yet (so they stay in touch), and every way to ask a question.
 */
export function FinalCta({
  dict,
  locale,
  contactConfig,
}: {
  dict: Dictionary;
  locale: Locale;
  contactConfig: SiteContactConfig;
}) {
  const { finalCta, contact } = dict;
  const extraLinks = visibleContactLinks(contactConfig.extra_links);

  const channels = [
    contactConfig.messenger_url.trim() && {
      key: "messenger",
      href: contactConfig.messenger_url,
      label: contact.messengerLabel,
      text: contact.messengerText,
      icon: <MessengerIcon className="h-6 w-6" />,
    },
    contactConfig.phone_href.trim() && {
      key: "phone",
      href: contactConfig.phone_href,
      label: contact.phoneLabel,
      text: contactConfig.phone,
      icon: <Phone className="h-5 w-5" aria-hidden />,
    },
    contactConfig.whatsapp_url.trim() && {
      key: "whatsapp",
      href: contactConfig.whatsapp_url,
      label: contact.whatsappLabel,
      text: contact.whatsappText,
      icon: <MessageCircle className="h-5 w-5" aria-hidden />,
    },
    ...extraLinks.map((link) => ({
      key: link.id,
      href: link.href,
      label: link.label,
      text: link.text || link.label,
      icon: <ContactLinkIconGlyph name={link.icon} className="h-5 w-5" />,
    })),
  ].filter((row): row is Exclude<typeof row, "" | false> => Boolean(row));

  return (
    <section id="contact" className="section-pad scroll-mt-24 border-b border-white/10 bg-slate-900 text-white">
      {/* The free-menu banner and lead form that used to sit here. */}
      <div id="free-menu" className="sr-only" />
      <div id="lead" className="sr-only" />
      <Container className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
        <div>
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.75rem] text-balance">
            {finalCta.title}
          </h2>
          <p className="mt-4 max-w-lg text-lg text-slate-300">{finalCta.subtitle}</p>
          <SectionLink
            href="#programs"
            locale={locale}
            className={cn(
              buttonVariants({ variant: "onDark", size: "lg" }),
              "mt-8 h-14 w-full rounded-full px-10 text-base sm:w-auto",
            )}
          >
            {finalCta.primaryCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </SectionLink>

          {channels.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {finalCta.contactTitle}
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {channels.map((channel) => {
                  const external = isExternalContactHref(channel.href);
                  return (
                    <li key={channel.key}>
                      <a
                        href={channel.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="group flex items-center gap-3 rounded-2xl border border-slate-600/50 bg-slate-700/30 p-3.5 transition-colors hover:bg-slate-700/60"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700/70 text-gold-400">
                          {channel.icon}
                        </span>
                        <span className="min-w-0">
                          {channel.label && (
                            <span className="block truncate text-[11px] uppercase tracking-wider text-slate-400">
                              {channel.label}
                            </span>
                          )}
                          <span className="block truncate text-sm font-medium text-white transition-colors group-hover:text-gold-400">
                            {channel.text}
                          </span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl bg-white text-slate-800 shadow-2xl">
          <div className="relative aspect-[16/10]">
            <SiteImage
              src={MENU_IMAGE}
              alt={mediaAlt(MENU_IMAGE, locale)}
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
            />
          </div>
          <div className="p-6 sm:p-8">
            <p className="eyebrow">
              <Gift className="h-4 w-4" aria-hidden /> {finalCta.freeMenuTitle}
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold leading-snug">
              {dict.leadMagnet.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{finalCta.freeMenuText}</p>
            <OpenMenuButton
              source="final-cta"
              variant="forest"
              size="lg"
              className="mt-6 w-full rounded-full"
            >
              {finalCta.freeMenuCta}
            </OpenMenuButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
