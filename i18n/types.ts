export type NavItem = { label: string; href: string };

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
};

/** One client result on the home page — a number first, the story second. */
export type ClientResult = {
  /** The headline figure: „−19,5 кг“, „Без диабет“. */
  value: string;
  /** What the figure means: „за 4,5 месеца“. */
  label: string;
  name: string;
  note: string;
};

export type GoogleReview = {
  name: string;
  quote: string;
  rating: number;
  date: string;
};

export type FaqItem = { q: string; a: string };

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalPageCopy = {
  title: string;
  description: string;
  sections: LegalSection[];
};

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
    /** The headline reads title + titleAccent + titleAfter; the accent is highlighted. */
    title: string;
    titleAccent: string;
    titleAfter: string;
    subtitle: string;
    bullets: string[];
    primaryCta: string;
    freeMenuCta: string;
    ratingLabel: string;
    trustLine: string;
    award: string;
    successValue: string;
    successLabel: string;
    imageAlt: string;
  };
  proof: {
    eyebrow: string;
    title: string;
    items: ClientResult[];
    credentials: string[];
    disclaimer: string;
  };
  programs: {
    eyebrow: string;
    title: string;
    subtitle: string;
    /** Fallback cards, shown only while the admin has no programme cards. */
    items: Program[];
    trustLine: string;
    helpText: string;
    helpCta: string;
    moreTitle: string;
    wasLabel: string;
  };
  guides: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    badge: string;
  };
  results: {
    eyebrow: string;
    title: string;
    subtitle: string;
    beforeLabel: string;
    afterLabel: string;
    collageCaption: string;
    pairCaptions: string[];
    videosTitle: string;
    playLabel: string;
    cta: string;
  };
  googleReviews: {
    title: string;
    aggregateRating: string;
    reviewCount: string;
    reviewCountLabel: string;
    postedOnLabel: string;
    ctaLabel: string;
    items: GoogleReview[];
  };
  audience: {
    eyebrow: string;
    title: string;
    yesTitle: string;
    yes: string[];
    noTitle: string;
    no: string[];
    cta: string;
  };
  method: {
    eyebrow: string;
    title: string;
    subtitle: string;
    pillars: { title: string; text: string }[];
    foodTitle: string;
    foodNote: string;
    highlights: string[];
  };
  about: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    credentials: string[];
    award: string;
    cta: string;
    communityCta: string;
    communityHref: string;
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
  finalCta: {
    title: string;
    subtitle: string;
    primaryCta: string;
    freeMenuTitle: string;
    freeMenuText: string;
    freeMenuCta: string;
    contactTitle: string;
  };
  stickyCta: {
    label: string;
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
    messengerLabel: string;
    messengerText: string;
    phoneLabel: string;
    whatsappLabel: string;
    whatsappText: string;
  };
  events: {
    eyebrow: string;
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
    legalPrivacy: string;
    legalTerms: string;
    legalSupport: string;
  };
  legal: {
    updatedLabel: string;
    updatedDate: string;
    privacy: LegalPageCopy;
    terms: LegalPageCopy;
    support: LegalPageCopy;
  };
  popup: {
    defaultTitle: string;
    defaultMessage: string;
    defaultCta: string;
  };
  unsubscribe: {
    title: string;
    helpBody: string;
    confirmTitle: string;
    confirmBody: string;
    confirmButton: string;
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
