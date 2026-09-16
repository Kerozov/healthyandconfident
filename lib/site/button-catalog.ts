/**
 * Every button on the public site that an admin can edit, described the way the
 * person editing it sees it: which page, which section, what the button says
 * today.
 *
 * A `site_cta_placements` row only carries a key and a label written by a
 * migration, and a few of those labels still name a programme that no longer
 * exists. The site — not the database — decides where a key is rendered, so the
 * naming lives here, next to the components that use the keys, and stays right
 * without re-running a migration.
 */
export type SiteButtonKind = "button" | "offer";

export type SiteButtonSpec = {
  key: string;
  /** What this button is, in the admin's words. */
  name: string;
  /** Every spot on the page this one row controls, one entry per spot. */
  spots: string[];
  /** Text shown on the site when the label field is left empty. */
  defaultLabel?: string;
  /** What the button does when no Stripe product is chosen. */
  fallback?: string;
  /** True when the button is meant to sell something. */
  sells?: boolean;
  /** `offer` rows have no button — only the popup offer. */
  kind?: SiteButtonKind;
};

export type SiteButtonGroup = {
  id: string;
  /** The page these buttons live on. */
  title: string;
  /** Path of that page, so the admin can open it and look. */
  path?: string;
  note?: string;
  buttons: SiteButtonSpec[];
};

export const SITE_BUTTON_GROUPS: SiteButtonGroup[] = [
  {
    id: "home",
    title: "Начална страница",
    path: "/bg",
    buttons: [
      {
        key: "about_cta",
        name: "Секция „За мен“ — бутон под биографията",
        spots: ["Началната страница, секция „За мен“, под списъка с квалификации."],
        defaultLabel: "Работи с мен",
        fallback: "Води към секция „Контакти“.",
      },
      {
        key: "bio_banner_cta",
        name: "Банер „Веси Ней“ — бутон „Към общността“",
        spots: [
          "Тъмният банер със снимките на храна, в бялата карта вдясно.",
        ],
        defaultLabel: "Към общността",
        fallback: "Води към страницата на клуб „Препрограмирай апетита“.",
      },
      {
        key: "outcomes_cta",
        name: "Секция „Резултати“ — бутон под списъка",
        spots: ["Началната страница, секция „Резултати“."],
        fallback: "Води към секция „Програми“.",
      },
      {
        key: "challenge_21_cta",
        name: "21-дневно предизвикателство — бутон",
        spots: ["Началната страница, тъмната секция за предизвикателството."],
        fallback: "Води към формата за записване.",
      },
    ],
  },
  {
    id: "programs_1",
    title: "Програма „Живей без резистентност“",
    path: "/bg/programs/zhivey-bez-rezistentnost",
    buttons: [
      {
        key: "programs_1",
        name: "Главен бутон „Включи се днес“",
        spots: [
          "Началната страница → картата на програмата в секция „Програми“.",
          "Страницата на програмата → големият бутон най-горе.",
        ],
        defaultLabel: "Включи се днес",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "programs_1_secondary",
        name: "Втори бутон горе „Виж какво включва“",
        spots: ["Страницата на програмата → до главния бутон най-горе."],
        defaultLabel: "Виж какво включва",
        fallback: "Скролва до секцията „Какво включва“.",
      },
      {
        key: "programs_1_pricing_0",
        name: "Цена 1: „Месечни вноски“ — 3 × 180 €",
        spots: ["Страницата на програмата → секцията с цените, първата карта."],
        defaultLabel: "Включи се с месечни вноски",
        sells: true,
      },
      {
        key: "programs_1_pricing_1",
        name: "Цена 2: „Еднократно днес“ — 480 €",
        spots: ["Страницата на програмата → секцията с цените, втората карта."],
        defaultLabel: "Включи се с еднократна такса днес",
        sells: true,
      },
      {
        key: "programs_1_video",
        name: "Бутон под видеото",
        spots: ["Страницата на програмата → секцията „Запознай се с мен и метода“."],
        defaultLabel: "Още подробности — видео тук",
        fallback: "Води към секция „Контакти“.",
      },
      {
        key: "programs_1_final",
        name: "Последен бутон най-долу",
        spots: ["Страницата на програмата → тъмната лента най-накрая."],
        defaultLabel: "Свържи се с мен тук",
        fallback: "Води към секция „Контакти“.",
      },
    ],
  },
  {
    id: "programs_2",
    title: "Клуб „Препрограмирай апетита“",
    path: "/bg/programs/preprogramirai-apetita",
    buttons: [
      {
        key: "programs_2",
        name: "Главен бутон „Да, искам да се справя“",
        spots: [
          "Началната страница → картата на клуба в секция „Програми“.",
          "Страницата на клуба → големият бутон най-горе.",
        ],
        defaultLabel: "Да, искам да се справя",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "programs_2_secondary",
        name: "Втори бутон горе „Какво включва клубът“",
        spots: ["Страницата на клуба → до главния бутон най-горе."],
        defaultLabel: "Какво включва клубът",
        fallback: "Скролва до секцията „Какво включва“.",
      },
      {
        key: "programs_2_pricing_0",
        name: "Цена 1: „Месечен достъп“ — €38/месец",
        spots: ["Страницата на клуба → секцията с цените, първата карта."],
        defaultLabel: "Искам достъп сега",
        sells: true,
      },
      {
        key: "programs_2_pricing_1",
        name: "Цена 2: „Вариант 1“ — 28 €/месец за 12 месеца",
        spots: ["Страницата на клуба → секцията с цените, втората карта."],
        defaultLabel: "Искам достъп сега",
        sells: true,
      },
      {
        key: "programs_2_pricing_2",
        name: "Цена 3: „Вариант 2“ — 30 €/месец за 3 месеца",
        spots: ["Страницата на клуба → секцията с цените, третата карта."],
        defaultLabel: "Искам достъп сега",
        sells: true,
      },
      {
        key: "programs_2_final",
        name: "Последен бутон най-долу („ГОТОВА СЪМ!“)",
        spots: ["Страницата на клуба → тъмната лента най-накрая."],
        defaultLabel: "Искам достъп сега",
        sells: true,
        fallback: "Скролва до секцията с цените.",
      },
    ],
  },
  {
    id: "programs_0",
    title: "Програма „Лято – стройна и спокойна“",
    path: "/bg/programs/summer-programme",
    buttons: [
      {
        key: "programs_0",
        name: "Главен бутон „Искам моето спокойно лято“",
        spots: [
          "Началната страница → картата на програмата в секция „Програми“.",
          "Страницата на програмата → големият бутон най-горе.",
        ],
        defaultLabel: "Искам моето спокойно лято",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "programs_0_secondary",
        name: "Втори бутон горе „Виж какво има вътре“",
        spots: ["Страницата на програмата → до главния бутон най-горе."],
        defaultLabel: "Виж какво има вътре",
        fallback: "Скролва до секцията „Какво включва“.",
      },
      {
        key: "programs_0_pricing_0",
        name: "Цена: „Летен пакет“ — €36 еднократно",
        spots: ["Страницата на програмата → секцията с цените."],
        defaultLabel: "Вземи летния пакет сега",
        sells: true,
      },
      {
        key: "programs_0_final",
        name: "Последен бутон най-долу",
        spots: ["Страницата на програмата → тъмната лента най-накрая."],
        defaultLabel: "Искам моето спокойно лято",
        sells: true,
        fallback: "Скролва до секцията с цените.",
      },
    ],
  },
  {
    id: "offers",
    title: "Оферта след запис за безплатното меню",
    buttons: [
      {
        key: "leadmagnet_cta",
        name: "Popup оферта след безплатното меню",
        spots: [
          "Показва се веднага след като някой остави имейла си за безплатното 2-дневно меню.",
        ],
        kind: "offer",
      },
    ],
  },
];

const SPECS_BY_KEY = new Map<string, SiteButtonSpec>(
  SITE_BUTTON_GROUPS.flatMap((group) => group.buttons.map((b) => [b.key, b])),
);

export function siteButtonSpec(key: string): SiteButtonSpec | undefined {
  return SPECS_BY_KEY.get(key);
}

/** Keys the admin screen offers, in display order. */
export const EDITABLE_BUTTON_KEYS: string[] = [...SPECS_BY_KEY.keys()];
