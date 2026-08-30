const CYRILLIC_RE = /[\u0400-\u04FF]/;
const EMOJI_RE = /\p{Extended_Pictographic}/u;
const LINK_PLACEHOLDER = "[link]";
const HTTP_URL_RE = /https?:\/\/[^\s<>"']+/gi;
const TEMPLATE_RE = /\{\{(\w+)\}\}/g;

/** Notifier short links are ~20–25 chars — use 24 for safe UI estimates. */
export const ESTIMATED_SHORT_URL_LENGTH = 24;

export const SMS_TEMPLATE_SAMPLE = {
  name: "Мария",
  email: "maria@example.com",
};

export type SmsComposeCheck = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  prepared: string;
  preparedForSend: string;
  length: number;
  limit: number;
  remaining: number;
  hasLink: boolean;
};

export function containsCyrillic(text: string): boolean {
  return CYRILLIC_RE.test(text);
}

export function containsEmoji(text: string): boolean {
  return EMOJI_RE.test(text);
}

export function smsCharLimit(text: string): number {
  return containsCyrillic(text) ? 70 : 160;
}

export function extractHttpUrls(text: string): string[] {
  const matches = text.match(HTTP_URL_RE) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const trimmed = match.replace(/[.,;:!?)]+$/, "");
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      urls.push(trimmed);
    }
  }

  return urls;
}

export function expandSmsTemplate(
  text: string,
  vars: Record<string, string> = SMS_TEMPLATE_SAMPLE,
): string {
  return text.replace(TEMPLATE_RE, (_, key: string) => vars[key] ?? "");
}

export function normalizeTrackedLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (!/^https:\/\/.+/i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.toString().replace(/[.,;:!?)]+$/, "");
  } catch {
    return null;
  }
}

export function buildSmsBody(message: string, link?: string): string {
  const text = message.trim();
  const normalizedLink = normalizeTrackedLink(link ?? "");

  if (!normalizedLink) {
    return text;
  }

  if (text.includes(normalizedLink)) {
    return text;
  }

  if (!text) {
    return normalizedLink;
  }

  return `${text} ${normalizedLink}`;
}

export function splitMessageAndLink(stored: string): {
  message: string;
  link: string;
} {
  const trimmed = stored.trim();
  const urls = extractHttpUrls(trimmed);

  if (urls.length === 0) {
    return { message: stored, link: "" };
  }

  const lastUrl = urls[urls.length - 1];
  if (trimmed.endsWith(lastUrl)) {
    const message = trimmed.slice(0, trimmed.length - lastUrl.length).trim();
    return { message, link: lastUrl };
  }

  return { message: stored, link: "" };
}

function estimateShortenedLength(text: string): number {
  let length = 0;
  let lastIndex = 0;

  for (const match of text.matchAll(HTTP_URL_RE)) {
    const index = match.index ?? 0;
    length += index - lastIndex;
    length += ESTIMATED_SHORT_URL_LENGTH;
    lastIndex = index + match[0].length;
  }

  length += text.length - lastIndex;
  return length;
}

export function estimatePreparedLength(message: string, link?: string): number {
  const body = buildSmsBody(message, link);
  return estimateShortenedLength(body);
}

export function checkSmsCompose(
  message: string,
  link?: string,
  templateVars?: Record<string, string>,
): SmsComposeCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const expanded = expandSmsTemplate(message.trim(), templateVars);
  const normalizedLink = normalizeTrackedLink(link ?? "");
  const preparedForSend = buildSmsBody(expanded, normalizedLink ?? undefined);
  const urlsInMessage = extractHttpUrls(expanded);
  const hasLink = Boolean(normalizedLink || urlsInMessage.length > 0);

  if (link?.trim() && !normalizedLink) {
    errors.push("Линкът трябва да е пълен https:// адрес.");
  }

  if (!expanded && !normalizedLink) {
    errors.push("Въведи текст на SMS-а.");
  }

  if (preparedForSend.includes(LINK_PLACEHOLDER)) {
    errors.push(
      `Не използвай „${LINK_PLACEHOLDER}“ — добави линка в полето „Tracked link“.`,
    );
  }

  if (containsEmoji(preparedForSend)) {
    errors.push("SMS-ът не може да съдържа emoji.");
  }

  if (urlsInMessage.some((url) => !/^https:\/\//i.test(url))) {
    warnings.push("Ползвай https:// линкове — http адресите също се съкращават, но https е по-надежден.");
  }

  if (/^\//.test(link?.trim() ?? "") || /^\//.test(expanded)) {
    warnings.push(
      "Относителни пътища (/page) няма да се съкратят — сложи пълен https:// URL в полето за линк.",
    );
  }

  if (urlsInMessage.length > 1) {
    warnings.push(
      "Повече от един URL в текста — всеки линк заема ~24 символа след shorten.",
    );
  }

  if (!hasLink && expanded.match(/\b(линк|link|тук|here)\b/i)) {
    warnings.push("Изглежда очакваш линк — попълни полето „Tracked link“.");
  }

  const length = estimatePreparedLength(expanded, normalizedLink ?? undefined);
  const limit = smsCharLimit(preparedForSend);
  const remaining = limit - length;

  if (length > limit) {
    errors.push(
      `Твърде дълго след shorten: ${length}/${limit} символа${
        containsCyrillic(preparedForSend) ? " (кирилица)" : ""
      }.`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    prepared: expanded,
    preparedForSend,
    length,
    limit,
    remaining,
    hasLink,
  };
}
