import type { Locale } from "@/i18n/config";

export type ProgramLandingSlug =
  | "zhivey-bez-rezistentnost"
  | "preprogramirai-apetita"
  | "summer-programme"
  | "po-stroyni-i-shtastlivi";

export const PROGRAM_LANDING_SLUGS: ProgramLandingSlug[] = [
  "zhivey-bez-rezistentnost",
  "preprogramirai-apetita",
  "summer-programme",
  "po-stroyni-i-shtastlivi",
];

/**
 * The short address of each programme — what comes after `/programs/` in a
 * link. The id on the left is what the code and the database know the
 * programme by (button keys, signup sources, saved card links), so it never
 * changes; only the public path is short enough to say out loud.
 */
export const PROGRAM_PUBLIC_SLUGS: Record<ProgramLandingSlug, string> = {
  "zhivey-bez-rezistentnost": "3-mes",
  "po-stroyni-i-shtastlivi": "21-dni",
  "preprogramirai-apetita": "klub",
  "summer-programme": "lyato",
};

/**
 * Addresses that used to open a programme and still must — old links, ads
 * and emails carry them. `balansirano-hranene-21` was the 21-day challenge,
 * which has its own page again, so it goes back to the challenge rather than
 * to the summer package.
 */
const RETIRED_PROGRAM_SLUGS: Record<string, ProgramLandingSlug> = {
  "balansirano-hranene-21": "po-stroyni-i-shtastlivi",
  garnituri: "summer-programme",
};

export function isProgramLandingSlug(value: string): value is ProgramLandingSlug {
  return (PROGRAM_LANDING_SLUGS as string[]).includes(value);
}

/** `/programs/3-mes` — without a language, the way site links are written. */
export function programPath(id: ProgramLandingSlug): string {
  return `/programs/${PROGRAM_PUBLIC_SLUGS[id]}`;
}

/**
 * Which programme a `/programs/<segment>` opens: the short address, the id
 * itself, or a retired name. `null` when it is none of them.
 */
export function resolveProgramSlug(segment: string): ProgramLandingSlug | null {
  const wanted = segment.trim().toLowerCase();
  if (!wanted) return null;
  for (const id of PROGRAM_LANDING_SLUGS) {
    if (PROGRAM_PUBLIC_SLUGS[id] === wanted) return id;
  }
  if (isProgramLandingSlug(wanted)) return wanted;
  return RETIRED_PROGRAM_SLUGS[wanted] ?? null;
}

/**
 * A link written with a programme's id or a retired name, rewritten to the
 * short address; anything else is returned untouched. Saved card links and
 * old blog posts keep working without a redirect hop.
 */
export function shortenProgramHref(href: string): string {
  return href.replace(
    /^((?:\/(?:bg|en))?\/programs\/)([^/?#]+)/i,
    (whole, head: string, segment: string) => {
      const id = resolveProgramSlug(segment);
      return id ? `${head}${PROGRAM_PUBLIC_SLUGS[id]}` : whole;
    },
  );
}

export type ProgramLandingContent = {
  slug: ProgramLandingSlug;
  meta: { title: string; description: string };
  /**
   * Keep the page out of search while the programme is not on sale yet. The
   * URL still works, so the landing can be shared and reviewed — it simply is
   * not indexed until the buttons carry a real price.
   */
  noindex?: boolean;
  hero: {
    eyebrow: string;
    title: string;
    titleAccent?: string;
    subtitle: string;
    bullets?: string[];
    priceLine?: string;
    primaryCta: string;
    primaryHref: string;
    secondaryCta?: string;
    secondaryHref?: string;
    placementKey?: string;
    image?: string;
  };
  galleries?: { title: string; titleAccent?: string; images: string[] }[];
  pain?: { title: string; paragraphs: string[]; hook: string };
  vision?: { title: string; paragraphs: string[]; image?: string };
  audience?: {
    eyebrow?: string;
    title: string;
    items: { title: string; text: string; bullets?: string[] }[];
    closing?: string;
  };
  visualize?: { title: string; items: string[]; image?: string };
  education?: {
    sections: { title: string; bullets: string[]; image?: string }[];
  };
  comparison?: {
    title: string;
    positive: { title: string; bullets: string[] };
    negative: { title: string; bullets: string[]; closing?: string };
  };
  transformation?: {
    title?: string;
    before: string[];
    after: string[];
    beforeImage?: string;
    afterImage?: string;
    audienceTitle?: string;
    audienceBullets?: string[];
  };
  valueStack?: {
    title: string;
    modules: { title: string; value: string; text: string; image?: string }[];
    bonusesTitle: string;
    bonuses: { title: string; value: string; text: string; image?: string }[];
    totalValue: string;
    totalNote?: string;
  };
  promoStrip?: {
    title: string;
    subtitle: string;
    stat: string;
    checklist: string[];
    footer?: string;
    image?: string;
  };
  outcomes?: { eyebrow?: string; title: string; items: { title: string; text: string }[] };
  curriculum?: {
    intro?: string;
    title: string;
    items: { title: string; text: string }[];
    bonuses?: string[];
    closing?: string;
  };
  pillars?: { title: string; items: { title: string; text: string }[] };
  includes?: { title: string; items: { title: string; text: string }[] };
  testimonials?: { headline?: string; quote: string; name: string }[];
  /** Shown under the results — e.g. that outcomes vary per person. */
  testimonialsNote?: string;
  faq?: { q: string; a: string }[];
  pricing?: {
    title: string;
    titleAccent?: string;
    subtitle: string;
    audienceTitle?: string;
    audienceBullets?: string[];
    includesList?: { title: string; value: string }[];
    options: {
      label: string;
      badge?: string;
      price: string;
      note: string;
      cta: string;
      href?: string;
    }[];
    ps?: string;
    showCountdown?: boolean;
  };
  trust?: {
    title: string;
    greeting: string;
    credentials: string[];
    accolades: string[];
    image?: string;
  };
  video?: { title: string; titleAccent?: string; cta: string; href: string };
  newsletter?: {
    title: string;
    placeholder: string;
    button: string;
    consent: string;
    success: string;
    error: string;
  };
  finalCta?: { title: string; cta: string; href: string };
};

export type ProgramLandingsByLocale = Record<Locale, Record<ProgramLandingSlug, ProgramLandingContent>>;
