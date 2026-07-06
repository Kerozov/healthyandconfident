import "server-only";

import type { Locale } from "@/lib/supabase/types";
import { expandEmailProducts } from "@/lib/email/expand-products";
import { expandEmailForms } from "@/lib/email/expand-forms";
import {
  bodyWithAttachment,
  type WorkerAttachment,
} from "@/lib/email/attachments";

export async function buildEmailBodyForRecipient(input: {
  html: string;
  locale: Locale;
  email: string;
  subscriberId?: string | null;
  attachmentPath?: string | null;
  attachmentFilename?: string | null;
}): Promise<{ bodyHtml: string; attachments: WorkerAttachment[] }> {
  const withProducts = await expandEmailProducts(input.html, input.locale);
  const withForms = await expandEmailForms(withProducts, input.locale, {
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
