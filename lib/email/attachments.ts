import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/supabase/types";

const BUCKET = "media";

export type WorkerAttachment = {
  filename: string;
  url: string;
  contentType: string;
};

export function publicUrlForStoragePath(path: string): string {
  const supabase = getAdminClient();
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function workerAttachmentsFromStored(
  path: string | null | undefined,
  filename: string | null | undefined,
): WorkerAttachment[] {
  const storagePath = path?.trim();
  const name = filename?.trim();
  if (!storagePath || !name) return [];
  return [
    {
      filename: name,
      url: publicUrlForStoragePath(storagePath),
      contentType: "application/pdf",
    },
  ];
}

export function appendAttachmentBlock(
  bodyHtml: string,
  attachment: WorkerAttachment,
  locale: Locale,
): string {
  const heading = locale === "en" ? "Attached PDF" : "Прикачен PDF";
  return `${bodyHtml}<p style="margin:20px 0 0;padding:14px 16px;background:#f5f5f0;border-radius:10px;font-size:14px;line-height:1.5;color:#334155;">
    📎 <strong>${heading}:</strong>
    <a href="${attachment.url}" style="color:#2d5016;font-weight:600;text-decoration:underline;">${attachment.filename}</a>
  </p>`;
}

export function bodyWithAttachment(
  bodyHtml: string,
  path: string | null | undefined,
  filename: string | null | undefined,
  locale: Locale,
): { bodyHtml: string; attachments: WorkerAttachment[] } {
  const attachments = workerAttachmentsFromStored(path, filename);
  if (!attachments.length) {
    return { bodyHtml, attachments: [] };
  }
  return {
    bodyHtml: appendAttachmentBlock(bodyHtml, attachments[0]!, locale),
    attachments,
  };
}
