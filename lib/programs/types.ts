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
    image?: string;
  };
  galleries?: { title: string; titleAccent?: string; images: string[] }[];
  pain?: { title: string; paragraphs: string[]; hook: string };
  vision?: { title: string; paragraphs: string[] };
  audience?: {
    eyebrow?: string;
    title: string;
    items: { title: string; text: string }[];
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
  testimonials?: { quote: string; name: string }[];
  faq?: { q: string; a: string }[];
  pricing?: {
    title: string;
    titleAccent?: string;
    subtitle: string;
    options: { label: string; price: string; note: string; cta: string; href?: string }[];
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
