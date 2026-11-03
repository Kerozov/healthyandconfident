import type { ProgramLandingContent } from "../types";
import { kuhnyaBezRezistentnostBg } from "./kuhnya-bez-rezistentnost.bg";
import {
  KUHNYA_CHALLENGE_BONUS_TITLE,
  KUHNYA_NAME,
  KUHNYA_SHOW_CHALLENGE_BONUS,
  KUHNYA_SIGNUP_SOURCE,
  KUHNYA_SIGNUP_TAG,
} from "../kuhnya";

/**
 * English mirror. The display name lives in `lib/programs/kuhnya.ts`.
 * Same photos as the Bulgarian page: no /images/7.jpg or /images/8.jpg.
 */
const name = KUHNYA_NAME.en;
const bg = kuhnyaBezRezistentnostBg;

export const kuhnyaBezRezistentnostEn: ProgramLandingContent = {
  ...bg,
  meta: {
    title: `${name} | Quick meals - Vessie Nay`,
    description:
      "No-cook ideas, 23 dinners and 5 lunches with familiar foods, and a smart-stock list. For busy evenings. Starts mid-November 2026.",
  },
  hero: {
    ...bg.hero,
    eyebrow: "New programme · starts mid-November 2026",
    title: name,
    titleAccent: "Fast. Easy. Tasty.",
    subtitle:
      "The evening is short and cooking drops off. Inside: no-cook ideas, 23 dinners and 5 lunches with familiar foods, and what to keep in the cupboard, the fridge and the freezer.",
    bullets: [
      "23 dinner ideas and 5 lunches",
      "Meals with no cooking, for the evenings you will not cook",
      "A smart stock list and one hour of prep on Sunday",
    ],
    primaryCta: "I want in the kitchen",
    secondaryCta: "See what's included",
  },
  galleries: [
    {
      title: "Food you can",
      titleAccent: "cook quickly",
      images: bg.galleries![0].images,
      captions: {
        "/images/11.jpg": "Quick meal ideas from the programme",
      },
      alts: {
        "/images/9.jpg": "Collage of meals - salads, vegetables and protein",
        "/images/11.jpg": "Quick meal ideas from the programme",
      },
    },
  ],
  pain: {
    title: "Know this evening?",
    paragraphs: [
      "The day is over. There is no energy left to cook. You order. Or you throw something in a pan and feel cross about it afterwards.",
      "Healthy food so far has been dry and bland. A separate pot nobody else wants. So you quit before you have really started.",
      "Your middle feels heavy, clothes pull, the scales stay quiet or creep up. And it is already clear this is not “just willpower”.",
      "The same is true if you are healthy, and if blood sugar worries you. Insulin resistance is one of the cases, not the only one.",
    ],
    hook: "Stop choosing between time and taste. Dinner can be quick and healthy.",
  },
  vision: {
    ...bg.vision!,
    title: "Picture a short dinner",
    paragraphs: [
      "There is a ready option for the evening: a jar and a few vegetables, the fridge, the freezer, or no cooking at all. You are not hunting through ten tabs.",
      "The food has flavour. Your middle may not sit so heavy afterwards, and the afternoon may not flatten you - how much depends on where you start.",
      "How much your weight, your measurements or your energy will change depends on where you start and on how often dinner looks like this. There is no miracle here and no promise that anything “goes away”. There are ideas for quick meals that support the body.",
    ],
  },
  audience: {
    eyebrow: "Who it's for",
    title: `${name} is for you if…`,
    items: [
      {
        title: "The evening is packed and cooking drops off",
        text: "Between work and a late end to the day. The ideas here are short on purpose.",
      },
      {
        title: "Healthy food has tasted like nothing",
        text: "If it has no flavour, it will not be repeated. Taste is part of the meal, not a reward for later.",
      },
      {
        title: "The tummy and the extra weight annoy you when you get dressed",
        text: "You are not looking for another ban. You are looking for food you can live with after the first week.",
      },
      {
        title: "You want familiar food from a normal shop",
        text: "Lentils, beans, eggs, cheese, roasted peppers, frozen vegetables. Not a speciality store.",
      },
      {
        title: "You are healthy and still want to eat well",
        text: "The advice is not only for a diagnosis. It applies when nothing hurts and the days are simply full.",
      },
      {
        title: "You have insulin resistance",
        text: "The plates help blood sugar stay steadier (how much depends on where you start), without eating cardboard. This is not a treatment and it does not replace a doctor.",
      },
    ],
    closing: "If you recognise yourself in at least two of these, the programme is for you.",
  },
  comparison: {
    title: "This is not another diet",
    positive: {
      title: `“${name}”`,
      bullets: [
        "23 dinner ideas and 5 lunches with familiar foods",
        "No-cook ideas for breakfast, lunch and dinner",
        "A list for the cupboard, fridge and freezer, plus one hour on Sunday",
        "For healthy people and for people watching blood sugar - including insulin resistance",
        "Starts mid-November 2026, from home, at your pace",
      ],
    },
    negative: {
      title: "It is not for you if…",
      bullets: [
        "You want a pill, a 10-day trick, or a promise that a condition will disappear.",
        "You want a ready weekly menu. These are separate meal ideas, not a plan for the week.",
        "You want someone else to cook for you every day.",
      ],
      closing:
        "The programme offers ideas for quick meals and for choosing food. It is not a treatment and it does not replace a doctor.",
    },
  },
  includes: {
    title: "What you get",
    items: [
      {
        title: "Healthy eating without cooking",
        text: "Ideas for breakfast, lunch and dinner for the evenings you will not cook. For each, you pick three or four for the week. For example a bowl of yogurt and fruit, overnight oats, a smoked salmon salad, turkey wraps, a hummus plate.",
      },
      {
        title: "23 dinners and 5 lunches",
        text: "What to cook quickly, with familiar foods from a Bulgarian kitchen: from the cupboard, the fridge, the freezer and the air fryer. For example lentil with tomatoes and savory, mish-mash, eggs Panagyurishte style, chicken with broccoli, meatballs, a shopska salad in a jar.",
      },
      {
        title: "The smart stock",
        text: "What to keep in the cupboard, the fridge and the freezer, so dinner is still possible when nothing was planned. Once a week you tick what you have. What is missing is the shopping list. The foods are easy to find in a normal shop and are also chosen to work with insulin resistance.",
      },
      {
        title: "One hour on Sunday",
        text: "A little prep for calmer evenings: boiled eggs, a double batch of meatballs, cooked lentils or beans in portions, roasted chicken, and cucumber and peppers cut up.",
      },
    ],
  },
  pillars: {
    title: "Before you start",
    items: [
      ...(KUHNYA_SHOW_CHALLENGE_BONUS
        ? [{ title: KUHNYA_CHALLENGE_BONUS_TITLE.en, text: "" }]
        : []),
      {
        title: "Start: mid-November 2026",
        text: "That is when the programme opens.",
      },
      {
        title: "The change is not the same for everyone",
        text: "How much your weight, your middle or your energy shifts depends on where you start and on how steadily you keep going. There is no fixed number and no promise of a cure.",
      },
    ],
  },
  curriculum: {
    intro: "For busy evenings: ready ideas for a meal, not a plan for the week.",
    title: "What stays after the programme",
    items: [
      {
        title: "Dinner even when you will not cook",
        text: "There are separate no-cook ideas. For the week you pick three or four for breakfast, for lunch and for dinner.",
      },
      {
        title: "Dinner from what you already have",
        text: "23 dinner ideas and 5 lunches: from the cupboard, the fridge, the freezer or the air fryer. The amounts in those ideas are for one person.",
      },
      {
        title: "One hour on Sunday",
        text: "Boiled eggs, meatballs, lentils or beans, roasted chicken and cut vegetables. The evenings after that are shorter.",
      },
      {
        title: "Calmer energy, with no promise of a miracle",
        text: "How much weight, your middle or your energy will change depends on where you start. This applies without a diagnosis too. It does not replace treatment and it does not promise that insulin resistance disappears.",
      },
    ],
    closing: "With care, and without miracle talk - Vessie Nay",
  },
  trust: {
    ...bg.trust!,
    title: "Why trust me in the kitchen",
    greeting: "Hello, I'm Vessie Nay.",
    credentials: [
      "Holistic nutritionist, B.Med.Sc. (Hons), Cambridge CDEP",
      "Specialist in insulin resistance and Type 2 Diabetes",
      "Years of practice in the UK, working with people in many countries",
      "Author of Live Without Resistance and of the 21 Days Slimmer and Happier challenge",
    ],
    accolades: [
      "National award for work on insulin resistance",
      "Food that gets cooked at home - not a plan that only lives on paper",
    ],
  },
  faq: [
    {
      q: "When does it start?",
      a: "Mid-November 2026.",
    },
    {
      q: "Will this take hours in the kitchen?",
      a: "Not for hours. There are ideas with no cooking at all. The other evenings are short: from a jar, the fridge, the freezer or the air fryer. On Sunday there is one hour of prep.",
    },
    {
      q: "How many people are the meals for?",
      a: "In the quick-cooking ideas the amounts are for one person. If a portion is not enough, the guide says to add more vegetables.",
    },
    {
      q: "Is this a menu?",
      a: "No. These are separate meal ideas: no-cook options, 23 dinners and 5 lunches. A ready weekly menu is not part of this programme.",
    },
    {
      q: "Is it only for insulin resistance?",
      a: "No. The advice is for busy people - for healthy people, and when blood sugar is a concern, including insulin resistance. It is not a treatment and it does not replace a doctor. If you take medication, tell a doctor before you change how you eat.",
    },
    {
      q: "Will weight and the tummy change?",
      a: "There may be a change in weight, measurements and energy. How much depends on where you start and on how often dinner looks like this. There is no fixed promise.",
    },
    {
      q: "Will healthy food still taste like nothing?",
      a: "No. If it has no flavour, it will not be repeated. Taste is part of the programme, not a compromise.",
    },
  ],
  pricing: {
    ...bg.pricing!,
    title: "Come into a kitchen",
    titleAccent: "that works on a busy day",
    subtitle: "Start: mid-November 2026.",
    audienceTitle: "Before you tap",
    audienceBullets: [
      "This is cooking and choosing food, not a treatment, and it does not replace a doctor. If you take medication, tell a doctor before you change how you eat.",
      "Any change depends on where you start.",
      "If you want a miracle in ten days, this programme is not your path.",
    ],
    options: [
      {
        ...bg.pricing!.options[0],
        label: name,
        badge: "Starts mid-November 2026",
        price: "{price}",
        note: "",
        cta: "I want in the kitchen",
      },
    ],
  },
  waitlist: {
    pending: "Signup opens soon.",
    prompt: "Leave your email and you will get the price and first chance at a place.",
    button: "Save me a place",
    consent: "I agree to receive emails about this programme. You can unsubscribe at any time.",
    success: "You are on the list. We will write with the price and first chance at a place.",
    source: KUHNYA_SIGNUP_SOURCE,
    tag: KUHNYA_SIGNUP_TAG,
  },
  finalCta: {
    title: "Enough of bland food. Enough of “I have no time”.",
    cta: "Yes, I want this kitchen",
    href: bg.finalCta!.href,
  },
};
