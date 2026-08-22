import "server-only";

import type { Locale } from "@/lib/supabase/types";
import { expandEmailProducts } from "@/lib/email/expand-products";
import { expandEmailGuides } from "@/lib/email/expand-guides";
import { expandEmailForms } from "@/lib/email/expand-forms";
import {
  bodyWithAttachment,
  type WorkerAttachment,
} from "@/lib/email/attachments";
import { normalizeEmailBodyHtml } from "@/lib/email/normalize-body";

export async function buildEmailBodyForRecipient(input: {
  html: string;
  locale: Locale;
  email: string;
  subscriberId?: string | null;
  attachmentPath?: string | null;
  attachmentFilename?: string | null;
}): Promise<{ bodyHtml: string; attachments: WorkerAttachment[] }> {
  const normalized = normalizeEmailBodyHtml(input.html);
  const withProducts = await expandEmailProducts(normalized, input.locale);
  const withGuides = await expandEmailGuides(withProducts, input.locale);
  const withForms = await expandEmailForms(withGuides, input.locale, {
    email: input.email,
    subscriberId: input.subscriberId,
  });
  return bodyWithAttachment(
    withForms,
    input.attachmentPath,
    input.attachmentFilename,
    input.locale,
  );
}
