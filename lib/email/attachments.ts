import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/supabase/types";
import { cdnUrl } from "@/lib/storage/cdn-url";

const BUCKET = "media";

export type WorkerAttachment = {
  filename: string;
  url: string;
  contentType: string;
};

export function publicUrlForStoragePath(path: string): string {
  const supabase = getAdminClient();
  return cdnUrl(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
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

/** `attachment_filename` is a plain text column an action can write — never inline it raw. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appendAttachmentBlock(
  bodyHtml: string,
  attachment: WorkerAttachment,
  locale: Locale,
): string {
  const heading = locale === "en" ? "Attached PDF" : "Прикачен PDF";
  return `${bodyHtml}<p style="margin:20px 0 0;padding:14px 16px;background:#f5f5f0;border-radius:10px;font-size:14px;line-height:1.5;color:#334155;">
    📎 <strong>${heading}:</strong>
    <a href="${escapeHtml(attachment.url)}" style="color:#2d5016;font-weight:600;text-decoration:underline;">${escapeHtml(attachment.filename)}</a>
  </p>`;
}

/**
 * Over this, a PDF goes into the email as a link only. The worker downloads an
 * attachment once per send and rejects anything over 8 MB; above 2 MB the
 * `/files` cache skips it and every send pulls it from Supabase. On 12–13 Nov
 * 2026 a 17.7 MB menu PDF first looped and then failed every welcome email.
 */
export const MAX_ATTACHED_PDF_BYTES = 2 * 1024 * 1024;

const sizeCache = new Map<string, number | null>();

/** Bytes, or null when Storage cannot say (then the file is linked, not attached). */
async function storedFileSize(path: string): Promise<number | null> {
  if (sizeCache.has(path)) return sizeCache.get(path) ?? null;
  let size: number | null = null;
  try {
    const { data } = await getAdminClient().storage.from(BUCKET).info(path);
    const raw = (data as { size?: number | null } | null)?.size;
    size = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  } catch {
    size = null;
  }
  // Keys are UUIDs and never overwritten, so a known size never changes.
  if (size !== null) sizeCache.set(path, size);
  return size;
}

/**
 * The body always gets a link to the PDF. It is also attached only when it is
 * small enough; a bigger (or unreadable) one is never handed to the worker, so
 * the email still goes out.
 */
export async function bodyWithAttachment(
  bodyHtml: string,
  path: string | null | undefined,
  filename: string | null | undefined,
  locale: Locale,
): Promise<{ bodyHtml: string; attachments: WorkerAttachment[] }> {
  const attachments = workerAttachmentsFromStored(path, filename);
  if (!attachments.length) {
    return { bodyHtml, attachments: [] };
  }
  const withLink = appendAttachmentBlock(bodyHtml, attachments[0]!, locale);
  const size = await storedFileSize(path!.trim());
  if (size === null || size > MAX_ATTACHED_PDF_BYTES) {
    return { bodyHtml: withLink, attachments: [] };
  }
  return { bodyHtml: withLink, attachments };
}
