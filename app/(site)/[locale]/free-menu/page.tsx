import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { publicSiteOrigin, pageOpenGraph } from "@/lib/site";
import { freeMenuPath } from "@/lib/site/free-menu";
import { getPopupThankYouConfig } from "@/lib/site/popup-config";
import { Container } from "@/components/ui/container";
import { FreeMenuForm } from "@/components/site/free-menu-form";
import { SiteImage } from "@/components/site/site-image";
import { StarRow } from "@/components/site/star-row";

/** Same portrait as the home page hero, so the person behind the menu is recognisable. */
const PORTRAIT = "/images/3.jpg";
const AUTHOR: Record<Locale, string> = { bg: "Веси Ней", en: "Vessie Nay" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { leadMagnet } = getDictionary(locale);
  const path = freeMenuPath(locale);

  return {
    title: leadMagnet.title,
    description: leadMagnet.subtitle,
    alternates: {
      canonical: `${publicSiteOrigin()}${path}`,
      languages: {
        bg: freeMenuPath("bg"),
        en: freeMenuPath("en"),
      },
    },
    openGraph: pageOpenGraph(locale, path, leadMagnet.title, leadMagnet.subtitle),
  };
}

/**
 * The free menu on a page of its own: the hero's popup form, reachable by a
 * plain link from ads, a bio or a message. Signups land exactly where the
 * popup's do - `free-menu` segment, same emails - with their own source.
 */
export default async function FreeMenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const [dict, popupConfig] = await Promise.all([
    getDictionary(l),
    getPopupThankYouConfig(l),
  ]);
  const { leadMagnet, hero } = dict;

  return (
    <section className="relative overflow-hidden bg-cream pb-14 pt-8 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-forest-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl"
      />

      <Container className="relative grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="max-w-xl animate-fade-up lg:pt-6">
          <p className="eyebrow">
            <Gift className="h-4 w-4" aria-hidden />
            {l === "bg" ? "Безплатен подарък" : "Free gift"}
          </p>

          <h1 className="mt-4 font-display text-[2rem] font-semibold leading-[1.12] tracking-tight text-slate-800 sm:text-5xl text-balance">
            {leadMagnet.title}
          </h1>

          <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">
            {leadMagnet.subtitle}
          </p>

          <div className="mt-7 flex items-center gap-3">
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
              <SiteImage
                src={PORTRAIT}
                alt=""
                fill
                priority
                sizes="56px"
                imageClassName="object-cover object-[center_15%]"
              />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800">{AUTHOR[l]}</p>
              <p className="text-sm text-ink-soft">{hero.eyebrow}</p>
            </div>
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-soft">
            <StarRow rating={5} />
            <span className="font-semibold text-slate-800">{hero.ratingLabel}</span>
            <span aria-hidden className="text-forest-300">·</span>
            <span>{hero.trustLine}</span>
          </p>
        </div>

        <div className="w-full rounded-2xl bg-white p-5 shadow-soft ring-1 ring-forest-100 sm:rounded-3xl sm:p-7">
          <FreeMenuForm
            locale={l}
            segmentTag={popupConfig?.segment_tag}
            button={leadMagnet.button}
            consent={leadMagnet.consent}
            success={popupConfig?.success_message?.trim() || leadMagnet.success}
          />
        </div>
      </Container>
    </section>
  );
}
