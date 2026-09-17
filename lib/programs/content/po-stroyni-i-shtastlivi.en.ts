import type { ProgramLandingContent } from "../types";
import { poStroyniIShtastliviBg } from "./po-stroyni-i-shtastlivi.bg";

/** English mirror of the 21-day challenge landing. Images and layout are shared. */
const pricingAnchor = "#pricing";
const contactSection = "/#contact";

export const poStroyniIShtastliviEn: ProgramLandingContent = {
  ...poStroyniIShtastliviBg,
  meta: {
    title: "21 Days Slimmer and Happier | Challenge — Vessie Nay",
    description:
      "Lose 3–5 kg in three weeks and learn to eat deliciously and in balance for life. An innovative method with a 94% success rate for insulin resistance and Type 2 Diabetes.",
  },
  hero: {
    ...poStroyniIShtastliviBg.hero,
    eyebrow: "21-day challenge · a method with 94% success",
    title: "Slimmer and happier",
    titleAccent: "in 21 days",
    subtitle:
      "Learn to eat deliciously and in balance for life — and lose 3–5 kg in three weeks, without deprivation and without another diet.",
    bullets: [
      "For busy women and mothers who want to lose weight healthily",
      "With insulin resistance, pre-diabetes or Type 2 Diabetes",
      "No hunger, no calorie counting and no hours at the gym",
      "An innovative method from the UK — at last in your language",
    ],
    priceLine: "€49 instead of €152 · 68% off for the first 20 places",
    primaryCta: "Join now",
    secondaryCta: "See what's included",
  },
  galleries: [
    { ...poStroyniIShtastliviBg.galleries![0], title: "The delicious food", titleAccent: "you lose weight on" },
    { ...poStroyniIShtastliviBg.galleries![1], title: "And this is what you'll eat", titleAccent: "over these 21 days" },
  ],
  pain: {
    title: "Can I be full and lose weight at the same time?",
    paragraphs: [
      "Without starving and without giving up the foods I love?",
      "You've tried another diet — the first days go well, then come the hunger, the bloated belly and the tiredness. You give up, the weight comes back, and your faith in yourself shrinks.",
      "And between work, the kids and dinner for the whole family, there simply isn't time for complicated menus and hours in the kitchen.",
    ],
    hook: "The short answer is: yes, you can. Here's how we do it together in the 21-day challenge.",
  },
  vision: {
    ...poStroyniIShtastliviBg.vision!,
    title: "Why this system is different, and why it works",
    paragraphs: [
      "In the UK, together with my colleagues, we use a new and successful health method — the easier way to deal once and for all with excess weight, insulin resistance and Type 2 Diabetes.",
      "Instead of relying on medication that may have many side effects in the long run.",
      "This isn't starving and it isn't another diet. It's a clear structure, delicious food and knowledge that stays with you for life.",
      "The method is called T2DPR and has a 94% success rate in the UK — and it is finally available here too.",
    ],
  },
  audience: {
    eyebrow: "Who it's for",
    title: "Who is the challenge for?",
    items: [
      {
        title: "You're busy and want to lose weight healthily",
        text: "At least 3–5 kg in three weeks, without turning your life upside down.",
      },
      {
        title: "You have insulin resistance or Type 2 Diabetes",
        text: "The whole method is built around steady blood sugar.",
      },
      {
        title: "You finally want to eat in balance",
        text: "For life — not until the end of another diet.",
      },
      {
        title: "You feel low on energy and bloated",
        text: "The afternoon crash, the bloating and the constant appetite have a cause — and a solution.",
      },
      {
        title: "You don't want to starve or live at the gym",
        text: "There are no bans here, no calorie counting and no hours of training.",
      },
      {
        title: "You want a change that works for your family too",
        text: "The same delicious food for everyone at the table.",
      },
    ],
    closing: "Recognise yourself in more than two of these? Then the challenge is for you.",
  },
  visualize: {
    ...poStroyniIShtastliviBg.visualize!,
    title: "Here's how we do it together over 21 days",
    items: [
      "A proper structure for your day, and real motivation",
      "Easy, quick meals and ideas for busy people",
      "Delicious recipes the whole family enjoys",
      "Less stress and less need for emotional eating",
      "A group Zoom session with me — Vessie Nay, holistic nutritionist",
    ],
  },
  testimonials: [
    {
      headline: "10 kg down in total",
      quote:
        "Natasha kept going with the Challenge after it ended — 10 kg lighter in total.",
      name: "Natasha",
    },
    {
      headline: "28 cm off in 21 days",
      quote: "Mostly around the tummy — in three weeks, without hunger or hours of cooking.",
      name: "Hrisi Valkova",
    },
    {
      headline: "Not a regime, but a whole change",
      quote:
        "Vessie is very creative in giving the best guidance without imposing strict limits. This isn't just a diet plan — it's a complete change in how you think about food and how you treat yourself. It feels like talking to a genuinely caring friend, not a dietitian.",
      name: "Teddy Bogdanova, Sofia",
    },
    {
      headline: "An excellent motivator and specialist",
      quote:
        "Besides knowledge, you need discipline and motivation. Vessie always gives her time and attention, and finds a way to bring me back on track when I drift. Her approach is holistic — beyond food, she addresses mindset too.",
      name: "Vivi Jones, Brighton",
    },
    {
      headline: "No hunger and clearer skin",
      quote:
        "I stuck to the plan and lost several kilos. The fat around my middle and hips melted away, my skin got clearer, and I never felt hungry the way I did on previous diets.",
      name: "Daniela Nova, United Kingdom",
    },
    {
      headline: "A flatter tummy and better sleep",
      quote:
        "The main benefit for me was knowing I'd done something good for myself — and how great I looked and felt afterwards: no bloating, a flatter tummy, better sleep and more energy.",
      name: "Evelina, Denmark",
    },
    {
      headline: "From the inside out",
      quote:
        "Vessie will change not only the way you eat, but the way you look and live. Happy, healthy and confident — from the inside out.",
      name: "Vasi Angelova, CFO BOIARON",
    },
    {
      headline: "No overeating and no emotional eating",
      quote:
        "Thank you, Vessie. I cannot thank you enough. It's been a wonderful kickstart to better healthy choices. I feel more in control, and I've not overeaten or eaten on emotion since starting this journey with you. I've also got back to swimming, which I adore.",
      name: "Sarah, Sandhurst",
    },
  ],
  testimonialsNote:
    "Results are individual and depend on your starting point and consistency.",
  promoStrip: {
    ...poStroyniIShtastliviBg.promoStrip!,
    subtitle: "An innovative method with 94% success",
    title: "In just 21 days we achieve",
    stat: "The innovative T2DPR method has already changed thousands of lives in the UK. Now it's here too.",
    checklist: [
      "~20 cm off your measurements — tummy, hips and thighs",
      "~3–5 kg down, and that's only the beginning",
      "Higher confidence and a real sense of personal success",
      "Time, money and worry at the doctor's office, all saved",
    ],
    footer: "Delicious, easy and for the whole family",
  },
  comparison: {
    title: "Important: this is NOT another diet",
    positive: {
      title: "“21 Days Slimmer and Happier”",
      bullets: [
        "Balanced eating that protects your blood sugar and your energy",
        "Delicious recipes and 3 weekly menus with everyday supermarket ingredients",
        "A clear structure for your day — you know what to eat and when",
        "Easy to prepare, even for a beginner, and right for the whole family",
        "Knowledge and skills that stay with you for life",
        "Support and motivation instead of bans and guilt",
      ],
    },
    negative: {
      title: "Who the challenge is NOT for",
      bullets: [
        "If you're looking for a miracle — 10 kg in 10 days. Here the result is realistic and gentle: 3–5 kg and 20–25 cm in 21 days.",
        "If you're not ready to apply even the small steps — the guidance only works when you follow it.",
        "If you're looking for a vegan or vegetarian menu — this is a general eating programme.",
      ],
      closing:
        "The challenge doesn't promise you a miracle. It promises realistic, gentle change — and knowledge that stays.",
    },
  },
  transformation: {
    ...poStroyniIShtastliviBg.transformation!,
    title: "One change, a whole family",
    before: [
      "She “lived” on chocolate and complained of a bloated belly",
      "He was stressed at work and worried by a pre-diabetes diagnosis",
      "Both of them confused and anxious about the future",
    ],
    after: [
      "They eat deliciously, they're calm, and they enjoy the compliments",
      "He is in good spirits again and plays with the kids",
      "And she simply glows",
    ],
    audienceTitle: "Often the whole family joins in",
    audienceBullets: [
      "The same delicious food for everyone at the table",
      "No cooking separately for you and for the rest",
      "The change lasts, because it's shared",
    ],
  },
  curriculum: {
    intro: "The challenge is like a video book — everything you need for your success, in one place.",
    title: "What will you gain?",
    items: [
      {
        title: "You'll eat in balance and feel full",
        text: "And lose weight for good — around 3–5 kg a month, without hunger or deprivation.",
      },
      {
        title: "You'll know how to combine foods",
        text: "What to eat and how much of it — for a slimmer figure and steady blood sugar.",
      },
      {
        title: "You'll have a calm, organised day",
        text: "A clear structure to follow, instead of chaos and impulsive decisions.",
      },
      {
        title: "You'll prepare your food easily",
        text: "Delicious meals the whole family can eat — without hours in the kitchen.",
      },
      {
        title: "You'll know what to order when eating out",
        text: "At the restaurant, at work and at friends' — calmly and without guilt.",
      },
      {
        title: "You'll have much more energy",
        text: "No afternoon crash and no constant feeling of hunger.",
      },
      {
        title: "You'll have lasting, inner motivation",
        text: "Not by force, but because you see and feel the change every day.",
      },
      {
        title: "You'll have knowledge for life",
        text: "How to stay healthy — without insulin resistance, excess weight and Type 2 Diabetes.",
      },
    ],
    closing:
      "I wish you every success from the heart. This system has helped thousands of people in the UK and Bulgaria — today it can help you and your family. With love, Vessie Nay",
  },
  pillars: {
    title: "Our gifts for you",
    items: [
      {
        title: "Bonus 1 · A group Zoom session with Vessie Nay",
        text: "Live, with questions and answers — with a specialist in insulin resistance, weight loss and Type 2 Diabetes.",
      },
      {
        title: "Bonus 2 · “How to eat out without guilt”",
        text: "A guide for restaurants, hotels and visiting friends — you know what to order and enjoy it calmly.",
      },
      {
        title: "Bonus 3 · “Biohacking for weight loss”",
        text: "Small, easy habits that speed up your result without adding time to your day.",
      },
    ],
  },
  includes: {
    title: "What does the challenge include?",
    items: [
      {
        title: "Recipes for breakfast, lunch and dinner",
        text: "Delicious and easy, with everyday supermarket ingredients.",
      },
      {
        title: "3 weekly menus",
        text: "Varied, tasty food laid out day by day — no wondering what to cook.",
      },
      {
        title: "Practical videos, week by week",
        text: "With precise, clear instructions you can watch whenever it suits you.",
      },
      {
        title: "Knowledge from a leading medical specialist",
        text: "Not just a menu, but an understanding of why it works — and how to apply it yourself.",
      },
      {
        title: "The calm of finally knowing how",
        text: "No more searching through a sea of contradictory information.",
      },
      {
        title: "Gradual change of the habits that matter",
        text: "Step by step in the right direction, without abrupt turns.",
      },
      {
        title: "All from the comfort of your home",
        text: "You watch the videos, take part and apply the changes — and they're remarkably easy.",
      },
    ],
  },
  trust: {
    ...poStroyniIShtastliviBg.trust!,
    title: "Hello, I'm Vessie",
    greeting: "Holistic Nutritionist, B.Med.Sc. (Hons), Cambridge CDEP",
    credentials: [
      "Specialist: insulin resistance and Type 2 Diabetes",
      "Healthy weight loss and real motivation (you do need it 🙂)",
      "Years of specialist practice in the UK — an innovative method with a 94% success rate",
      "Author of the first Bulgarian system for insulin resistance, Type 2 Diabetes and lasting weight loss — “Slimmer and Happier”",
      "I've helped hundreds of patients and clients",
    ],
    accolades: [
      "94% client success rate",
      "I work with people from 15 countries",
    ],
  },
  pricing: {
    ...poStroyniIShtastliviBg.pricing!,
    title: "Start the change",
    titleAccent: "today",
    subtitle: "€152 → €49 for the first 20 places. After that the fee goes up.",
    audienceTitle: "Important to know:",
    audienceBullets: [
      "Realistic and gentle: over 21 days expect 3–5 kg and 20–25 cm off your measurements, mostly around the tummy.",
      "Balanced eating and easy steps — change from the inside out, not bans.",
      "This is a general eating programme — it is not vegan or vegetarian.",
      "You start whenever you like, and access is guaranteed for at least 3 months.",
    ],
    options: [
      {
        label: "21 Days “Slimmer and Happier”",
        badge: "68% off",
        price: "€49",
        note: "Instead of €152 · for the first 20 places · at least 3 months of access · start on a date that suits you",
        cta: "Yes! I'm joining",
        href: contactSection,
      },
    ],
    ps: "💚 You save a great deal on medication and on the junk you no longer buy — wafers, biscuits, chocolate — for years to come. 📩 Within 48 hours of payment you get an email with the recipes, the food group list and the link to take part — check your Spam folder too. 🔒 Payment is secure.",
  },
  faq: [
    {
      q: "Will it be complicated to prepare and take a lot of time?",
      a: "No — the recipes are very easy and quick, even for a beginner.",
    },
    {
      q: "Will I have to cook separately for myself and for my family?",
      a: "No. Your family can eat the same food.",
    },
    {
      q: "I'm at work — how will I fit the new way of eating in?",
      a: "You can make 2–3 times the quantity and bring a lunch box. And on day one you learn what to choose for lunch at work or in a café.",
    },
    {
      q: "Does the effect last?",
      a: "Yes — you'll lose weight lastingly and healthily. You'll be able to use these skills for life; the challenge is the best investment in your future.",
    },
    {
      q: "I just want to lose weight, I don't have insulin resistance — can I join?",
      a: "Yes, the challenge is suitable for you and will help.",
    },
    {
      q: "There are foods I don't like — broccoli, for instance. Is that a problem?",
      a: "No. There's a food list you can swap from, and you can even replace a whole recipe in the menu with another from the list. There are extra bonus recipes too.",
    },
    {
      q: "If I pay now, can I start later?",
      a: "Yes — your access is guaranteed for at least 3 months, so you start on a date that suits you.",
    },
  ],
  finalCta: {
    title: "Ready for 21 days that change everything?",
    cta: "Yes! I'm joining",
    href: pricingAnchor,
  },
};
