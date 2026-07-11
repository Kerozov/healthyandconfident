import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { createFormInviteToken } from "@/lib/forms/form-invite-token";
import { publicFormInviteUrl } from "@/lib/forms/invite-url";
import {
  expandEmailFormMarkers,
  extractFormIdsFromHtml,
} from "@/lib/email/forms-block";

export type EmailFormRecipient = {
  email: string;
  subscriberId?: string | null;
};

export async function expandEmailForms(
  html: string,
  locale: "bg" | "en",
  recipient: EmailFormRecipient,
): Promise<string> {
  const ids = extractFormIdsFromHtml(html);
  if (ids.length === 0) return html;

  const supabase = getAdminClient();
  const { data } = await supabase.from("form_templates").select("*").in("id", ids);
  const forms = ((data as FormTemplateRecord[]) ?? []).filter((f) => f.enabled);
  const byId = new Map(forms.map((form) => [form.id.toLowerCase(), form]));
  const hrefByFormId = new Map<string, string>();
  const email = recipient.email.trim().toLowerCase();

  for (const form of forms) {
    const token = createFormInviteToken({
      f: form.id,
      e: email,
      sid: recipient.subscriberId ?? undefined,
    });
    if (token) {
      await supabase.from("form_invitations").insert({
        form_id: form.id,
        subscriber_id: recipient.subscriberId ?? null,
        email,
        token,
      });
    }
    hrefByFormId.set(
      form.id.toLowerCase(),
      publicFormInviteUrl(form.slug, locale, form.id, email, recipient.subscriberId),
    );
  }

  return expandEmailFormMarkers(html, byId, locale, hrefByFormId);
}
