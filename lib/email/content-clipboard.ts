/**
 * "Copy this email, paste it somewhere else" — between automations, and from an
 * automation into a new campaign.
 *
 * Kept in localStorage, not React state: the paste usually happens on another
 * screen (or tab) than the copy. Everything that makes up the email travels
 * along — subject, body with its blocks and buttons, end button, hero image,
 * attachment, signature — so the pasted copy sends exactly what the original
 * sends. The attachment is the same stored file, not a re-upload.
 */
import type { Automation } from "@/lib/supabase/types";

const STORAGE_KEY = "admin:copied-email";
/** `storage` only fires in other tabs — this tells the copying tab itself. */
export const COPIED_EMAIL_EVENT = "admin:copied-email-change";

export type CopiedEmailVersion = {
  subject: string;
  html: string;
  cta_label: string;
  cta_url: string;
  attachment_path: string;
  attachment_filename: string;
  hero_image_url: string;
};

export type CopiedEmail = {
  v: 1;
  /** Where it came from, for the paste button: "автоматизация", "кампания". */
  source: string;
  name: string;
  copiedAt: string;
  signature_enabled: boolean;
  bg: CopiedEmailVersion | null;
  en: CopiedEmailVersion | null;
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/** Null when there is no body — an empty language is not worth pasting. */
export function copiedVersion(input: {
  subject?: string | null;
  html?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  attachment_path?: string | null;
  attachment_filename?: string | null;
  hero_image_url?: string | null;
}): CopiedEmailVersion | null {
  if (!clean(input.html)) return null;
  return {
    subject: clean(input.subject),
    html: input.html ?? "",
    cta_label: clean(input.cta_label),
    cta_url: clean(input.cta_url),
    attachment_path: clean(input.attachment_path),
    attachment_filename: clean(input.attachment_filename),
    hero_image_url: clean(input.hero_image_url),
  };
}

type AutomationEmailFields = Pick<
  Automation,
  | "name"
  | "subject_bg"
  | "html_bg"
  | "cta_label_bg"
  | "cta_url_bg"
  | "attachment_path_bg"
  | "attachment_filename_bg"
  | "hero_image_url_bg"
  | "subject_en"
  | "html_en"
  | "cta_label_en"
  | "cta_url_en"
  | "attachment_path_en"
  | "attachment_filename_en"
  | "hero_image_url_en"
  | "signature_enabled"
>;

/** Both languages of an automation (saved row or the editor's form). */
export function copiedEmailFromAutomation(a: AutomationEmailFields): CopiedEmail | null {
  const bg = copiedVersion({
    subject: a.subject_bg,
    html: a.html_bg,
    cta_label: a.cta_label_bg,
    cta_url: a.cta_url_bg,
    attachment_path: a.attachment_path_bg,
    attachment_filename: a.attachment_filename_bg,
    hero_image_url: a.hero_image_url_bg,
  });
  const en = copiedVersion({
    subject: a.subject_en,
    html: a.html_en,
    cta_label: a.cta_label_en,
    cta_url: a.cta_url_en,
    attachment_path: a.attachment_path_en,
    attachment_filename: a.attachment_filename_en,
    hero_image_url: a.hero_image_url_en,
  });
  if (!bg && !en) return null;
  // A step with no subject goes out under its name — keep that on paste.
  const fallbackSubject = clean(a.name);
  if (bg && !bg.subject) bg.subject = en?.subject || fallbackSubject;
  if (en && !en.subject) en.subject = bg?.subject || fallbackSubject;
  return {
    v: 1,
    source: "автоматизация",
    name: clean(a.name) || bg?.subject || en?.subject || "имейл",
    copiedAt: new Date().toISOString(),
    signature_enabled: a.signature_enabled !== false,
    bg,
    en,
  };
}

/** The version for `locale`, falling back to the other language. */
export function pickCopiedVersion(
  copied: CopiedEmail,
  locale: "bg" | "en",
): CopiedEmailVersion | null {
  return locale === "en" ? copied.en ?? copied.bg : copied.bg ?? copied.en;
}

export function parseCopiedEmail(raw: string | null): CopiedEmail | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<CopiedEmail>;
    if (data?.v !== 1 || (!data.bg && !data.en)) return null;
    return {
      v: 1,
      source: typeof data.source === "string" ? data.source : "",
      name: typeof data.name === "string" ? data.name : "имейл",
      copiedAt: typeof data.copiedAt === "string" ? data.copiedAt : "",
      signature_enabled: data.signature_enabled !== false,
      bg: data.bg ?? null,
      en: data.en ?? null,
    };
  } catch {
    return null;
  }
}

export function readCopiedEmailRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeCopiedEmail(copied: CopiedEmail): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copied));
    window.dispatchEvent(new Event(COPIED_EMAIL_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearCopiedEmail() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(COPIED_EMAIL_EVENT));
  } catch {
    /* ignore */
  }
}
