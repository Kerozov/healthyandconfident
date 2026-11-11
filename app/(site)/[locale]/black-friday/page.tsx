import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getSiteBundles, getBlackFridayConfig } from "@/lib/site/bundles";
import { BlackFridayBundleCard } from "@/components/site/black-friday-bundle-card";
import { pageOpenGraph, publicSiteOrigin } from "@/lib/site";
import { blackFridayPhase } from "@/lib/site/black-friday-phase";

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
  const [dict, config, bundles] = await Promise.all([
    getDictionary(l),
    getBlackFridayConfig(),
    getSiteBundles(),
  ]);
  const bf = dict.blackFriday;

  const phase = blackFridayPhase(config);

  if (!config || phase === "off") {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-slate-800">
          {bf.title}
        </h1>
        <p className="mt-4 text-ink-soft">
          {l === "bg"
            ? "Черният петък скоро предстои. Върни се малко по-късно."
            : "Black Friday is coming soon. Check back a little later."}
        </p>
      </section>
    );
  }

  if (phase === "ended") {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-slate-800">
          {bf.title}
        </h1>
        <p className="mt-4 text-ink-soft">{bf.endedText}</p>
      </section>
    );
  }

  // The early-access email (26.11) links here with `?early=<key>`; with the
  // right key the offers open before the public start.
  const earlyKey = typeof query.early === "string" ? query.early.trim() : "";
  const hasEarlyKey = Boolean(config.early_access_key) && earlyKey === config.early_access_key;
  const earlyAccessOnly = phase === "early" && !hasEarlyKey;
  const deadlineLabel = formatDeadline(config.deadline, l);

  const visibleBundles = bundles.filter((b) =>
    l === "en" ? b.enabled_en !== false : b.enabled !== false,
  );

  const formHref = config.early_access_form_slug
    ? `/${l}/forms/${config.early_access_form_slug}`
    : null;

  return (
    <div>
      <section className="bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-600">
            {bf.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-slate-800 sm:text-5xl">
            {bf.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {bf.subtitle}
          </p>
          {deadlineLabel && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest-900 px-5 py-2 text-sm font-semibold text-white">
              {bf.deadlineLabel}: {deadlineLabel}
            </p>
          )}
        </div>
      </section>

      {earlyAccessOnly ? (
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
                className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-full bg-gold-400 px-8 py-4 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500"
              >
                {bf.earlyAccessCta}
              </Link>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-6xl px-4 py-14">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleBundles.map((bundle) => (
                <BlackFridayBundleCard
                  key={bundle.id}
                  bundle={bundle}
                  locale={l}
                  includedLabel={bf.includedLabel}
                  wasLabel={bf.wasLabel}
                  notAvailable={bf.notAvailable}
                />
              ))}
            </div>
            {visibleBundles.length === 0 && (
              <p className="py-10 text-center text-ink-soft">
                {l === "bg"
                  ? "Офертите се подготвят. Върни се съвсем скоро."
                  : "The offers are being prepared. Check back very soon."}
              </p>
            )}
          </section>

          <section className="mx-auto max-w-3xl px-4 pb-14">
            <div className="rounded-3xl bg-forest-900 p-8 text-white sm:p-10">
              <h2 className="font-display text-2xl font-semibold">{bf.guaranteeTitle}</h2>
              <p className="mt-3 leading-relaxed text-white/80">{bf.guaranteeText}</p>
            </div>
          </section>

          <section className="mx-auto max-w-3xl px-4 pb-20">
            <h2 className="font-display text-2xl font-semibold text-slate-800">
              {l === "bg" ? "Често задавани въпроси" : "Frequently asked questions"}
            </h2>
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
