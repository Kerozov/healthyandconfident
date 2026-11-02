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
 * English mirror of the cooking programme. The working title lives in
 * `lib/programs/kuhnya.ts`. Price tokens stay empty until the admin attaches
 * a Stripe product to the pricing button.
 */
const name = KUHNYA_NAME.en;
const bg = kuhnyaBezRezistentnostBg;

export const kuhnyaBezRezistentnostEn: ProgramLandingContent = {
  ...bg,
  meta: {
    title: `${name} | Fast, tasty cooking - Vessie Nay`,
    description:
      "For busy people with insulin resistance. Learn to cook fast, easy, tasty food and build your own menus. Starts mid-November 2026.",
  },
  hero: {
    ...bg.hero,
    eyebrow: "New programme · starts mid-November 2026",
    title: name,
    titleAccent: "Fast. Easy. Tasty.",
    subtitle:
      "The tummy is still there, the time is not, and “healthy” has always tasted like nothing. Here you learn to cook real food on a busy day - and to build the menu yourself.",
    bullets: [
      "For women with insulin resistance who are tired of choosing between taste and blood sugar",
      "Recipes for 15-20 minutes, not for a free Sunday",
      "Your own menus, from a normal shop - for you and for the table",
    ],
    primaryCta: "I want in the kitchen",
    secondaryCta: "See what's included",
  },
  galleries: [
    {
      title: "Food you can",
      titleAccent: "cook quickly",
      images: bg.galleries![0].images,
    },
  ],
  pain: {
    title: "Know this day?",
    paragraphs: [
      "You wake up bloated before the coffee. Clothes pull. The scales stay quiet or creep up - and you already know it is not “just willpower”.",
      "Insulin resistance keeps the loop going: hunger, the afternoon crash, hunger again. Extra weight comes back, however many Monday diets you start.",
      "Then evening. Work has eaten the day. You have no time to cook. You order. Or you throw something in a pan and feel cross about it afterwards.",
      "And healthy food? Dry, a separate pot just for you, and nobody else at home will eat it. So you quit before you have really started.",
    ],
    hook: "Stop choosing between time, taste and blood sugar. The kitchen can be on your side.",
  },
  vision: {
    ...bg.vision!,
    title: "Picture dinner in 20 minutes",
    paragraphs: [
      "You open the fridge and you know what is happening. You are not hunting through ten tabs. You are not cooking one meal “for the diet” and another for everyone else.",
      "The food has flavour. Your middle may not sit so heavy afterwards, and the afternoon may not flatten you - how much depends on where you start. And the menu is yours - built for your day, not a stranger's list that does not fit your life.",
      "How much your weight, your measurements or your energy will change depends on where you start and on how steadily you cook. There is no miracle here and no promise that anything “goes away”. There is a clear kitchen that supports your body.",
    ],
  },
  audience: {
    eyebrow: "Who it's for",
    title: `${name} is for you if…`,
    items: [
      {
        title: "You have insulin resistance",
        text: "And you are tired of every meal feeling like a gamble. You want plates that help blood sugar stay steadier (how much depends on where you start), without eating cardboard.",
      },
      {
        title: "The tummy and the extra weight annoy you every time you get dressed",
        text: "You are not looking for another ban. You are looking for food you can live with after the first week.",
      },
      {
        title: "You have no time to cook",
        text: "Between work, children and an evening when you are simply tired. The recipes here are short on purpose.",
      },
      {
        title: "Healthy food has tasted like nothing",
        text: "If it has no flavour, you will not repeat it. Taste is part of the plan, not a reward for later.",
      },
      {
        title: "You want to build the menu yourself",
        text: "Not follow someone else's sheet for the rest of your life. You learn to assemble your week - and to change it when the day falls apart.",
      },
      {
        title: "You cook for more than yourself",
        text: "One meal for the table. No second shift in the kitchen after everyone has sat down.",
      },
    ],
    closing: "If you recognise yourself in at least two of these, this kitchen is for you.",
  },
  comparison: {
    title: "This is not another diet",
    positive: {
      title: `“${name}”`,
      bullets: [
        "Fast recipes for busy days, with food from a normal shop",
        "You learn to build the menu, instead of searching for one again every evening",
        "Food with flavour that the whole table can eat",
        "A clear idea of the plate and of blood sugar - without counting calories into the ground",
        "Starts mid-November 2026, from home, at your pace",
      ],
    },
    negative: {
      title: "It is not for you if…",
      bullets: [
        "You want a pill, a 10-day trick, or a promise that your condition will disappear.",
        "You are not willing to open the kitchen at all. This is cooking - quick, but it is cooking.",
        "You want someone else to plan every bite and write you a menu every morning forever.",
      ],
      closing:
        "The programme teaches cooking and choosing food. It is not a treatment and it does not replace your doctor.",
    },
  },
  includes: {
    title: "What you get",
    items: [
      {
        title: "Fast recipes for breakfast, lunch and dinner",
        text: "Short steps, few pans, flavour you want to repeat tomorrow.",
      },
      {
        title: "How to build the menu yourself",
        text: "Not one frozen plan. A way to lay out your week and change it when the day goes sideways.",
      },
      {
        title: "A shop that is not a speciality store",
        text: "Ordinary food. You know what to buy and what to leave, without a three-hour loop of the aisles.",
      },
      {
        title: "Cooking when you have 15-20 minutes",
        text: "For the evening after work, the box at the office, the day the plan collapsed.",
      },
      {
        title: "One meal for the whole table",
        text: "No separate pot “for the diet”. The household eats the same food.",
      },
      {
        title: "How to choose when you eat out",
        text: "A restaurant, the canteen, someone else's house. You know what to order and you do not come home feeling you have broken everything.",
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
    intro: "For busy people who want a kitchen, not another list of bans.",
    title: "What you will be able to do",
    items: [
      {
        title: "Cook dinner without disappearing into the kitchen",
        text: "Short recipes that work on a weekday.",
      },
      {
        title: "Write a menu for the week",
        text: "And change it on Wednesday without feeling you have failed.",
      },
      {
        title: "Stop eating “healthy and awful”",
        text: "Flavour is the condition for carrying on. Otherwise the plan dies in a drawer.",
      },
      {
        title: "Look after blood sugar with the plate, not with panic",
        text: "Steadier energy through the day - how much depends on where you start. This does not replace treatment and it does not promise that insulin resistance disappears.",
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
      q: "Will I spend hours in the kitchen?",
      a: "No. The programme is for busy people. The recipes are short on purpose - for a weekday, not a free weekend.",
    },
    {
      q: "Do I have to cook a separate meal for myself?",
      a: "No. The idea is one tasty meal for the table, from a normal shop.",
    },
    {
      q: "Is it suitable if I have insulin resistance?",
      a: "Yes - the whole kitchen is built around steadier blood sugar. It is not a treatment, it does not promise the condition will disappear, and it does not replace your doctor. If you take medication, tell your doctor before you change how you eat.",
    },
    {
      q: "Will I lose weight and will the tummy go down?",
      a: "You may notice a change in weight, measurements and energy. How much depends on where you start and on how steadily you cook and eat. There is no fixed promise.",
    },
    {
      q: "Will healthy food still taste like nothing?",
      a: "No. If it has no flavour, you will not repeat it. Taste is part of the programme, not a compromise.",
    },
    {
      q: "Do I build the menu myself, or do I get a ready-made list?",
      a: "Both: you have something to start from, and you learn to assemble your own week so you are not stuck on someone else's list every month.",
    },
  ],
  pricing: {
    ...bg.pricing!,
    title: "Come into a kitchen",
    titleAccent: "that actually works",
    subtitle: "Start: mid-November 2026.",
    audienceTitle: "Before you tap",
    audienceBullets: [
      "This is cooking and choosing food, not a treatment, and it does not replace your doctor. If you take medication, talk to them before you change how you eat.",
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
