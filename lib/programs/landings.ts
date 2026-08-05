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
      title: "Summer — Slim and Calm | Summer package — Vessie Nay",
      description:
        "Enjoy the sea, the ice cream and the evenings with friends — without guilt, and without starting over in September. A practical summer package with guides, 12 recipes and SOS audio practices. €36 one-off.",
    },
    hero: {
      ...summerProgrammeBg.hero,
      eyebrow: "Summer Programme With Vessie Ney",
      title: "Summer —",
      titleAccent: "slim and calm",
      subtitle:
        "Enjoy the sea, the ice cream and the evenings with friends — without guilt, and without starting over in September.",
      bullets: [
        "A practical summer package of beautiful guides",
        "12 easy recipes for breakfast, lunch and dinner",
        "SOS audio practices for the moments you slip",
        "Ready answers for hotels, restaurants, barbecues and the road",
      ],
      priceLine: "Only €36 one-off · 60 days of access",
      primaryCta: "I want my calm summer",
      secondaryCta: "See what's inside",
    },
    galleries: summerProgrammeBg.galleries?.map((g) => ({
      ...g,
      title: "This is what you'll eat",
      titleAccent: "this summer",
    })),
    pain: {
      title: "Does this sound familiar?",
      paragraphs: [
        "You're off to the seaside. The kids want ice cream. Tonight it's a restaurant. Tomorrow there's a barbecue.",
        "The hotel breakfast looks incredible. It's hot outside and cooking is the last thing you feel like doing.",
        "And somewhere between all the lovely moments… you lose your rhythm. Then you get home, step on the scales and say: \u201cI'll start on Monday.\u201d",
        "The real problem isn't the food. It's that summer costs you your rhythm — and nobody ever showed you what to do when you're on holiday, tired, and everyone around you is enjoying themselves.",
      ],
      hook: "You're not short on willpower. You're not short on knowledge. You're short of a plan that works in real life.",
    },
    vision: {
      title: "Imagine a different summer…",
      paragraphs: [
        "Enjoying the holiday. Having an ice cream with the kids. Going out to dinner with friends. Sitting down at the barbecue without a second thought.",
        "Without constantly asking yourself: \u201cAm I allowed this?\u201d · \u201cHow many calories is that?\u201d · \u201cHave I ruined it?\u201d",
        "Just… enjoying it.",
        "Because real life doesn't happen at home. It happens on holiday, on the beach, with friends, at the barbecue and in the restaurant.",
      ],
      image: summerProgrammeBg.vision!.image,
    },
    comparison: {
      title: "This isn't a diet. It's your summer helper.",
      positive: {
        title: "\u201cSummer — slim and calm\u201d",
        bullets: [
          "No bans and no extreme restrictions",
          "No starving and no calorie counting",
          "No hours in the kitchen or the gym",
          "Easy, tasty answers for real situations — hotel, restaurant, barbecue, the road",
          "Balanced eating that protects your blood sugar and your energy",
          "Clear steps: open the guide and you know what to choose — calmly and without guilt",
        ],
      },
      negative: {
        title: "Most weight-loss plans",
        bullets: [
          "Only work at home, under full control",
          "Demand exact grams and cooking every single day",
          "Fall apart on the first day of the holiday",
        ],
        closing:
          "The approach comes from my practice with women dealing with insulin resistance, menopause and the kilos summer keeps adding — exactly where ordinary diets fail.",
      },
    },
    includes: {
      title: "What's inside?",
      items: summerProgrammeBg.includes!.items.map((item, i) => ({
        title: [
          "Eating out — restaurant, hotel and all inclusive",
          "Eating without cooking",
          "Healthy Snack Guide",
          "Summer Mineral Mocktails",
          "Barbecue and summer grill",
          "12 delicious summer recipes",
          "Summer fruit — which ones and how much",
          "SOS audio practices",
        ][i],
        text: [
          "What to choose calmly, without missing out on the pleasure.",
          "Easy ideas for busy people on hot days, when the kitchen is the last place you want to be.",
          "What to take to the beach, in the car and on the road — filling and convenient.",
          "Refreshing drinks with electrolytes that double as homemade ice cream.",
          "How to enjoy the grill — healthier and guilt-free.",
          "Fast. Easy. Breakfast, lunch and dinner — for the whole family.",
          "A list for the fridge door — for steady blood sugar.",
          "For the moments you slip and need a reminder to be kind to yourself.",
        ][i],
      })),
    },
    audience: {
      eyebrow: "Who it's for",
      title: "Who is this package for?",
      items: summerProgrammeBg.audience!.items.map((item, i) => ({
        title: [
          "For women who love summer",
          "For busy mothers and professionals",
          "For you, if you want to enjoy dresses and swimsuits",
          "With insulin resistance or in menopause",
          "If you want to come home calm and confident",
        ][i],
        text: [
          "And good food — without choosing between the two.",
          "No time to cook and no wish to spend summer in the kitchen.",
          "Without extreme restrictions and without hiding under a loose shirt.",
          "Everything is built around steady blood sugar.",
          "Rather than with 3–5 kg more than you left with.",
        ][i],
      })),
      closing: "Recognise yourself? Get the package for €36.",
    },
    testimonials: [
      {
        headline: "10 kg down in total",
        quote:
          "Natasha kept going after the Challenge ended — 10 kg lighter in total.",
        name: "Natasha",
      },
      {
        headline: "28 cm off in 21 days",
        quote: "Mostly around the tummy — in three weeks, without hunger or hours of cooking.",
        name: "Hrisi Valkova",
      },
      {
        headline: "15 kg in just over 2 months",
        quote:
          "Rosi had insulin resistance. Today it's gone, her skin is clear and her face has a new shape.",
        name: "Rosi",
      },
      {
        headline: "32 kg in 9 months",
        quote:
          "Slavina lost 32 kg, despite caring for a baby and loving white bread.",
        name: "Slavina",
      },
      { headline: "31 cm off her measurements", quote: "Kati reached her long-awaited 58 kg.", name: "Kati" },
      {
        headline: "Perfect blood work",
        quote:
          "Valya had insulin resistance. Today her tests are perfect, and she travels and enjoys life.",
        name: "Valya",
      },
    ],
    testimonialsNote:
      "Results are individual and depend on your starting point and consistency.",
    trust: {
      ...summerProgrammeBg.trust!,
      title: "Hi, I'm Vessie",
      greeting: "Holistic Nutritionist, B.Med.Sc. (Hons), Cambridge CDEP",
      credentials: [
        "Specialist: insulin resistance and Type 2 Diabetes",
        "Healthy weight loss and real motivation (you do need it 🙂)",
        "Years of specialist practice in the UK — an innovative method with a 94% success rate",
        "Author of the first Bulgarian system for insulin resistance, Type 2 Diabetes and lasting weight loss",
        "Hundreds of patients and clients across 15 countries",
      ],
      accolades: [
        "94% client success rate",
        "Working with people from 15 countries",
      ],
    },
    faq: [
      {
        q: "When do I get access?",
        a: "Straight after payment — the link arrives at the email address you paid with. If you can't see it, check the Promotions and Spam folders.",
      },
      {
        q: "How long do I have access?",
        a: "60 days from purchase — enough for the whole summer, holiday included.",
      },
      {
        q: "Do I need an app?",
        a: "No. Everything opens in the browser on a phone, tablet or laptop.",
      },
      {
        q: "Do I have to cook?",
        a: "Only if you want to. There's a whole \u201ceating without cooking\u201d guide, and the recipes are quick and easy — made for hot days.",
      },
      {
        q: "Is it suitable with insulin resistance?",
        a: "Yes. The whole package is built around steady blood sugar — that's exactly why it exists. If you take medication, tell your doctor.",
      },
      {
        q: "What if I'm already on holiday?",
        a: "Even better — that's the point. Open the hotel and restaurant guide and you'll know what to choose at your very next meal.",
      },
      {
        q: "How do I pay?",
        a: "A single card payment through secure checkout. No subscription, no hidden fees.",
      },
    ],
    pricing: {
      ...summerProgrammeBg.pricing!,
      title: "All of it in one place,",
      titleAccent: "for less than one dinner out",
      subtitle: "Only €36 · one-off · 60 days of access",
      audienceTitle: "Who is this package NOT for?",
      audienceBullets: [
        "If you're looking for a quick miracle.",
        "If you're not willing to make even small changes.",
      ],
      options: [
        {
          ...summerProgrammeBg.pricing!.options[0],
          label: "Summer — slim and calm",
          badge: "Summer package",
          price: "€36",
          note: "One-off payment · 60 days of access · guides, 12 recipes and SOS audio practices",
          cta: "Get the summer package",
        },
      ],
      ps: "🔒 Secure card payment · 📩 Access by email · 🕒 60 days of access · 📱 Opens on phone, tablet and laptop",
    },
    finalCta: {
      title: "Let this summer be the calm one",
      cta: "I want my calm summer",
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
