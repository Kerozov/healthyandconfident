import type { Locale } from "@/i18n/config";

export type ProgramLandingSlug =
  | "zhivey-bez-rezistentnost"
  | "preprogramirai-apetita"
  | "garnituri";

export const PROGRAM_LANDING_SLUGS: ProgramLandingSlug[] = [
  "zhivey-bez-rezistentnost",
  "preprogramirai-apetita",
  "garnituri",
];

export type ProgramLandingContent = {
  slug: ProgramLandingSlug;
  meta: { title: string; description: string };
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
  vision?: { title: string; paragraphs: string[] };
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
    couple: string;
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
