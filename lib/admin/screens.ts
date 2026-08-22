export const ADMIN_SCREEN_GROUPS = [
  {
    label: "Преглед",
    screens: [
      {
        key: "dashboard",
        label: "Табло",
        href: "/admin",
        exact: true,
        description: "Обобщение на посещения, продажби и кампании",
      },
      {
        key: "guide",
        label: "Ръководство",
        href: "/admin/guide",
        description: "Вътрешно ръководство за работа с панела",
      },
    ],
  },
  {
    label: "Съдържание",
    screens: [
      {
        key: "blog",
        label: "Блог",
        href: "/admin/blog",
        description: "Статии, чернови и публикуване",
      },
      {
        key: "website",
        label: "Уебсайт",
        href: "/admin/website",
        description: "Секции, продукти, наръчници и CTA",
      },
      {
        key: "popup",
        label: "Popup",
        href: "/admin/popup",
        description: "Popup за събиране на имейли",
      },
      {
        key: "email-footer",
        label: "Email подпис",
        href: "/admin/email-footer",
        description: "Хедър, подпис и футър на имейлите",
      },
    ],
  },
  {
    label: "Аудитория",
    screens: [
      {
        key: "subscribers",
        label: "Абонати",
        href: "/admin/subscribers",
        description: "Абонати, сегменти и групи",
      },
      {
        key: "contacts",
        label: "Контакти",
        href: "/admin/contacts",
        description: "Контактно пътуване и задачи",
      },
      {
        key: "zoom",
        label: "Zoom",
        href: "/admin/zoom",
        description: "Zoom сесии и настройки за live",
      },
      {
        key: "forms",
        label: "Форми",
        href: "/admin/forms",
        description: "Форми, покани и отговори",
      },
    ],
  },
  {
    label: "Маркетинг",
    screens: [
      {
        key: "campaigns",
        label: "Кампании",
        href: "/admin/campaigns",
        description: "Имейл и SMS кампании",
      },
      {
        key: "automations",
        label: "Автоматизации",
        href: "/admin/automations",
        description: "Автоматични имейли и SMS",
      },
      {
        key: "meta",
        label: "Meta реклами",
        href: "/admin/meta",
        description: "Meta Pixel и събития",
      },
    ],
  },
  {
    label: "Анализи",
    screens: [
      {
        key: "visits",
        label: "Посещения",
        href: "/admin/visits",
        description: "Трафик към сайта",
      },
      {
        key: "engagement",
        label: "Статистика имейли",
        href: "/admin/engagement",
        description: "Отваряния и кликове по имейли",
      },
      {
        key: "payments",
        label: "Плащания",
        href: "/admin/payments",
        description: "Поръчки и оборот",
      },
    ],
  },
] as const;

export type AdminScreenKey =
  (typeof ADMIN_SCREEN_GROUPS)[number]["screens"][number]["key"];

export const ADMIN_SCREEN_KEYS = ADMIN_SCREEN_GROUPS.flatMap((group) =>
  group.screens.map((screen) => screen.key),
) as AdminScreenKey[];

const SCREEN_BY_KEY = new Map(
  ADMIN_SCREEN_GROUPS.flatMap((group) =>
    group.screens.map((screen) => [screen.key, screen] as const),
  ),
);

const PATH_PREFIXES: { prefix: string; screen: AdminScreenKey | "team" }[] = [
  { prefix: "/admin/team", screen: "team" },
  { prefix: "/admin/blog", screen: "blog" },
  { prefix: "/admin/website", screen: "website" },
  { prefix: "/admin/popup", screen: "popup" },
  { prefix: "/admin/email-footer", screen: "email-footer" },
  { prefix: "/admin/subscribers", screen: "subscribers" },
  { prefix: "/admin/contacts", screen: "contacts" },
  { prefix: "/admin/zoom", screen: "zoom" },
  { prefix: "/admin/forms", screen: "forms" },
  { prefix: "/admin/campaigns", screen: "campaigns" },
  { prefix: "/admin/automations", screen: "automations" },
  { prefix: "/admin/meta", screen: "meta" },
  { prefix: "/admin/visits", screen: "visits" },
  { prefix: "/admin/engagement", screen: "engagement" },
  { prefix: "/admin/payments", screen: "payments" },
  { prefix: "/admin/guide", screen: "guide" },
];

export function isAdminScreenKey(value: string): value is AdminScreenKey {
  return SCREEN_BY_KEY.has(value as AdminScreenKey);
}

export function sanitizeAdminScreens(input: unknown): AdminScreenKey[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<AdminScreenKey>();
  for (const value of input) {
    if (typeof value === "string" && isAdminScreenKey(value)) {
      unique.add(value);
    }
  }
  return ADMIN_SCREEN_KEYS.filter((key) => unique.has(key));
}

export function adminScreenLabel(key: string): string {
  if (key === "team") return "Екип";
  if (key === "account") return "Профил";
  return SCREEN_BY_KEY.get(key as AdminScreenKey)?.label ?? key;
}

export function screenFromAdminPath(
  pathname: string,
): AdminScreenKey | "team" | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return "dashboard";
  for (const entry of PATH_PREFIXES) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) {
      return entry.screen;
    }
  }
  return null;
}
