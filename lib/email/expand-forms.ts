import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { createFormInviteToken } from "@/lib/forms/form-invite-token";
import { publicFormInviteUrl } from "@/lib/forms/invite-url";
import {
  expandEmailFormMarkers,
  extractFormIdsFromHtml,
} from "@/lib/email/forms-block";
import { publicFormUrl } from "@/lib/forms/urls";

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
  const forms = (data as FormTemplateRecord[]) ?? [];
  const byId = new Map(forms.map((form) => [form.id.toLowerCase(), form]));
  const hrefByFormId = new Map<string, string>();
  const email = recipient.email.trim().toLowerCase();
  const mergeTagged = email.includes("{{");

  for (const form of forms) {
    if (mergeTagged) {
      hrefByFormId.set(
        form.id.toLowerCase(),
        `${publicFormUrl(form.slug, locale)}?e={{email}}&sid={{sid}}`,
      );
      continue;
    }
    const token = createFormInviteToken({
      f: form.id,
      e: email,
      sid: recipient.subscriberId ?? undefined,
    });
    if (!token) {
      console.error("[email-forms] invite token missing — check UNSUBSCRIBE_SECRET");
      continue;
    }
    const { error } = await supabase.from("form_invitations").insert({
      form_id: form.id,
      subscriber_id: recipient.subscriberId ?? null,
      email,
      token,
    });
    if (error) {
      console.error("[email-forms] invitation insert:", error.message);
      continue;
    }
    hrefByFormId.set(
      form.id.toLowerCase(),
      publicFormInviteUrl(form.slug, locale, token),
    );
  }

  return expandEmailFormMarkers(html, byId, locale, hrefByFormId);
}
