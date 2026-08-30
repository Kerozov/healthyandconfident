/**
 * The site buttons an admin can edit, named after what they actually do.
 *
 * A `site_cta_placements` row only carries a key and a label written by a
 * migration; the site decides where that key is rendered, so several rows drive
 * more than one button and a few of the old labels name a programme that no
 * longer exists. Keeping the naming here — next to the components that use the
 * keys — is what makes the admin screen readable, and it stays right without
 * re-running a migration.
 */
export type SiteButtonKind = "button" | "offer";

export type SiteButtonSpec = {
  key: string;
  /** What this button is, in the admin's words. */
  name: string;
  /** Every place on the site the one row controls. */
  where: string;
  /** Text shown when the label is left empty. */
  defaultLabel?: string;
  /** `offer` rows have no button — only the popup offer. */
  kind?: SiteButtonKind;
};

export type SiteButtonGroup = {
  id: string;
  title: string;
  note?: string;
  buttons: SiteButtonSpec[];
};

export const SITE_BUTTON_GROUPS: SiteButtonGroup[] = [
  {
    id: "programs_1",
    title: "Програма „Живей без резистентност“",
    note: "/bg/programs/zhivey-bez-rezistentnost",
    buttons: [
      {
        key: "programs_1",
        name: "Главен бутон",
        where:
          "Картата на началната страница, големият бутон в началото на страницата, бутонът под видеото и последният бутон.",
        defaultLabel: "Включи се днес",
      },
      {
        key: "programs_1_secondary",
        name: "Втори бутон горе",
        where: "До главния бутон в началото на страницата.",
        defaultLabel: "Виж какво включва",
      },
      {
        key: "programs_1_pricing_0",
        name: "Цена „Месечни вноски“ (3 × 180 €)",
        where: "Секцията с цените.",
        defaultLabel: "Включи се с месечни вноски",
      },
      {
        key: "programs_1_pricing_1",
        name: "Цена „Еднократно днес“ (480 €)",
        where: "Секцията с цените.",
        defaultLabel: "Включи се с еднократна такса днес",
      },
    ],
  },
  {
    id: "programs_2",
    title: "Програма „Препрограмирай апетита“",
    note: "/bg/programs/preprogramirai-apetita",
    buttons: [
      {
        key: "programs_2",
        name: "Главен бутон",
        where:
          "Картата на началната страница, банерът „За мен“ на началната страница, големият бутон горе, бутонът под видеото и последният бутон.",
        defaultLabel: "Да, искам да се справя",
      },
      {
        key: "programs_2_secondary",
        name: "Втори бутон горе",
        where: "До главния бутон в началото на страницата.",
        defaultLabel: "Какво включва клубът",
      },
      {
        key: "programs_2_pricing_0",
        name: "Цена „Месечен достъп“ (€38/месец)",
        where: "Секцията с цените.",
        defaultLabel: "Искам достъп сега",
      },
      {
        key: "programs_2_pricing_1",
        name: "Цена „Вариант 1“ (28 €/месец)",
        where: "Секцията с цените.",
        defaultLabel: "Искам достъп сега",
      },
      {
        key: "programs_2_pricing_2",
        name: "Цена „Вариант 2“ (30 €/месец)",
        where: "Секцията с цените.",
        defaultLabel: "Искам достъп сега",
      },
    ],
  },
  {
    id: "programs_0",
    title: "Програма „Лято – стройна и спокойна“",
    note: "/bg/programs/summer-programme",
    buttons: [
      {
        key: "programs_0",
        name: "Главен бутон",
        where:
          "Картата на началната страница, големият бутон горе и последният бутон на страницата.",
        defaultLabel: "Искам моето спокойно лято",
      },
      {
        key: "programs_0_secondary",
        name: "Втори бутон горе",
        where: "До главния бутон в началото на страницата.",
        defaultLabel: "Виж какво има вътре",
      },
      {
        key: "programs_0_pricing_0",
        name: "Цена „Летен пакет“ (€36)",
        where: "Секцията с цените.",
        defaultLabel: "Вземи летния пакет сега",
      },
    ],
  },
  {
    id: "home",
    title: "Начална страница",
    buttons: [
      {
        key: "about_cta",
        name: "Секция „За мен“",
        where: "Бутонът под кратката биография.",
        defaultLabel: "Работи с мен",
      },
      {
        key: "outcomes_cta",
        name: "Секция „Резултати“",
        where: "Бутонът под списъка с резултати. Празно = секция „Програми“.",
      },
      {
        key: "challenge_21_cta",
        name: "21-дневно предизвикателство",
        where: "Бутонът в тъмната секция за предизвикателството.",
      },
    ],
  },
  {
    id: "offers",
    title: "Оферта след запис за безплатното меню",
    buttons: [
      {
        key: "leadmagnet_cta",
        name: "Popup оферта",
        where:
          "Показва се веднага след като някой остави имейла си за безплатното 2-дневно меню. Тук няма бутон за настройка — само офертата.",
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
