import { renderEmailTemplate } from "@/lib/automation/template";
import {
  composeBrandedEmail,
  type EmailCta,
} from "@/lib/email/layout";

export function buildBrandedEmail(input: {
  bodyHtml: string;
  locale?: "bg" | "en";
  cta?: EmailCta | null;
  vars?: { name?: string | null; email: string };
}): string {
  const body = input.vars
    ? renderEmailTemplate(input.bodyHtml, input.vars)
    : input.bodyHtml;

  const cta =
    input.cta?.label?.trim() && input.cta?.href?.trim()
      ? { label: input.cta.label.trim(), href: input.cta.href.trim() }
      : null;

  return composeBrandedEmail({
    bodyHtml: body,
    locale: input.locale ?? "bg",
    cta,
  });
}
