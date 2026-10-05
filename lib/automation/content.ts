import type { Automation, Locale } from "@/lib/supabase/types";

/**
 * Subject/body for one locale, with fallbacks. An empty subject used to make
 * the step return early without a trace — and every step after it in the chain
 * was never queued, so the sequence stopped there. Now: the other language
 * fills a missing field, and a body with no subject at all goes out under the
 * automation's name. Empty only when there is no body in either language.
 */
export function automationEmailContent(
  automation: Pick<
    Automation,
    "name" | "subject_bg" | "subject_en" | "html_bg" | "html_en"
  >,
  locale: Locale,
): { subject: string; html: string } | null {
  const pick = (bg: string | null | undefined, en: string | null | undefined) => {
    const own = (locale === "en" ? en : bg)?.trim() ?? "";
    const other = (locale === "en" ? bg : en)?.trim() ?? "";
    return own || other;
  };
  const html = pick(automation.html_bg, automation.html_en);
  if (!html) return null;
  const subject = pick(automation.subject_bg, automation.subject_en) || automation.name.trim();
  if (!subject) return null;
  return { subject, html };
}

/** SMS text for one locale, falling back to the other language. */
export function automationSmsBody(
  automation: Pick<Automation, "sms_bg" | "sms_en">,
  locale: Locale,
): string {
  const own = (locale === "en" ? automation.sms_en : automation.sms_bg)?.trim() ?? "";
  const other = (locale === "en" ? automation.sms_bg : automation.sms_en)?.trim() ?? "";
  return own || other;
}
