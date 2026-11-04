import type { ProgramLandingContent } from "../types";
import { kuhnyaBezRezistentnostBg } from "./kuhnya-bez-rezistentnost.bg";
import {
  KUHNYA_CHALLENGE_BONUS_TITLE,
  KUHNYA_NAME,
  KUHNYA_SHOW_CHALLENGE_BONUS,
  KUHNYA_SIGNUP_SOURCE,
  KUHNYA_SIGNUP_TAG,
} from "../kuhnya";

const name = KUHNYA_NAME.en;
const bg = kuhnyaBezRezistentnostBg;

export const kuhnyaBezRezistentnostEn: ProgramLandingContent = {
  ...bg,
  meta: {
    title: `${name} | Quick meals - Vessie Nay`,
    description:
      "Videos and three guides for busy days: no-cook meals, 23 dinner ideas and 5 lunches, ingredient checklists and weekly prep. With Vessie Nay.",
  },
  hero: {
    ...bg.hero,
    eyebrow: "New programme · planned start mid-November 2026",
    title: name,
    titleAccent: "What's for dinner tonight?",
    subtitle:
      "You get home late and still need to sort out dinner. I've put together quick meals and ways to combine ready-to-eat ingredients, so you have something to make on your busiest days.",
    bullets: [
      "23 dinner ideas and 5 lunches with familiar ingredients",
      "No-cook ideas for breakfast, lunch and dinner",
      "Ingredient checklists and prep for the week ahead",
    ],
    primaryCta: "See how to join",
    secondaryCta: "See what you get",
    imageAlt: "Baked fish with vegetables and lemon",
  },
  galleries: [
    {
      title: "Food from Vessie's kitchen",
      images: bg.galleries![0].images,
      alts: {
        "/images/6.jpg": "Baked fish with vegetables and lemon",
        "/images/9.jpg": "Photos of home-cooked meals with salads and vegetables",
        "/images/10.jpg": "Salad with grilled halloumi, avocado and tomatoes",
        "/images/12.jpg": "Bowl of porridge with raspberries and blueberries",
      },
    },
  ],
  pain: {
    title: "What's for dinner?",
    paragraphs: [
      "After work, there are errands, chores and plenty of other things to do. By the time you reach the kitchen, you're hungry. You open the fridge and wonder what you can make with what's left.",
      "This programme is for those evenings. It includes quick meals with familiar ingredients, lunches to pack and combinations you can put together without turning on the cooker.",
    ],
    hook: "Eggs with peppers, a bean salad or chicken with broccoli. There are plenty of quick options.",
  },
  vision: {
    ...bg.vision!,
    title: "Start with what you already have",
    paragraphs: [
      "A jar of beans, roasted peppers and a few vegetables make a quick salad. Eggs and cheese can become mish-mash, a Bulgarian dish with peppers and tomatoes. Yesterday's cooked chicken gets tomorrow's lunch well on its way.",
      "I'll show you what to keep on hand and what you can prepare ahead, so dinner doesn't mean starting from scratch every night.",
    ],
    imageAlt: "Salad with grilled halloumi, avocado and tomatoes",
  },
  audience: {
    eyebrow: "Who it's for",
    title: "You'll find this useful if…",
    items: [
      {
        title: "You have little time to cook in the evening",
        text: "You want meals that take little preparation, with options for days when you won't cook at all.",
      },
      {
        title: "You're always wondering what to eat",
        text: "You want ideas using eggs, vegetables, beans, fish and other ingredients you already buy.",
      },
      {
        title: "You want to eat better on busy days",
        text: "The programme is for women and men, including people without health conditions. Use the ideas for yourself and at home.",
      },
      {
        title: "You have insulin resistance",
        text: "The Smart Stock guide includes an ingredient checklist Vessie has also selected with insulin resistance in mind.",
      },
    ],
  },
  includes: {
    title: "What you get",
    items: [
      {
        title: "Videos with Vessie",
        text: "Videos are part of the programme. Alongside them, you receive three guides with meal ideas and checklists to use in the kitchen.",
      },
      {
        title: "Healthy Eating Without Cooking",
        text: "Breakfast, lunch and dinner combinations using ready-to-eat or previously prepared ingredients. Examples include yoghurt with fruit, smoked salmon salad and a hummus platter. Some ideas use boiled eggs or cooked chicken.",
      },
      {
        title: "What Can I Cook Quickly?",
        text: "23 dinner ideas and 5 lunches with familiar ingredients from Bulgarian cooking. Organised by what you have in the cupboard, fridge and freezer, with a separate air fryer section. Each meal has quantities for one person and a preparation time.",
      },
      {
        title: "The Smart Stock",
        text: "Checklists for your cupboard, fridge and freezer, plus space for your shopping list. It also includes One Hour on Sunday, with ideas for food to cook or portion ahead.",
      },
      ...(KUHNYA_SHOW_CHALLENGE_BONUS
        ? [{ title: KUHNYA_CHALLENGE_BONUS_TITLE.en, text: "" }]
        : []),
    ],
  },
  trust: {
    ...bg.trust!,
    title: "Meet the person behind the programme",
    greeting: "Hello, I'm Vessie Nay.",
    credentials: [
      "Holistic nutritionist, B.Med.Sc. (Hons), Cambridge CDEP",
      "UK practice and online work with people in different countries",
      "Author of Live Without Resistance and the 21 Days Slimmer and Happier challenge",
      "Specialist in insulin resistance and type 2 diabetes",
    ],
    accolades: ["National award for work on insulin resistance"],
  },
  faq: [
    {
      q: "When does the programme start?",
      a: "The planned start is mid-November 2026.",
    },
    {
      q: "Does it include a weekly menu?",
      a: "You receive individual meal ideas and food combinations. A ready-made weekly menu is not included in this programme.",
    },
    {
      q: "How long does the cooking take?",
      a: "The times in What Can I Cook Quickly? range from 5 to 30 minutes, depending on the dish. Some use pre-cooked beans, lentils or meat. There is also a separate guide with no-cook ideas.",
    },
    {
      q: "How many people are the quantities for?",
      a: "The quantities in What Can I Cook Quickly? are for one person. Increase the ingredients for the number of portions you need.",
    },
    {
      q: "Do I need an air fryer?",
      a: "Only some of the ideas use an air fryer. The guide also includes salads, dishes made in a frying pan and no-cook options.",
    },
    {
      q: "Is it only for people with insulin resistance?",
      a: "The programme is for busy women and men, including people without a diagnosis. The materials are educational and do not replace medical consultation, diagnosis or treatment.",
    },
  ],
  pricing: {
    ...bg.pricing!,
    title: "Join the programme",
    subtitle: "Planned start: mid-November 2026.",
    options: [
      {
        ...bg.pricing!.options[0],
        label: name,
        note: "Videos and three guides for eating well on busy days.",
        cta: "Join the programme",
      },
    ],
  },
  waitlist: {
    pending: "Signup opens soon",
    prompt: "Leave your email and we'll send you the price and details when signup opens.",
    button: "Notify me",
    consent: "I agree to receive emails about this programme. I can unsubscribe at any time.",
    success: "Your email is on the notification list. We'll write when signup opens.",
    source: KUHNYA_SIGNUP_SOURCE,
    tag: KUHNYA_SIGNUP_TAG,
  },
  finalCta: {
    title: "Ideas for your next busy evening",
    cta: "See how to join",
    href: bg.finalCta!.href,
  },
};
