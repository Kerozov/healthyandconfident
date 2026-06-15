import Link from "next/link";
import { Leaf, Mail, Phone, MessageCircle } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <footer className="mt-24 bg-forest-700 text-cream/90">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 font-display text-xl font-semibold text-cream"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral-500">
                <Leaf className="h-5 w-5" />
              </span>
              Healthy &amp; Confident
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/70">
              {dict.footer.tagline}
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-3 text-cream/80 hover:text-cream"
              >
                <Mail className="h-4 w-4" /> {siteConfig.email}
              </a>
              <a
                href={siteConfig.phoneHref}
                className="flex items-center gap-3 text-cream/80 hover:text-cream"
              >
                <Phone className="h-4 w-4" /> {siteConfig.phone}
              </a>
              <a
                href={siteConfig.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-cream/80 hover:text-cream"
              >
                <MessageCircle className="h-4 w-4" /> Viber / WhatsApp
              </a>
            </div>
          </div>

          {dict.footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-lg font-semibold text-cream">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-cream/70 transition-colors hover:text-coral-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cream/15 pt-8 text-xs text-cream/60 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.brand}. {dict.footer.rights}
          </p>
          <p>{siteConfig.brand} · {siteConfig.name}</p>
        </div>
      </Container>
    </footer>
  );
}
