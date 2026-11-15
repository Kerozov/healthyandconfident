import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getBlackFridayConfig } from "@/lib/black-friday/config";
import {
  getBlackFridayBundleOffers,
  getBlackFridayOffers,
} from "@/lib/black-friday/offers";
import { pageOpenGraph, publicSiteOrigin } from "@/lib/site";
import { blackFridayOffersOpen, blackFridayPhase } from "@/lib/site/black-friday-phase";
import { BlackFridayCountdown } from "@/components/site/black-friday/countdown";
import {
  BlackFridayBundleCard,
  BlackFridayOfferCard,
  type BlackFridayCardCopy,
} from "@/components/site/black-friday/offer-cards";

export const dynamic = "force-dynamic";

function formatDeadline(value: string | null, locale: Locale): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "bg-BG", {
    timeZone: "Europe/Sofia",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const origin = publicSiteOrigin();
  return {
    title: dict.blackFriday.title,
    description: dict.blackFriday.subtitle,
    alternates: {
      canonical: `${origin}/${locale}/black-friday`,
    },
    openGraph: pageOpenGraph(
      locale,
      `/${locale}/black-friday`,
      dict.blackFriday.title,
      dict.blackFriday.subtitle,
    ),
  };
}

/** A database or Stripe hiccup shows „offers coming soon“, never an error page. */
async function loadOffers(locale: Locale) {
  try {
    return await Promise.all([getBlackFridayOffers(locale), getBlackFridayBundleOffers(locale)]);
  } catch (err) {
    console.error("[black-friday] offers:", err instanceof Error ? err.message : err);
    return [[], []] as const;
  }
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-4 text-ink-soft">{text}</p>
    </section>
  );
}

export default async function BlackFridayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const bf = dict.blackFriday;
  const config = await getBlackFridayConfig();

  // Server time for this render — the countdown starts from it so the first
  // paint matches the HTML.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const phase = blackFridayPhase(config, now);

  if (!config || phase === "off") return <Notice title={bf.title} text={bf.comingSoonText} />;
  if (phase === "ended") return <Notice title={bf.title} text={bf.endedText} />;

  // The early-access email (26.11) links here with `?early=<key>`; with the
  // right key the offers open before the public start.
  const earlyKey = typeof query.early === "string" ? query.early.trim() : "";
  const open = blackFridayOffersOpen(config, earlyKey, now);
  const [offers, bundles] = open ? await loadOffers(l) : [[], []];

  const deadlineLabel = formatDeadline(config.deadline, l);
  const deadline = config.deadline ? new Date(config.deadline).getTime() : NaN;
  const hasOffers = offers.length > 0 || bundles.length > 0;
  const formHref = config.early_access_form_slug
    ? `/${l}/forms/${config.early_access_form_slug}`
    : null;
  const copy: BlackFridayCardCopy = {
    wasLabel: bf.wasLabel,
    savingsLabel: bf.savingsLabel,
    separatelyLabel: bf.separatelyLabel,
    includedLabel: bf.includedLabel,
    buyCta: bf.buyCta,
    bundleCta: bf.bundleCta,
    detailsLink: bf.detailsLink,
  };
  const checkoutEarlyKey = phase === "early" ? earlyKey : undefined;

  return (
    <div>
      <section className="bg-forest-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">
            {bf.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight sm:text-6xl">
            {bf.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            {bf.subtitle}
          </p>

          {open && Number.isFinite(deadline) && (
            <div className="mt-10">
              <BlackFridayCountdown
                deadline={deadline}
                now={now}
                label={bf.countdownLabel}
                units={bf.countdownUnits}
              />
              {deadlineLabel && (
                <p className="mt-4 text-sm text-white/70">
                  {bf.deadlineLabel}: {deadlineLabel}
                </p>
              )}
            </div>
          )}

          {open && hasOffers && (
            <a
              href="#offers"
              className="mt-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-gold-400 px-7 py-3 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500"
            >
              {bf.offersTitle} <ArrowDown className="h-5 w-5" aria-hidden />
            </a>
          )}
        </div>
      </section>

      {!open ? (
        <section className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center shadow-card sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-forest-600">
              {bf.earlyAccessEyebrow}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800">
              {bf.earlyAccessTitle}
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">{bf.earlyAccessText}</p>
            {formHref && (
              <Link
                href={formHref}
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold-400 px-8 py-4 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500"
              >
                {bf.earlyAccessCta}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <>
          <div id="offers" className="mx-auto max-w-6xl scroll-mt-24 space-y-14 px-4 py-14">
            {bundles.length > 0 && (
              <section aria-labelledby="bf-bundles">
                <div className="mb-6 max-w-2xl">
                  <h2
                    id="bf-bundles"
                    className="font-display text-3xl font-semibold text-slate-800"
                  >
                    {bf.bundlesTitle}
                  </h2>
                  <p className="mt-2 text-ink-soft">{bf.bundlesText}</p>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {bundles.map((bundle) => (
                    <BlackFridayBundleCard
                      key={bundle.id}
                      bundle={bundle}
                      locale={l}
                      copy={copy}
                      earlyKey={checkoutEarlyKey}
                      wide={bundles.length === 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {offers.length > 0 && (
              <section aria-labelledby="bf-offers">
                <div className="mb-6 max-w-2xl">
                  <h2
                    id="bf-offers"
                    className="font-display text-3xl font-semibold text-slate-800"
                  >
                    {bf.offersTitle}
                  </h2>
                  <p className="mt-2 text-ink-soft">{bf.offersText}</p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {offers.map((offer) => (
                    <BlackFridayOfferCard
                      key={offer.key}
                      offer={offer}
                      locale={l}
                      copy={copy}
                      earlyKey={checkoutEarlyKey}
                    />
                  ))}
                </div>
              </section>
            )}

            {!hasOffers && <p className="py-10 text-center text-ink-soft">{bf.emptyText}</p>}
          </div>

          <section className="mx-auto max-w-3xl px-4 pb-14">
            <div className="rounded-3xl bg-forest-900 p-8 text-white sm:p-10">
              <h2 className="font-display text-2xl font-semibold">{bf.guaranteeTitle}</h2>
              <p className="mt-3 leading-relaxed text-white/80">{bf.guaranteeText}</p>
            </div>
          </section>

          <section className="mx-auto max-w-3xl px-4 pb-20">
            <h2 className="font-display text-2xl font-semibold text-slate-800">{bf.faqTitle}</h2>
            <div className="mt-6 space-y-4">
              {bf.faq.map((item) => (
                <div key={item.q} className="rounded-2xl border border-forest-100 bg-white p-5">
                  <p className="font-semibold text-slate-800">{item.q}</p>
                  <p className="mt-1.5 text-ink-soft">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
