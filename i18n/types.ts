export type NavItem = { label: string; href: string };

export type Stat = { value: string; label: string };

export type Problem = { icon: string; text: string };

export type Program = {
  badge?: string;
  title: string;
  duration: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
};

export type Testimonial = {
  name: string;
  location: string;
  age?: string;
  quote: string;
};

export type FaqItem = { q: string; a: string };

export type Dictionary = {
  meta: {
    title: string;
    description: string;
    keywords: string[];
    ogAlt: string;
  };
  nav: {
    items: NavItem[];
    cta: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    subtitle: string;
    bullets: string[];
    primaryCta: string;
    secondaryCta: string;
    stats: Stat[];
    imageAlt: string;
  };
  problems: {
    title: string;
    subtitle: string;
    items: Problem[];
    note: string;
  };
  outcomes: {
    title: string;
    subtitle: string;
    items: string[];
  };
  about: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    credentials: string[];
    cta: string;
  };
  method: {
    title: string;
    subtitle: string;
    pillars: { title: string; text: string }[];
  };
  programs: {
    title: string;
    subtitle: string;
    items: Program[];
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: Testimonial[];
  };
  leadMagnet: {
    title: string;
    subtitle: string;
    placeholder: string;
    button: string;
    consent: string;
    success: string;
    error: string;
  };
  faq: {
    title: string;
    subtitle: string;
    items: FaqItem[];
  };
  blog: {
    title: string;
    subtitle: string;
    readMore: string;
    backToBlog: string;
    empty: string;
    minRead: string;
    related: string;
  };
  contact: {
    title: string;
    subtitle: string;
    emailLabel: string;
    phoneLabel: string;
    cta: string;
  };
  events: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  shop: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  footer: {
    tagline: string;
    rights: string;
    columns: { title: string; links: NavItem[] }[];
  };
  popup: {
    defaultTitle: string;
    defaultMessage: string;
    defaultCta: string;
  };
};
