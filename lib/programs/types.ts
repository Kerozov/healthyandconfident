import type { Locale } from "@/i18n/config";

export type ProgramLandingSlug =
  | "zhivey-bez-rezistentnost"
  | "preprogramirai-apetita"
  | "balansirano-hranene-21";

export const PROGRAM_LANDING_SLUGS: ProgramLandingSlug[] = [
  "zhivey-bez-rezistentnost",
  "preprogramirai-apetita",
  "balansirano-hranene-21",
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
    primaryCta: string;
    primaryHref: string;
    secondaryCta?: string;
    secondaryHref?: string;
    placementKey?: string;
  };
  pain?: { title: string; paragraphs: string[]; hook: string };
  vision?: { title: string; paragraphs: string[] };
  outcomes?: { title: string; items: { title: string; text: string }[] };
  pillars?: { title: string; items: { title: string; text: string }[] };
  includes?: { title: string; items: { title: string; text: string }[] };
  testimonials?: { quote: string; name: string }[];
  faq?: { q: string; a: string }[];
  pricing?: {
    title: string;
    subtitle: string;
    options: { label: string; price: string; note: string; cta: string }[];
    ps?: string;
  };
  finalCta?: { title: string; cta: string; href: string };
};

export type ProgramLandingsByLocale = Record<Locale, Record<ProgramLandingSlug, ProgramLandingContent>>;
