import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";
import { legalCopy, legalPath, type LegalSlug } from "@/lib/site/legal";

export function LegalDocument({
  locale,
  dict,
  slug,
}: {
  locale: Locale;
  dict: Dictionary;
  slug: LegalSlug;
}) {
  const page = legalCopy(dict, slug);
  const others = (
    [
      ["privacy", dict.footer.legalPrivacy],
      ["terms", dict.footer.legalTerms],
      ["support", dict.footer.legalSupport],
    ] as const
  ).filter(([key]) => key !== slug);

  return (
    <div className="bg-cream py-16 sm:py-20">
      <Container>
        <article className="mx-auto max-w-3xl">
          <p className="text-sm text-ink-soft">
            {dict.legal.updatedLabel}: {dict.legal.updatedDate}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
            {page.title}
          </h1>
          <p className="mt-4 text-lg text-ink-soft">{page.description}</p>

          {slug === "support" && (
            <div className="mt-8 space-y-3 rounded-2xl border border-forest-100 bg-white p-5 text-sm">
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-3 text-ink hover:text-forest-700"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {siteConfig.email}
              </a>
              <a
                href={siteConfig.phoneHref}
                className="flex items-center gap-3 text-ink hover:text-forest-700"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {siteConfig.phone}
              </a>
              <a
                href={siteConfig.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-ink hover:text-forest-700"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Viber / WhatsApp
              </a>
            </div>
          )}

          <div className="prose prose-hc prose-lg mt-10 max-w-none prose-headings:font-display prose-headings:font-semibold">
            {page.sections.map((section) => (
              <section key={section.heading} className="mt-8">
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>

          <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-ink/10 pt-6 text-sm">
            {others.map(([key, label]) => (
              <Link
                key={key}
                href={legalPath(locale, key)}
                className="text-forest-700 underline-offset-2 hover:underline"
              >
                {label}
              </Link>
            ))}
            <Link
              href={`/${locale}`}
              className="text-ink-soft hover:text-ink"
            >
              {dict.unsubscribe.backHome}
            </Link>
          </nav>
        </article>
      </Container>
    </div>
  );
}
