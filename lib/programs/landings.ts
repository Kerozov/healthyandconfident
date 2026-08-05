import type { Locale } from "@/i18n/config";
import type { ProgramLandingContent, ProgramLandingSlug } from "./types";
import { zhiveyBezRezistentnostBg } from "./content/zhivey-bez-rezistentnost.bg";
import { preprogramiraiApetitaBg } from "./content/preprogramirai-apetita.bg";
import { summerProgrammeBg } from "./content/summer-programme.bg";

const whatsapp = "https://wa.me/447876565263";

const bg: Record<ProgramLandingSlug, ProgramLandingContent> = {
  "zhivey-bez-rezistentnost": zhiveyBezRezistentnostBg,
  "preprogramirai-apetita": preprogramiraiApetitaBg,
  "summer-programme": summerProgrammeBg,
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
  "summer-programme": {
    ...summerProgrammeBg,
    meta: {
      title: "Summer Programme | Light, energised summer — Vessie Nay",
      description:
        "A summer programme for losing weight without hunger — light meals for hot days, stable blood sugar, a flatter tummy and energy. Works on holiday and eating out.",
    },
    hero: {
      ...summerProgrammeBg.hero,
      eyebrow: "Summer programme · starts every Monday",
      title: "Step into summer",
      titleAccent: "light and confident",
      subtitle:
        "A short, concrete programme for the hot months — food that satisfies without weighing you down, stable blood sugar and a flatter tummy. No hunger, no calorie counting, no giving up your summer.",
      bullets: [
        "Light summer menu — filling, never heavy",
        "A flatter tummy and less bloating",
        "Works on holiday and eating out",
        "Steady energy all day",
      ],
      priceLine: "Starts every Monday · small group",
      primaryCta: "Join the summer programme",
      secondaryCta: "See what's included",
    },
    galleries: summerProgrammeBg.galleries?.map((g) => ({
      ...g,
      title: "This is what you'll eat",
      titleAccent: "this summer",
    })),
    pain: {
      title: "Summer is here and you don't feel good in your own skin?",
      paragraphs: [
        "You buy the swimsuit full of hope, then put the loose shirt back on in front of the mirror.",
        "It's too hot to cook, so you eat whatever is around — and the bloating gets worse.",
        "Every holiday, barbecue or dinner out feels like the end of any routine.",
        "And in September it all starts over, heavier than before.",
      ],
      hook: "That's exactly why I built the Summer Programme — a routine that survives a real summer.",
    },
    vision: {
      title: "Imagine this summer",
      paragraphs: [
        "You wake up light, without a bloated tummy or last night's heaviness.",
        "You put on the dress that stayed in the wardrobe — and stop thinking about it.",
        "You order calmly at a restaurant, knowing what works for you and what doesn't.",
        "You come home from holiday without the extra kilos you usually bring back.",
      ],
      image: summerProgrammeBg.vision!.image,
    },
    audience: {
      eyebrow: "Who it's for",
      title: "The Summer Programme is for you if…",
      items: summerProgrammeBg.audience!.items.map((item, i) => ({
        title: [
          "You want to lose 3–8 kg by the end of summer",
          "You feel bloated and heavy",
          "You have insulin resistance",
          "You hate cooking in the heat",
          "You have a holiday coming up",
          "You have tried everything",
        ][i],
        text: [
          "A realistic goal for a few weeks — lasting, without hunger or extremes.",
          "We work on exactly the foods that cause bloating and water retention.",
          "The menu keeps blood sugar steady — no spikes, no afternoon crash.",
          "Recipes are quick, cold or barely cooked — 15–20 minutes.",
          "There's a separate plan for travelling, all-inclusive hotels and dinners out.",
          "This isn't another diet — it's a system where you know what you're doing and why.",
        ][i],
      })),
    },
    outcomes: {
      eyebrow: "The result",
      title: "What we achieve together",
      items: summerProgrammeBg.outcomes!.items.map((item, i) => ({
        title: ["A lighter tummy", "Steady energy", "Habits that stay"][i],
        text: [
          "The first change shows in week one — less bloating and heaviness.",
          "No afternoon crash and no 4pm sugar craving.",
          "You leave summer with a system that works, not another failed attempt.",
        ][i],
      })),
    },
    includes: {
      title: "What's included",
      items: summerProgrammeBg.includes!.items.map((item, i) => ({
        title: [
          "Summer menu with recipes",
          "Shopping list",
          "Holiday & restaurant plan",
          "Hydration and minerals in the heat",
          "Support throughout",
          "Digital access",
        ][i],
        text: [
          "Ready days for breakfast, lunch and dinner — light, filling and fast.",
          "Everyday ingredients from your nearest shop, no specialist stores.",
          "What to order, what to skip and how to get back on track the next day.",
          "How to drink water so you don't retain fluid or swell.",
          "I answer your questions for as long as the programme runs — you're not alone.",
          "Everything opens on phone, tablet and laptop, right after you join.",
        ][i],
      })),
    },
    faq: [
      {
        q: "When does it start?",
        a: "We start every Monday. Join, get access and begin with the next start date.",
      },
      {
        q: "Will I have to cook for hours?",
        a: "No. The recipes are made for summer — 15–20 minutes, many of them cold.",
      },
      {
        q: "Can I still eat out and go on holiday?",
        a: "Yes. There is a dedicated part for restaurants, barbecues and hotels, so the result holds.",
      },
      {
        q: "Is it suitable with insulin resistance or Type 2 Diabetes?",
        a: "Yes — the menu is built to keep blood sugar steady. If you take medication, tell your doctor.",
      },
      {
        q: "What if I see no result?",
        a: "If you follow the programme and nothing changes, write to me — we look at what's blocking it together.",
      },
      {
        q: "What happens after summer?",
        a: "You keep the menu and the habits. For deeper work, continue with the 3-month programme.",
      },
    ],
    pricing: {
      ...summerProgrammeBg.pricing!,
      title: "Join the",
      titleAccent: "summer programme",
      subtitle: "Small group, personal contact, a new start every Monday.",
      options: [
        {
          ...summerProgrammeBg.pricing!.options[0],
          label: "Summer programme",
          badge: "Most chosen",
          price: "See the price",
          note: "Full access to the menu, the holiday plan and the support",
          cta: "Join now",
        },
      ],
      ps: "Places are limited so I can answer every question personally.",
    },
    finalCta: {
      title: "Let this summer be the different one",
      cta: "Join the summer programme",
      href: summerProgrammeBg.finalCta!.href,
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
