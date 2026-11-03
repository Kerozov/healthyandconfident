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
      "Ideas for quick healthy meals on busy evenings. Food combinations, not a weekly menu. For healthy people and for people with insulin resistance. Starts mid-November 2026.",
  },
  hero: {
    ...bg.hero,
    eyebrow: "New programme · starts mid-November 2026",
    title: name,
    titleAccent: "Fast. Easy. Tasty.",
    subtitle:
      "Evening arrives and cooking is the last thing there is time for. Here are ideas for quick healthy meals - thrown together from what is already at home.",
    bullets: [
      "For busy evenings, not a free Sunday",
      "Food combinations you can put on a plate in minutes",
      "Tasty food for the whole table, from a normal shop",
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
      "You open the fridge and put a plate together from what is there. You are not hunting through ten tabs. You are not cooking one meal “for the diet” and another for everyone else.",
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
        title: "Other people sit at the table",
        text: "One meal for everyone. No second shift in the kitchen after everyone has sat down.",
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
        "Quick meals for busy evenings, with food from a normal shop",
        "Combinations of food, not a weekly sheet",
        "Food with flavour the whole table can eat",
        "For healthy people and for people watching blood sugar - including insulin resistance",
        "Starts mid-November 2026, from home, at your pace",
      ],
    },
    negative: {
      title: "It is not for you if…",
      bullets: [
        "You want a pill, a 10-day trick, or a promise that a condition will disappear.",
        "You will not open the kitchen at all. This is cooking - quick, but it is cooking.",
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
        title: "Ideas for busy evenings",
        text: "Quick meals for the end of the day, when time is short.",
      },
      {
        title: "Food combinations",
        text: "What goes with what, so there is a plate without hours in the kitchen.",
      },
      {
        title: "A shop that is not a speciality store",
        text: "Ordinary food. You know what to buy and what to leave, without a three-hour loop of the aisles.",
      },
      {
        title: "For a short evening after work",
        text: "For the box at the office and for the day the plan fell apart.",
      },
      {
        title: "One meal for the whole table",
        text: "No separate pot “for the diet”. Everyone at home eats the same food.",
      },
      {
        title: "How to choose when you eat out",
        text: "A restaurant, the canteen, someone else's house. You know what to order and the evening is not ruined.",
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
    intro: "For busy people who want ideas for dinner, not another list of bans.",
    title: "What stays after the programme",
    items: [
      {
        title: "Cook dinner without disappearing into the kitchen",
        text: "Short meals that work on a weekday.",
      },
      {
        title: "Put a plate together from what you have",
        text: "A combination for this evening, not a weekly plan.",
      },
      {
        title: "Stop eating “healthy and awful”",
        text: "Flavour is the condition for carrying on. Otherwise the idea dies in a drawer.",
      },
      {
        title: "Look after energy with the plate, not with panic",
        text: "Steadier energy through the day - how much depends on where you start. This applies if you are healthy too. It does not replace treatment and it does not promise that insulin resistance disappears.",
      },
      {
        title: "Feed the rest of the table too",
        text: "One meal. Less washing up. Less “I am on a regime”.",
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
      a: "No. The programme is for busy evenings. The meals are short on purpose - for a weekday, not a free weekend.",
    },
    {
      q: "Do I need a separate pot?",
      a: "No. The idea is one tasty meal for the table, from a normal shop.",
    },
    {
      q: "Is this a menu?",
      a: "No. These are ideas for quick meals and food combinations. A ready weekly menu is not part of this programme.",
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
