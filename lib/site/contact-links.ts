// Extra contact links the admin can add under the built-in Messenger / phone /
// WhatsApp entries — rendered in the Contact section and the footer.

export const CONTACT_LINK_LIMIT = 8;

export type ContactLinkIcon =
  | "link"
  | "globe"
  | "mail"
  | "phone"
  | "message"
  | "send"
  | "calendar"
  | "map"
  | "video"
  | "instagram"
  | "facebook"
  | "youtube"
  | "messenger";

export type SiteContactLink = {
  id: string;
  label: string;
  text: string;
  href: string;
  icon: ContactLinkIcon;
  enabled: boolean;
};

export const CONTACT_LINK_ICON_OPTIONS: {
  value: ContactLinkIcon;
  label: string;
}[] = [
  { value: "link", label: "Линк" },
  { value: "globe", label: "Уебсайт" },
  { value: "mail", label: "Имейл" },
  { value: "phone", label: "Телефон" },
  { value: "message", label: "Чат / WhatsApp / Viber" },
  { value: "send", label: "Telegram" },
  { value: "calendar", label: "Календар / запазване на час" },
  { value: "map", label: "Локация" },
  { value: "video", label: "Видео / Zoom" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "messenger", label: "Messenger" },
];

const ICON_KEYS = new Set<string>(CONTACT_LINK_ICON_OPTIONS.map((o) => o.value));

export function newContactLinkId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newContactLink(): SiteContactLink {
  return {
    id: newContactLinkId(),
    label: "",
    text: "",
    href: "",
    icon: "link",
    enabled: true,
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isIcon(value: unknown): value is ContactLinkIcon {
  return typeof value === "string" && ICON_KEYS.has(value);
}

/** Only schemes that are safe to put in an anchor rendered for visitors. */
export function isSafeContactHref(href: string): boolean {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:|tel:|viber:)/i.test(trimmed)) return true;
  return trimmed.startsWith("/") && !trimmed.startsWith("//");
}

/** A bare `example.com` typed in the admin still has to become a real URL. */
export function normalizeContactHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (isSafeContactHref(trimmed)) return trimmed;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$|\?|#)/i.test(trimmed)) return `https://${trimmed}`;
  return "";
}

/** jsonb from the database is unknown-shaped — every read goes through here. */
export function parseContactLinks(raw: unknown): SiteContactLink[] {
  if (!Array.isArray(raw)) return [];
  const links: SiteContactLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    links.push({
      id: asString(row.id).trim() || newContactLinkId(),
      label: asString(row.label).trim(),
      text: asString(row.text).trim(),
      href: asString(row.href).trim(),
      icon: isIcon(row.icon) ? row.icon : "link",
      enabled: row.enabled === undefined ? true : Boolean(row.enabled),
    });
    if (links.length >= CONTACT_LINK_LIMIT) break;
  }
  return links;
}

/** Admin input → what gets stored: normalized hrefs, no blank rows. */
export function serializeContactLinks(links: unknown): SiteContactLink[] {
  return parseContactLinks(links)
    .map((link) => ({ ...link, href: normalizeContactHref(link.href) }))
    .filter((link) => link.href && (link.label || link.text));
}

/** What the public site renders. */
export function visibleContactLinks(links: unknown): SiteContactLink[] {
  return parseContactLinks(links).filter(
    (link) => link.enabled && isSafeContactHref(link.href) && (link.label || link.text),
  );
}

export function isExternalContactHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}
