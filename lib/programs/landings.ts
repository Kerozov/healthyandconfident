import type { Locale } from "@/i18n/config";
import type { ProgramLandingContent, ProgramLandingSlug } from "./types";

const contact = "/#contact";
const whatsapp = "https://wa.me/447876565263";

const bg: Record<ProgramLandingSlug, ProgramLandingContent> = {
  "zhivey-bez-rezistentnost": {
    slug: "zhivey-bez-rezistentnost",
    meta: {
      title: "Живей без резистентност | 3-месечна програма — Веси Ней",
      description:
        "Трайно отслабване 5–15 кг, справяне с инсулинова резистентност и Диабет 2. Доказан метод с 94% успех — без глад и лишения.",
    },
    hero: {
      eyebrow: "3-месечна трансформация · 94% успех",
      title: "Отключи",
      titleAccent: "най-добрата си форма",
      subtitle:
        "Живей без ограничения! Доказана система за трайно отслабване и справяне с инсулиновата резистентност — без глад, без поредната диета.",
      bullets: [
        "Свали 5–10–15 кг за 3 месеца",
        "Овладей инсулиновата резистентност",
        "Повече енергия и увереност всеки ден",
      ],
      primaryCta: "Запиши безплатен разговор",
      primaryHref: whatsapp,
      secondaryCta: "Виж какво включва",
      secondaryHref: "#includes",
      placementKey: "programs_1",
    },
    pain: {
      title: "Чувстваш ли се…",
      paragraphs: [
        "Като претоварена жена — работа, семейство, дом — и свикнала да се справяш сама? Уморена от диети без траен резултат, с подут корем и дрехи, които не ти стават?",
        "Нямаш енергия за работа и семейство. Притесняваш се от инсулинова резистентност и диабет. Кантарът не помръдва, въпреки усилията.",
      ],
      hook: "Ти не си сама — и решение вече има!",
    },
    vision: {
      title: "Представи си…",
      paragraphs: [
        "Да се събуждаш с енергия, да обличаш каквото искаш с увереност и да се наслаждаваш на храната без вина.",
        "Това не е мечта — стотици жени го постигнаха с „Живей без резистентност“. Метод, съчетаващ медицински новости с психология на успеха за трайни резултати.",
      ],
    },
    outcomes: {
      title: "Какво ще постигнем за 3 месеца",
      items: [
        {
          title: "Трайно отслабване",
          text: "Свали 5–10–15 кг и поне 25 см от обиколки без глад. Върни увереността и харесай образа си в огледалото.",
        },
        {
          title: "Балансирано здраве",
          text: "Раздели се с инсулиновата резистентност, подобри кръвна захар и намали излишните медикаменти — без тормоз с глад.",
        },
        {
          title: "Неизчерпаема енергия",
          text: "Сбогом на следобедната умора. Стабилна енергия за семейство, работа, приятели и пътувания.",
        },
      ],
    },
    pillars: {
      title: "Трите стълба на твоя успех",
      items: [
        {
          title: "Изчистване и метаболизъм",
          text: "Вкусна, засищаща храна, която ускорява метаболизма, изчиства мазнините (вкл. черен дроб) и подкрепя щитовидната жлеза.",
        },
        {
          title: "Баланс на кръвната захар",
          text: "Забрави пристъпите на глад и желанието за сладко. Стабилна захар = повече енергия и настроение.",
        },
        {
          title: "Нов начин на мислене",
          text: "Техники от невронаука и позитивна психология — справяне с емоционално хранене и постоянство.",
        },
      ],
    },
    includes: {
      title: "Всичко на едно място",
      items: [
        {
          title: "3-месечна онлайн програма",
          text: "Хранене + движение + спокойствие. Достъп от телефон, таблет или компютър — в твое темпо.",
        },
        {
          title: "Седмични Zoom срещи",
          text: "Не си сама — групова подкрепа, мотивация и отговори на всички въпроси.",
        },
        {
          title: "Рецепти и 6 седмични менюта",
          text: "Вкусна, достъпна храна за цялото семейство + хранителен детокс.",
        },
        {
          title: "Затворена общност",
          text: "Подкрепяща среда от мотивирани жени, които разбират пътя ти.",
        },
        {
          title: "Визуални ръководства",
          text: "Как да се справиш навън, на празници, при пътувания — без объркване.",
        },
      ],
    },
    testimonials: [
      {
        name: "Кейти",
        quote:
          "Свалих 31 см от обиколки и достигнах 58 кг. Вече не посягам към вафлите между срещите!",
      },
      {
        name: "Славина",
        quote:
          "Минус 19,5 кг за 4,5 месеца, докато се грижа за бебчето. Цялото семейство обича рецептите!",
      },
      {
        name: "Патриша",
        quote: "След 6 месеца вече нямам диабет тип 2. Това промени живота ми!",
      },
      {
        name: "Петя",
        quote:
          "Овладях инсулиновата резистентност и стреса. Имам време за семейството и пътувания.",
      },
    ],
    faq: [
      {
        q: "Колко време отделям седмично?",
        a: "Около 1 час за седмичната среща + 15–30 мин дневно за храна и движение.",
      },
      {
        q: "Трябва ли специални продукти?",
        a: "Не — обикновени продукти от магазина. Рецептите са лесни и харесват се на цялото семейство.",
      },
      {
        q: "За кого е подходяща програмата?",
        a: "За инсулинова резистентност, пред-/диабет тип 2, менопауза, Хашимото, хипотиреоидизъм и трайно отслабване.",
      },
    ],
    pricing: {
      title: "Готова ли си за живот без резистентност?",
      subtitle: "Инвестицията в здравето ти е най-ценната. Запиши разговор за място и условия.",
      options: [
        {
          label: "Месечни вноски",
          price: "3 × 180 €",
          note: "Вместо 1 090 € · около 5,90 €/ден",
          cta: "Запиши разговор",
        },
        {
          label: "Еднократно днес",
          price: "480 €",
          note: "Вместо 1 090 € · около 5,30 €/ден",
          cta: "Запиши разговор",
        },
      ],
      ps: "Местата с отстъпка са ограничени — побързай!",
    },
    finalCta: {
      title: "Следващата стъпка е безплатен разговор",
      cta: "Запиши безплатен разговор",
      href: whatsapp,
    },
  },
  "preprogramirai-apetita": {
    slug: "preprogramirai-apetita",
    meta: {
      title: "Препрограмирай апетита | Клуб — Веси Ней",
      description:
        "Само 7–10 минути на ден. Пусни стреса, блокажите и изкушенията към шоколад и тестени.",
    },
    hero: {
      eyebrow: "Клуб · 7–10 мин/ден",
      title: "Препрограмирай",
      titleAccent: "апетита си",
      subtitle:
        "Не още една диета — ежедневни практики, които освобождават от стрес, блокажи и постоянното желание за сладко и тесто.",
      bullets: [
        "Кратки практики всеки ден",
        "Работа със стрес и емоционално хранене",
        "Спокойствие и контрол без лишения",
      ],
      primaryCta: "Започни днес",
      primaryHref: contact,
      placementKey: "programs_2",
    },
    pain: {
      title: "Запознато ли ти е?",
      paragraphs: [
        "Знаеш какво е здравословно, но вечерта пак те тегли към шоколад, хляб или нещо „за настроение“.",
        "Стресът, умората и старите навици печелят — а после идва вината и още по-голям апетит.",
      ],
      hook: "Има начин да смениш режима — без война със себе си.",
    },
    vision: {
      title: "Какво е клубът",
      paragraphs: [
        "„Препрограмирай апетита“ е структуриран клуб с кратки ежедневни упражнения за ума и тялото — базирани на невронаука и работа със стреса.",
        "За 7–10 минути на ден изграждаш нови реакции: по-малко изкушения, повече спокойствие, по-лесен избор на храна.",
      ],
    },
    outcomes: {
      title: "Какво ще усетиш",
      items: [
        {
          title: "По-малко изкушения",
          text: "Шоколад, тестени и „емоционално хранене“ губят силата си — без крайни забрани.",
        },
        {
          title: "По-малко стрес",
          text: "Научаваш да спреш веригата „стрес → храна → вина“ още в началото.",
        },
        {
          title: "Повече контрол",
          text: "Решенията стават лесни — храната отново е приятел, не враг.",
        },
      ],
    },
    pillars: {
      title: "Как работи",
      items: [
        {
          title: "Ежедневни микро-практики",
          text: "7–10 минути — подходящи за зает график, без часове в кухнята.",
        },
        {
          title: "Работа със стреса",
          text: "Техники за тяло и ум, които намаляват импулса да „залъгаш“ с храна.",
        },
        {
          title: "Подкрепа и структура",
          text: "Ясна рамка и насоки от Веси — не си сама в процеса.",
        },
      ],
    },
    includes: {
      title: "Какво получаваш",
      items: [
        {
          title: "Достъп до клубните материали",
          text: "Видеа, аудио практики и упражнения — стъпка по стъпка.",
        },
        {
          title: "Фокус върху апетита и навици",
          text: "Не калории и везни — а защо ядеш и как да промениш това.",
        },
        {
          title: "Гъвкавост",
          text: "Практикуваш когато ти е удобно — от телефон или компютър.",
        },
      ],
    },
    testimonials: [
      {
        name: "Клиентка",
        quote:
          "За първи път не се чувствам на диета — а все пак спрях да търся сладко всеки ден.",
      },
    ],
    faq: [
      {
        q: "Колко време на ден?",
        a: "7–10 минути — достатъчно за реална промяна без претоварване.",
      },
      {
        q: "Подходящо ли е с друга програма?",
        a: "Да — отлично допълва „Живей без резистентност“ или самостоятелно за старт.",
      },
    ],
    finalCta: {
      title: "Готова да превърнеш апетита в съюзник?",
      cta: "Започни днес",
      href: contact,
    },
  },
  "balansirano-hranene-21": {
    slug: "balansirano-hranene-21",
    meta: {
      title: "Балансирано хранене за 21 дни | Предизвикателство — Веси Ней",
      description:
        "Свали трайно 3–5 кг и научи балансирано хранене за цял живот. 21-дневно предизвикателство с -52% днес.",
    },
    hero: {
      eyebrow: "21-дневно предизвикателство · -52%",
      title: "Свали трайно",
      titleAccent: "3–5 кг за 21 дни",
      subtitle:
        "Край с диетите! Научи магията на балансираното вкусно хранене — с рецепти, видеа и ясна структура.",
      bullets: [
        "Вкусни рецепти за всяко хранене",
        "Видеа + бонус материали",
        "Как да комбинираш храните за стройна фигура",
      ],
      primaryCta: "Включи се сега",
      primaryHref: contact,
      placementKey: "programs_0",
    },
    outcomes: {
      title: "Какво ще постигнеш",
      items: [
        {
          title: "3–5 кг по-малко",
          text: "Реално и трайно отслабване без глад и изтощение.",
        },
        {
          title: "Умения за цял живот",
          text: "Разбираш как да комбинираш храните — не просто следваш меню.",
        },
        {
          title: "Повече енергия",
          text: "По-леко тяло, по-малко подуване, по-добро настроение.",
        },
      ],
    },
    includes: {
      title: "Какво включва",
      items: [
        {
          title: "21-дневно меню",
          text: "Ясни закуски, обяди и вечери — вкусни и семейни.",
        },
        {
          title: "Видеа за балансирано хранене",
          text: "Научаваш принципите, не само рецептите.",
        },
        {
          title: "Бонуси",
          text: "Допълнителни материали за комбиниране на храни и навици.",
        },
      ],
    },
    pricing: {
      title: "Специална цена днес",
      subtitle: "Включи се в предизвикателството с -52% отстъпка.",
      options: [
        {
          label: "21-дневен достъп",
          price: "Специална оферта",
          note: "Пиши ни за актуална цена и стартова дата",
          cta: "Включи се",
        },
      ],
    },
    finalCta: {
      title: "Готова за бърз, но трайен старт?",
      cta: "Включи се сега",
      href: contact,
    },
  },
};

const en: Record<ProgramLandingSlug, ProgramLandingContent> = {
  "zhivey-bez-rezistentnost": {
    ...bg["zhivey-bez-rezistentnost"],
    slug: "zhivey-bez-rezistentnost",
    meta: {
      title: "Live Without Resistance | 3-Month Program — Vessie Ney",
      description:
        "Sustainable 5–15 kg weight loss and insulin resistance support. 94% success rate.",
    },
    hero: {
      eyebrow: "3-month transformation · 94% success",
      title: "Unlock your",
      titleAccent: "best shape",
      subtitle:
        "Live without restrictions. Proven system for sustainable weight loss and insulin resistance.",
      bullets: [
        "Lose 5–15 kg in 3 months",
        "Take control of insulin resistance",
        "More energy every day",
      ],
      primaryCta: "Book a free call",
      primaryHref: whatsapp,
      secondaryCta: "See what's included",
      secondaryHref: "#includes",
      placementKey: "programs_1",
    },
    pain: {
      title: "Does this sound familiar?",
      paragraphs: [
        "Overwhelmed, tired of diets that don't last, bloating and clothes that don't fit?",
        "Low energy and worry about insulin resistance and diabetes.",
      ],
      hook: "You're not alone — there is a solution.",
    },
    vision: {
      title: "Imagine…",
      paragraphs: [
        "Waking with energy, wearing what you love, enjoying food without guilt.",
        "Hundreds of women achieved this with Live Without Resistance.",
      ],
    },
    outcomes: {
      title: "What we achieve in 3 months",
      items: bg["zhivey-bez-rezistentnost"].outcomes!.items.map((item, i) => ({
        title: ["Sustainable weight loss", "Balanced health", "Lasting energy"][i],
        text: item.text,
      })),
    },
    pillars: {
      title: "Three pillars of success",
      items: bg["zhivey-bez-rezistentnost"].pillars!.items.map((item, i) => ({
        title: ["Metabolism", "Blood sugar", "Mindset"][i],
        text: item.text,
      })),
    },
    includes: bg["zhivey-bez-rezistentnost"].includes!,
    testimonials: [
      { name: "Kate", quote: "Lost 31 cm and reached 58 kg!" },
      { name: "Slavina", quote: "19.5 kg in 4.5 months while caring for my baby." },
    ],
    faq: bg["zhivey-bez-rezistentnost"].faq,
    pricing: {
      title: "Ready for life without resistance?",
      subtitle: "Book a free call to discuss options.",
      options: [
        { label: "Monthly", price: "3 × €180", note: "Instead of €1,090", cta: "Book a call" },
        { label: "Pay in full", price: "€480", note: "Limited spots", cta: "Book a call" },
      ],
    },
    finalCta: {
      title: "Your next step is a free call",
      cta: "Book a free call",
      href: whatsapp,
    },
  },
  "preprogramirai-apetita": {
    slug: "preprogramirai-apetita",
    meta: {
      title: "Reprogram Your Appetite | Club — Vessie Ney",
      description: "7–10 minutes a day. Release stress and food cravings.",
    },
    hero: {
      eyebrow: "Club · 7–10 min/day",
      title: "Reprogram your",
      titleAccent: "appetite",
      subtitle: "Daily practices — not another diet.",
      bullets: ["Short daily practices", "Stress tools", "Calm and control"],
      primaryCta: "Start today",
      primaryHref: contact,
      placementKey: "programs_2",
    },
    pain: bg["preprogramirai-apetita"].pain,
    vision: bg["preprogramirai-apetita"].vision,
    outcomes: bg["preprogramirai-apetita"].outcomes!,
    pillars: bg["preprogramirai-apetita"].pillars!,
    includes: bg["preprogramirai-apetita"].includes!,
    finalCta: {
      title: "Ready to make appetite your ally?",
      cta: "Start today",
      href: contact,
    },
  },
  "balansirano-hranene-21": {
    slug: "balansirano-hranene-21",
    meta: {
      title: "Balanced Nutrition 21 Days — Vessie Ney",
      description: "Lose 3–5 kg and learn balanced eating for life.",
    },
    hero: {
      eyebrow: "21-day challenge",
      title: "Lose",
      titleAccent: "3–5 kg in 21 days",
      subtitle: "End the diet cycle with recipes, videos and structure.",
      bullets: ["Tasty recipes", "Videos & bonuses", "Food combining skills"],
      primaryCta: "Join now",
      primaryHref: contact,
      placementKey: "programs_0",
    },
    outcomes: bg["balansirano-hranene-21"].outcomes!,
    includes: bg["balansirano-hranene-21"].includes!,
    pricing: bg["balansirano-hranene-21"].pricing,
    finalCta: {
      title: "Ready for a fast start?",
      cta: "Join now",
      href: contact,
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
  const fix = (href: string) =>
    href === "/#contact" ? `/${locale}#contact` : href;

  return {
    ...content,
    hero: {
      ...content.hero,
      primaryHref: fix(content.hero.primaryHref),
      secondaryHref: content.hero.secondaryHref
        ? fix(content.hero.secondaryHref)
        : undefined,
    },
    finalCta: content.finalCta
      ? { ...content.finalCta, href: fix(content.finalCta.href) }
      : undefined,
  };
}
