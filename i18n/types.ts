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
  /** Card image (path or uploaded URL) */
  image?: string;
  /** e.g. -52% on the 21-day card */
  discountBadge?: string;
  /** Lines shown in the cream footer under the CTA button */
  footerLines?: string[];
};

export type Testimonial = {
  name: string;
  location: string;
  age?: string;
  quote: string;
};

export type GoogleReview = {
  name: string;
  quote: string;
  rating: number;
  date: string;
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
    freeMenuCta: string;
    secondaryCta: string;
    freeMenuStrip: {
      title: string;
      subtitle: string;
    };
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
  googleReviews: {
    title: string;
    subtitle: string;
    aggregateRating: string;
    reviewCount: string;
    reviewCountLabel: string;
    verifiedLabel: string;
    postedOnLabel: string;
    ctaLabel: string;
    items: GoogleReview[];
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
  bioBanner: {
    title: string;
    credentials: string[];
    invite: string;
    cta: string;
    href: string;
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
  guides: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
  };
  videos: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  challenge21: {
    title: string;
    subtitle: string;
    discount: string;
    cardLine1: string;
    cardLine2: string;
    cardSignature: string;
    bullets: string[];
    cta: string;
  };
  foodGallery: {
    eyebrow: string;
    title: string;
    subtitle: string;
    featuredAlt: string;
    featuredCaption: string;
    featuredNote: string;
    highlights: string[];
    cta: string;
    ctaSecondary: string;
  };
  results: {
    eyebrow: string;
    title: string;
    subtitle: string;
    beforeAfterCaption: string;
    stats: Stat[];
    bullets: string[];
    cta: string;
    awardsTitle: string;
    clientsTitle: string;
    clientsSubtitle: string;
    beforeLabel: string;
    afterLabel: string;
    clientCaptions: string[];
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
  unsubscribe: {
    title: string;
    helpBody: string;
    successTitle: string;
    successBody: string;
    alreadyTitle: string;
    alreadyBody: string;
    invalidTitle: string;
    invalidBody: string;
    notFoundTitle: string;
    notFoundBody: string;
    resubscribeHint: string;
    backHome: string;
  };
};
