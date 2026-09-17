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
 *
 * Each spot also carries the page it is on, so the admin can frame that page and
 * light the button up instead of reading a description of where it should be.
 */
export type SiteButtonKind = "button" | "offer";

/** One place on the site where a button row is rendered. */
export type SiteButtonSpot = {
  /** Where it sits, in the admin's words. */
  where: string;
  /**
   * Path of the page that renders it, without the locale — `""` is the home
   * page, `/programs/x` a programme page. The locale is added when previewing,
   * so the same spot works for `/bg` and `/en`.
   */
  path: string;
};

export type SiteButtonSpec = {
  key: string;
  /** What this button is, in the admin's words. */
  name: string;
  /** Every spot on the site this one row controls, one entry per spot. */
  spots: SiteButtonSpot[];
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
  /** Path of that page without the locale, so the admin can open and look. */
  path?: string;
  note?: string;
  buttons: SiteButtonSpec[];
};

const HOME = "";
const PROGRAM_SUMMER = "/programs/summer-programme";
const PROGRAM_RESISTANCE = "/programs/zhivey-bez-rezistentnost";
const CLUB_APPETITE = "/programs/preprogramirai-apetita";
const CHALLENGE_21 = "/programs/po-stroyni-i-shtastlivi";

/** `/programs/x` on the Bulgarian site is `/bg/programs/x`. */
export function siteButtonPath(locale: string, path: string): string {
  return `/${locale}${path}`;
}

export const SITE_BUTTON_GROUPS: SiteButtonGroup[] = [
  {
    id: "home",
    title: "Начална страница",
    path: HOME,
    buttons: [
      {
        key: "about_cta",
        name: "Секция „За мен“ — бутон под биографията",
        spots: [
          {
            where: "Началната страница, секция „За мен“, под списъка с квалификации.",
            path: HOME,
          },
        ],
        defaultLabel: "Работи с мен",
        fallback: "Води към секция „Контакти“.",
      },
      {
        key: "bio_banner_cta",
        name: "Банер „Веси Ней“ — бутон „Към общността“",
        spots: [
          {
            where: "Тъмният банер със снимките на храна, в бялата карта вдясно.",
            path: HOME,
          },
        ],
        defaultLabel: "Към общността",
        fallback: "Води към страницата на клуб „Препрограмирай апетита“.",
      },
      {
        key: "outcomes_cta",
        name: "Секция „Резултати“ — бутон под списъка",
        spots: [
          { where: "Началната страница, секция „Резултати“.", path: HOME },
        ],
        fallback: "Води към секция „Програми“.",
      },
      {
        key: "challenge_21_cta",
        name: "21-дневно предизвикателство — бутон",
        spots: [
          {
            where: "Началната страница, тъмната секция за предизвикателството.",
            path: HOME,
          },
        ],
        fallback: "Води към формата за записване.",
      },
    ],
  },
  {
    id: "programs_1",
    title: "Програма „Живей без резистентност“",
    path: PROGRAM_RESISTANCE,
    buttons: [
      {
        key: "programs_1",
        name: "Главен бутон „Включи се днес“",
        spots: [
          {
            where: "Началната страница → картата на програмата в секция „Програми“.",
            path: HOME,
          },
          {
            where: "Страницата на програмата → големият бутон най-горе.",
            path: PROGRAM_RESISTANCE,
          },
        ],
        defaultLabel: "Включи се днес",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "programs_1_secondary",
        name: "Втори бутон горе „Виж какво включва“",
        spots: [
          {
            where: "Страницата на програмата → до главния бутон най-горе.",
            path: PROGRAM_RESISTANCE,
          },
        ],
        defaultLabel: "Виж какво включва",
        fallback: "Скролва до секцията „Какво включва“.",
      },
      {
        key: "programs_1_pricing_0",
        name: "Цена 1: „Месечни вноски“ — 3 × 180 €",
        spots: [
          {
            where: "Страницата на програмата → секцията с цените, първата карта.",
            path: PROGRAM_RESISTANCE,
          },
        ],
        defaultLabel: "Включи се с месечни вноски",
        sells: true,
      },
      {
        key: "programs_1_pricing_1",
        name: "Цена 2: „Еднократно днес“ — 480 €",
        spots: [
          {
            where: "Страницата на програмата → секцията с цените, втората карта.",
            path: PROGRAM_RESISTANCE,
          },
        ],
        defaultLabel: "Включи се с еднократна такса днес",
        sells: true,
      },
      {
        key: "programs_1_video",
        name: "Бутон под видеото",
        spots: [
          {
            where: "Страницата на програмата → секцията „Запознай се с мен и метода“.",
            path: PROGRAM_RESISTANCE,
          },
        ],
        defaultLabel: "Още подробности — видео тук",
        fallback: "Води към секция „Контакти“.",
      },
      {
        key: "programs_1_final",
        name: "Последен бутон най-долу",
        spots: [
          {
            where: "Страницата на програмата → тъмната лента най-накрая.",
            path: PROGRAM_RESISTANCE,
          },
        ],
        defaultLabel: "Свържи се с мен тук",
        fallback: "Води към секция „Контакти“.",
      },
    ],
  },
  {
    id: "programs_2",
    title: "Клуб „Препрограмирай апетита“",
    path: CLUB_APPETITE,
    buttons: [
      {
        key: "programs_2",
        name: "Главен бутон „Да, искам да се справя“",
        spots: [
          {
            where: "Началната страница → картата на клуба в секция „Програми“.",
            path: HOME,
          },
          {
            where: "Страницата на клуба → големият бутон най-горе.",
            path: CLUB_APPETITE,
          },
        ],
        defaultLabel: "Да, искам да се справя",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "programs_2_secondary",
        name: "Втори бутон горе „Какво включва клубът“",
        spots: [
          {
            where: "Страницата на клуба → до главния бутон най-горе.",
            path: CLUB_APPETITE,
          },
        ],
        defaultLabel: "Какво включва клубът",
        fallback: "Скролва до секцията „Какво включва“.",
      },
      {
        key: "programs_2_pricing_0",
        name: "Цена 1: „Месечен достъп“ — €38/месец",
        spots: [
          {
            where: "Страницата на клуба → секцията с цените, първата карта.",
            path: CLUB_APPETITE,
          },
        ],
        defaultLabel: "Искам достъп сега",
        sells: true,
      },
      {
        key: "programs_2_pricing_1",
        name: "Цена 2: „Вариант 1“ — 28 €/месец за 12 месеца",
        spots: [
          {
            where: "Страницата на клуба → секцията с цените, втората карта.",
            path: CLUB_APPETITE,
          },
        ],
        defaultLabel: "Искам достъп сега",
        sells: true,
      },
      {
        key: "programs_2_pricing_2",
        name: "Цена 3: „Вариант 2“ — 30 €/месец за 3 месеца",
        spots: [
          {
            where: "Страницата на клуба → секцията с цените, третата карта.",
            path: CLUB_APPETITE,
          },
        ],
        defaultLabel: "Искам достъп сега",
        sells: true,
      },
      {
        key: "programs_2_final",
        name: "Последен бутон най-долу („ГОТОВА СЪМ!“)",
        spots: [
          {
            where: "Страницата на клуба → тъмната лента най-накрая.",
            path: CLUB_APPETITE,
          },
        ],
        defaultLabel: "Искам достъп сега",
        sells: true,
        fallback: "Скролва до секцията с цените.",
      },
    ],
  },
  {
    id: "programs_0",
    title: "Програма „Лято – стройна и спокойна“",
    path: PROGRAM_SUMMER,
    buttons: [
      {
        key: "programs_0",
        name: "Главен бутон „Искам моето спокойно лято“",
        spots: [
          {
            where: "Началната страница → картата на програмата в секция „Програми“.",
            path: HOME,
          },
          {
            where: "Страницата на програмата → големият бутон най-горе.",
            path: PROGRAM_SUMMER,
          },
        ],
        defaultLabel: "Искам моето спокойно лято",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "programs_0_secondary",
        name: "Втори бутон горе „Виж какво има вътре“",
        spots: [
          {
            where: "Страницата на програмата → до главния бутон най-горе.",
            path: PROGRAM_SUMMER,
          },
        ],
        defaultLabel: "Виж какво има вътре",
        fallback: "Скролва до секцията „Какво включва“.",
      },
      {
        key: "programs_0_pricing_0",
        name: "Цена: „Летен пакет“ — €36 еднократно",
        spots: [
          {
            where: "Страницата на програмата → секцията с цените.",
            path: PROGRAM_SUMMER,
          },
        ],
        defaultLabel: "Вземи летния пакет сега",
        sells: true,
      },
      {
        key: "programs_0_final",
        name: "Последен бутон най-долу",
        spots: [
          {
            where: "Страницата на програмата → тъмната лента най-накрая.",
            path: PROGRAM_SUMMER,
          },
        ],
        defaultLabel: "Искам моето спокойно лято",
        sells: true,
        fallback: "Скролва до секцията с цените.",
      },
    ],
  },
  {
    id: "challenge_21",
    title: "Предизвикателство „21 дни по-стройни и щастливи“",
    path: CHALLENGE_21,
    note: "Програмата още не е пусната в „Програми“ — страницата работи, но бутоните чакат продукт в Stripe.",
    buttons: [
      {
        key: "product_po-stroyni-i-shtastlivi",
        name: "Главен бутон „Включи се сега“",
        spots: [
          {
            where: "Страницата на предизвикателството → големият бутон най-горе.",
            path: CHALLENGE_21,
          },
        ],
        defaultLabel: "Включи се сега",
        sells: true,
        fallback: "Скролва до секцията с цените на същата страница.",
      },
      {
        key: "product_po-stroyni-i-shtastlivi_secondary",
        name: "Втори бутон горе „Виж какво включва“",
        spots: [
          {
            where: "Страницата на предизвикателството → до главния бутон най-горе.",
            path: CHALLENGE_21,
          },
        ],
        defaultLabel: "Виж какво включва",
        fallback: "Скролва до секцията „Какво включва предизвикателството“.",
      },
      {
        key: "product_po-stroyni-i-shtastlivi_pricing_0",
        name: "Цена: „21 дни по-стройни и щастливи“ (€49)",
        spots: [
          {
            where: "Страницата на предизвикателството → секцията с цената.",
            path: CHALLENGE_21,
          },
        ],
        defaultLabel: "Да! Включвам се",
        sells: true,
        fallback: "Води към секция „Контакти“, докато няма избран продукт.",
      },
      {
        key: "product_po-stroyni-i-shtastlivi_final",
        name: "Последен бутон най-долу",
        spots: [
          {
            where: "Страницата на предизвикателството → тъмната лента най-накрая.",
            path: CHALLENGE_21,
          },
        ],
        defaultLabel: "Да! Включвам се",
        sells: true,
        fallback: "Скролва до секцията с цената.",
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
          {
            where:
              "Показва се веднага след като някой остави имейла си за безплатното 2-дневно меню.",
            path: HOME,
          },
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
