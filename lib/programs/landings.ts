import type { Locale } from "@/i18n/config";
import type { ProgramLandingContent, ProgramLandingSlug } from "./types";
import { zhiveyBezRezistentnostBg } from "./content/zhivey-bez-rezistentnost.bg";
import { preprogramiraiApetitaBg } from "./content/preprogramirai-apetita.bg";
import { garnituriBg } from "./content/garnituri.bg";

const whatsapp = "https://wa.me/447876565263";

const bg: Record<ProgramLandingSlug, ProgramLandingContent> = {
  "zhivey-bez-rezistentnost": zhiveyBezRezistentnostBg,
  "preprogramirai-apetita": preprogramiraiApetitaBg,
  "garnituri": garnituriBg,
};

const en: Record<ProgramLandingSlug, ProgramLandingContent> = {
  "zhivey-bez-rezistentnost": {
    ...zhiveyBezRezistentnostBg,
    meta: {
      title: "Live Without Resistance | 3-Month Program — Vessie Nay",
      description:
        "Sustainable weight loss and insulin resistance support. 94% success rate — without hunger or deprivation.",
    },
    hero: {
      ...zhiveyBezRezistentnostBg.hero,
      eyebrow: "3-month program · 94% success",
      title: "Unlock your",
      titleAccent: "best shape",
      subtitle:
        "Live without restrictions! Rediscover your body and confidence with the proven Live Without Resistance system.",
      bullets: [
        "Lose 5–15 kg in 3 months",
        "Tackle insulin resistance & Type 2 Diabetes",
        "No hunger, no another diet",
      ],
      primaryCta: "Join today",
      secondaryCta: "See what's included",
    },
    galleries: zhiveyBezRezistentnostBg.galleries?.map((g, i) => ({
      ...g,
      title: i === 0 ? "Eating" : "And here's what we'll eat",
      titleAccent: i === 0 ? "like this" : undefined,
    })),
    pain: {
      title: "Does this sound like you?",
      paragraphs: zhiveyBezRezistentnostBg.pain!.paragraphs,
      hook: "You're not alone — there is already a solution!",
    },
    vision: {
      title: "Imagine…",
      paragraphs: [
        "Waking with energy, wearing what you love with confidence, enjoying food without guilt.",
        "Imagine controlling your health — not the other way around.",
        "Hundreds of women achieved this with Live Without Resistance.",
        "Not another diet — a full transformation based on a method proven in England with 94% success.",
      ],
    },
    audience: {
      eyebrow: "Who it's for",
      title: "This program is for you if…",
      items: zhiveyBezRezistentnostBg.audience!.items.map((item, i) => ({
        title: [
          "You want to lose more than 5 kg",
          "You have insulin resistance",
          "You have thyroid hypofunction",
          "You have Hashimoto's",
          "You have fatty liver",
          "You're in menopause",
          "You live under stress",
        ][i],
        text: item.text,
      })),
    },
    outcomes: {
      eyebrow: "Let me tell you…",
      title: "What we achieve in 3 months",
      items: zhiveyBezRezistentnostBg.outcomes!.items.map((item, i) => ({
        title: ["Sustainable weight loss", "Balanced health", "Lasting energy"][i],
        text: item.text,
      })),
    },
    curriculum: {
      intro: "For busy professionals who want results without hours in the kitchen.",
      title: "What we learn and achieve",
      items: zhiveyBezRezistentnostBg.curriculum!.items.map((item, i) => ({
        title: ["Nutrition", "Eating out", "Daily structure", "Meal prep", "Temptations", "Mindset", "Stress", "Sleep", "Movement"][i],
        text: item.text,
      })),
      bonuses: zhiveyBezRezistentnostBg.curriculum!.bonuses,
      closing: zhiveyBezRezistentnostBg.curriculum!.closing,
    },
    pillars: {
      title: "Three pillars of your success",
      items: zhiveyBezRezistentnostBg.pillars!.items.map((item, i) => ({
        title: ["Cleansing & metabolism", "Blood sugar balance", "New mindset"][i],
        text: item.text,
      })),
    },
    includes: {
      title: "Everything you need in one place!",
      items: zhiveyBezRezistentnostBg.includes!.items.map((item, i) => ({
        title: [
          "3-month structured online program",
          "Weekly Zoom group support",
          "Recipes, menus & detox",
          "Private community",
          "Visual guides & materials",
        ][i],
        text: item.text,
      })),
    },
    testimonials: [
      { name: "Kate", quote: "Lost 31 cm and reached 58 kg. I feel amazing!" },
      { name: "Slavina", quote: "19.5 kg in 4.5 months while caring for my baby." },
      { name: "Patricia", quote: "After 6 months I no longer have Type 2 diabetes." },
      { name: "Petya", quote: "I mastered insulin resistance and stress. Thank you Vessie!" },
    ],
    trust: {
      title: "Why trust me?",
      greeting: "Hello! I'm Vessie Nay!",
      credentials: [
        "Holistic Dietitian, B.Med.Sc. (Hons)",
        "Specialist in insulin resistance, Type 2 Diabetes, Cambridge DEP",
        "Lecturer and motivational coach",
        "Mentor and coach, trained in England",
      ],
      accolades: zhiveyBezRezistentnostBg.trust!.accolades,
      image: "/images/vessie-trust-award.png",
    },
    faq: [
      {
        q: "If I'm busy, how much time weekly?",
        a: "1 hour for the weekly meeting + 15–30 min daily for food and movement.",
      },
      {
        q: "Special dishes or expensive products?",
        a: "No — everyday supermarket ingredients. Family-friendly recipes. You get everything by email after payment.",
      },
      {
        q: "Who is this program for?",
        a: "Insulin resistance, pre-/type 2 diabetes, menopause, Hashimoto's, hypothyroidism.",
      },
    ],
    pricing: {
      title: "Ready for life",
      titleAccent: "without resistance",
      subtitle: "Invest in your health with special pricing on the 3-month program.",
      showCountdown: true,
      options: [
        {
          label: "Monthly",
          price: "3 × €180",
          note: "Instead of €1,090 · ~€5.90/day",
          cta: "Join with installments",
          href: whatsapp,
        },
        {
          label: "Pay in full",
          price: "€480",
          note: "Instead of €1,090 · ~€5.30/day",
          cta: "Join with one payment",
          href: whatsapp,
        },
      ],
      ps: "P.S. Only a few discounted spots left!",
    },
    video: {
      title: "Meet me and the",
      titleAccent: "method",
      cta: "More details — watch video",
      href: whatsapp,
    },
    newsletter: {
      title: "Want health news and recipes? Sign up:",
      placeholder: "Your email",
      button: "Yes, I want!",
      consent: "I agree to receive marketing emails with tips, offers and helpful content. You can unsubscribe at any time.",
      success: "Thank you! Check your inbox.",
      error: "Something went wrong.",
    },
    finalCta: {
      title: "Get in touch",
      cta: "Contact me here",
      href: whatsapp,
    },
  },
  "preprogramirai-apetita": {
    ...preprogramiraiApetitaBg,
    meta: {
      title: "Reprogram Your Appetite | Slim & Light Club — Vessie Nay",
      description:
        "7–10 minutes a day. Release stress, emotional eating and cravings. 94% success method. From €38/month.",
    },
    hero: {
      ...preprogramiraiApetitaBg.hero,
      eyebrow: "Club for a slender figure and lightness",
      title: "Reprogram your",
      titleAccent: "appetite",
      subtitle:
        "Easy solutions for smart busy women — low energy, bloated belly, strong appetite.",
      bullets: ["10 minutes a day that bring back lightness and calm"],
      priceLine: "Everything for only €38/month",
      primaryCta: "Yes, I want to handle it",
      secondaryCta: "What's included",
    },
    audience: {
      title: "Reprogram Your Appetite is for you if…",
      items: preprogramiraiApetitaBg.audience!.items.map((item, i) => ({
        ...item,
        title: ["Problem 1 – Stress", "Problem 2 – Temptations", "Problem 3 – No time"][i],
      })),
      closing: preprogramiraiApetitaBg.audience!.closing,
    },
    visualize: {
      title: "Imagine:",
      items: preprogramiraiApetitaBg.visualize!.items,
      image: preprogramiraiApetitaBg.visualize!.image,
    },
    testimonials: preprogramiraiApetitaBg.testimonials,
    promoStrip: {
      ...preprogramiraiApetitaBg.promoStrip!,
      title: "Reprogram your appetite",
      subtitle: "Club for a SLIM figure and lightness",
      stat: "A method with 94% success, changing thousands of lives in England and Bulgaria.",
      checklist: preprogramiraiApetitaBg.promoStrip!.checklist,
      footer: "EVERYTHING YOU NEED — FINALLY EASY — IN 1 PLACE — 24/7",
    },
    valueStack: {
      ...preprogramiraiApetitaBg.valueStack!,
      title: "What's included:",
      bonusesTitle: "Plus bonus extras",
    },
    education: preprogramiraiApetitaBg.education,
    comparison: {
      title: "Wondering if it's for you?",
      positive: {
        title: preprogramiraiApetitaBg.comparison!.positive.title,
        bullets: preprogramiraiApetitaBg.comparison!.positive.bullets,
      },
      negative: {
        title: preprogramiraiApetitaBg.comparison!.negative.title,
        bullets: preprogramiraiApetitaBg.comparison!.negative.bullets,
        closing: preprogramiraiApetitaBg.comparison!.negative.closing,
      },
    },
    transformation: preprogramiraiApetitaBg.transformation,
    includes: {
      title: "SLIM & LIGHT Club — Reprogram your appetite",
      items: preprogramiraiApetitaBg.includes!.items,
    },
    trust: {
      ...preprogramiraiApetitaBg.trust!,
      title: "Why trust me?",
      greeting: "Hello! I'm Vessie Nay!",
    },
    pricing: {
      ...preprogramiraiApetitaBg.pricing!,
      title: "SLIM & LIGHT Club",
      titleAccent: "Reprogram your appetite",
      subtitle: "Join the club now — everything in one place, 24/7 from your phone",
      audienceTitle: "Who is it for:",
      options: preprogramiraiApetitaBg.pricing!.options.map((o, i) => ({
        ...o,
        label: ["Monthly access", "Option 1", "Option 2"][i],
        badge: i === 1 ? "Best value" : i === 2 ? "Most popular" : undefined,
        cta: "I want access now",
      })),
      ps: "Tap the button — we'll guide you to payment and Skool access.",
    },
    faq: preprogramiraiApetitaBg.faq,
    finalCta: {
      title: "I'M READY!",
      cta: "I want access now",
      href: preprogramiraiApetitaBg.finalCta!.href,
    },
  },
  "garnituri": {
    ...garnituriBg,
    meta: {
      title: "Side Dishes for Your Waistline | Low-Carb — Vessie Nay",
      description:
        "Easy, filling low-carb side dish ideas for insulin resistance, weight loss and Type 2 Diabetes. €3.",
    },
    hero: {
      ...garnituriBg.hero,
      eyebrow: "Low carb · €3",
      title: "Side dishes",
      titleAccent: "good for your waistline",
      subtitle:
        "Easy, filling low-carb ideas — when rice, pasta or potatoes are not the best choice, try these aromatic recipes.",
      bullets: [
        "Good for insulin resistance, weight loss and Type 2 Diabetes",
        "Easy with everyday ingredients",
        "Satisfying without heavy carbs",
      ],
      priceLine: "Only €3",
      primaryCta: "Buy here – €3",
    },
    pain: {
      title: "Tired of eating only salad?",
      paragraphs: garnituriBg.pain!.paragraphs,
      hook: "This guide was made exactly for that.",
    },
    vision: {
      title: "What you get",
      paragraphs: [
        "Selected low-carb side dishes — aromatic, easy and family-friendly.",
        "Ideas that make your plate feel complete without excess carbs.",
        "Practical format at an accessible price.",
      ],
    },
    outcomes: {
      title: "Who it's for",
      items: garnituriBg.outcomes!.items.map((item, i) => ({
        title: ["Insulin resistance", "Weight loss", "Type 2 Diabetes"][i],
        text: item.text,
      })),
    },
    includes: {
      title: "Inside the guide",
      items: garnituriBg.includes!.items.map((item, i) => ({
        title: ["Low-carb recipes", "Easy every day", "Digital access"][i],
        text: item.text,
      })),
    },
    faq: garnituriBg.faq,
    pricing: {
      ...garnituriBg.pricing!,
      title: "Get side dishes",
      titleAccent: "good for your waistline",
      subtitle: "Low-carb ideas — only €3.",
      options: [{ ...garnituriBg.pricing!.options[0], cta: "Buy here – €3" }],
    },
    finalCta: {
      title: "Ready for tasty new side dishes?",
      cta: "Buy here – €3",
      href: "/#shop",
    },
  },
};

export function getProgramLanding(
  locale: Locale,
  slug: string,
): ProgramLandingContent | null {
  const map = locale === "bg" ? bg : en;
  if (!(slug in map)) return null;
  const raw = map[slug as ProgramLandingSlug];
  return localizeHrefs(raw, locale);
}

function localizeHrefs(
  content: ProgramLandingContent,
  locale: Locale,
): ProgramLandingContent {
  const fix = (href: string) => {
    if (href === "/#contact") return `/${locale}#contact`;
    if (href === "/#shop") return `/${locale}#shop`;
    return href;
  };

  return {
    ...content,
    hero: {
      ...content.hero,
      primaryHref: fix(content.hero.primaryHref),
      secondaryHref: content.hero.secondaryHref
        ? fix(content.hero.secondaryHref)
        : undefined,
    },
    pricing: content.pricing
      ? {
          ...content.pricing,
          options: content.pricing.options.map((o) => ({
            ...o,
            href: o.href ? fix(o.href) : undefined,
          })),
        }
      : undefined,
    video: content.video ? { ...content.video, href: fix(content.video.href) } : undefined,
    finalCta: content.finalCta
      ? { ...content.finalCta, href: fix(content.finalCta.href) }
      : undefined,
  };
}
