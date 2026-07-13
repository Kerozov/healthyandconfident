export type SubscriberOriginContext = {
  isNew: boolean;
  source?: string;
};

export const SUBSCRIBER_ORIGIN_KEYS = [
  "new",
  "existing_registered",
  "manual",
  "import",
] as const;

export type SubscriberOrigin = (typeof SUBSCRIBER_ORIGIN_KEYS)[number];

export const SUBSCRIBER_ORIGIN_OPTIONS: {
  value: SubscriberOrigin;
  label: string;
  hint: string;
}[] = [
  {
    value: "new",
    label: "Нови",
    hint: "Първи път в списъка — форма, меню, popup, ръчно или импорт",
  },
  {
    value: "existing_registered",
    label: "Вече регистрирани",
    hint: "Имейлът вече е в списъка и отново се записва от сайт или форма",
  },
  {
    value: "manual",
    label: "Ръчно добавени",
    hint: "Добавени от админ панела",
  },
  {
    value: "import",
    label: "Импорт",
    hint: "Качени чрез CSV импорт",
  },
];

export const DEFAULT_SUBSCRIBER_ORIGINS: SubscriberOrigin[] = [
  "new",
  "existing_registered",
];

export const ALL_SUBSCRIBER_ORIGINS: SubscriberOrigin[] = [
  ...SUBSCRIBER_ORIGIN_KEYS,
];

export function isSiteSignupSource(source: string): boolean {
  const s = (source || "").toLowerCase();
  if (!s) return true;
  if (s === "purchase" || s === "manual" || s === "import" || s === "system") {
    return false;
  }
  return true;
}

/** Which origin buckets apply to this automation event (OR within the list). */
export function resolveEventSubscriberOrigins(
  ctx: SubscriberOriginContext,
): SubscriberOrigin[] {
  const source = (ctx.source ?? "").toLowerCase();
  const origins: SubscriberOrigin[] = [];

  if (ctx.isNew) origins.push("new");

  if (source === "manual") {
    origins.push("manual");
  } else if (source === "import") {
    origins.push("import");
  } else if (!ctx.isNew && isSiteSignupSource(source)) {
    origins.push("existing_registered");
  }

  return origins;
}

export function labelSubscriberOrigin(value: string): string {
  return (
    SUBSCRIBER_ORIGIN_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

export function formatSubscriberOriginsLine(origins: string[]): string | null {
  const list = origins.filter(Boolean);
  if (list.length === 0) return null;
  return list.map((o) => labelSubscriberOrigin(o)).join(" · ");
}

/** Empty stored list falls back to legacy `new_subscribers_only`. */
export function subscriberOriginMatches(
  required: string[],
  ctx: SubscriberOriginContext,
  legacyNewOnly: boolean,
): boolean {
  const filters = required.filter(Boolean) as SubscriberOrigin[];
  const eventOrigins = resolveEventSubscriberOrigins(ctx);

  if (filters.length === 0) {
    if (!legacyNewOnly) return true;
    if (ctx.isNew) return true;
    return isSiteSignupSource(ctx.source ?? "");
  }

  if (eventOrigins.length === 0) return false;
  return eventOrigins.some((o) => filters.includes(o));
}

export function deriveNewSubscribersOnly(origins: string[]): boolean {
  const list = origins.filter(Boolean);
  if (list.length === 0) return true;
  return !ALL_SUBSCRIBER_ORIGINS.every((o) => list.includes(o));
}

export function subscriberOriginsFromStored(
  stored: string[] | null | undefined,
  legacyNewOnly: boolean,
): SubscriberOrigin[] {
  const list = stored?.filter(Boolean) ?? [];
  if (list.length > 0) return list as SubscriberOrigin[];
  if (!legacyNewOnly) return [...ALL_SUBSCRIBER_ORIGINS];
  return [...DEFAULT_SUBSCRIBER_ORIGINS];
}
