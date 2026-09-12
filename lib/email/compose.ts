import { renderEmailTemplate } from "@/lib/automation/template";
import {
  composeBrandedEmail,
  type EmailCta,
} from "@/lib/email/layout";
import { getEmailFooterConfig } from "@/lib/email/footer-config";
import { withSignatureFormInvites } from "@/lib/email/hydrate-signature-links";
import type { EmailFooterConfig } from "@/lib/supabase/types";

export async function buildBrandedEmail(input: {
  bodyHtml: string;
  locale?: "bg" | "en";
  cta?: EmailCta | null;
  vars?: { name?: string | null; email: string };
  unsubscribeHref?: string | null;
  footerConfig?: EmailFooterConfig | null;
  heroImageUrl?: string | null;
  recipient?: { email: string; subscriberId?: string | null };
  /** Force the signature block off for this send, regardless of the global setting. */
  includeSignature?: boolean;
}): Promise<string> {
  const locale = input.locale ?? "bg";
  const body = input.vars
    ? renderEmailTemplate(input.bodyHtml, input.vars)
    : input.bodyHtml;

  const cta =
    input.cta?.label?.trim() && input.cta?.href?.trim()
      ? { label: input.cta.label.trim(), href: input.cta.href.trim() }
      : null;

  const baseFooter =
    input.footerConfig ?? (await getEmailFooterConfig(locale));
  const recipient =
    input.recipient ??
    (input.vars?.email ? { email: input.vars.email } : undefined);
  let footerConfig = await withSignatureFormInvites(
    baseFooter,
    locale,
    recipient,
  );
  if (input.includeSignature === false) {
    footerConfig = { ...footerConfig, signature_enabled: false };
  }

  return composeBrandedEmail({
    bodyHtml: body,
    locale,
    cta,
    unsubscribeHref: input.unsubscribeHref,
    footerConfig,
    heroImageUrl: input.heroImageUrl,
  });
}
