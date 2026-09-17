import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { MediaFolder } from "@/lib/media/folders";

export type { MediaFolder } from "@/lib/media/folders";

const BUCKET = "media";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Everything the browser needs to push the bytes straight into Storage.
 *
 * Files used to travel through a Server Action, which capped them at the 4 MB
 * body limit (4.5 MB on Vercel, enforced before Next even sees the request) and
 * tied the upload to the function timeout. A signed upload URL removes both:
 * the file goes browser → Storage, and only the bucket limit applies.
 */
export type MediaUploadTicket = {
  uploadUrl: string;
  path: string;
  filename: string;
  publicUrl: string;
};

export type MediaUploadDescriptor = {
  name: string;
  type: string;
  size: number;
};

export type MediaTicketResult =
  | { ok: true; ticket: MediaUploadTicket }
  | { ok: false; message: string };

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

async function signUpload(
  path: string,
  filename: string,
): Promise<MediaTicketResult> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "Storage не върна адрес за качване.",
    };
  }

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path)
    .data.publicUrl;

  return {
    ok: true,
    ticket: { uploadUrl: data.signedUrl, path: data.path, filename, publicUrl },
  };
}

export async function createImageUploadTicket(
  file: MediaUploadDescriptor,
  folder: MediaFolder,
): Promise<MediaTicketResult> {
  if (!file.size) {
    return { ok: false, message: "Празен файл." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `Файлът е ${formatMb(file.size)}. Максимум: ${formatMb(MAX_IMAGE_BYTES)}.`,
    };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Позволени формати: JPEG, PNG, WebP, GIF, AVIF." };
  }

  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  return signUpload(
    `${folder}/${crypto.randomUUID()}.${ext}`,
    file.name || `image.${ext}`,
  );
}

const MAX_FILENAME_CHARS = 120;

/**
 * The name the recipient sees — on the attachment itself and in the body link.
 *
 * Cyrillic has to survive. The old rule was ASCII-only (`\w` without the `u`
 * flag), so `Енергия.pdf` collapsed to `_.pdf` — the whole stem is one run of
 * non-ASCII and `+` swallowed it into a single underscore. The allowlist below
 * still drops every character that would matter inside HTML, because the name
 * is inlined into the email body.
 */
function displayPdfName(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  const stem = base
    .replace(/\.pdf$/i, "")
    .replace(/[^\p{L}\p{N}.\-_() ]+/gu, "_")
    .replace(/_{2,}/g, "_")
    .trim();
  return `${stem.slice(0, MAX_FILENAME_CHARS) || "attachment"}.pdf`;
}

/**
 * The storage key, and so the public URL the worker fetches at send time.
 * Kept ASCII on purpose: no percent-encoding to get wrong on any hop between
 * Storage, the worker and ZeptoMail. The UUID prefix carries uniqueness, so a
 * stem that sanitizes down to nothing is fine.
 */
function storageKeyName(raw: string): string {
  const stem = raw
    .replace(/\.pdf$/i, "")
    .replace(/[^A-Za-z0-9.\-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${stem.slice(0, 60) || "attachment"}.pdf`;
}

export async function createPdfUploadTicket(
  file: MediaUploadDescriptor,
): Promise<MediaTicketResult> {
  if (!file.size) {
    return { ok: false, message: "Празен файл." };
  }
  if (file.size > MAX_PDF_BYTES) {
    return {
      ok: false,
      message: `Файлът е ${formatMb(file.size)}. Максимум за PDF: ${formatMb(MAX_PDF_BYTES)}.`,
    };
  }
  if (file.type !== "application/pdf") {
    return { ok: false, message: "Позволен е само PDF формат." };
  }

  const name = file.name || "attachment.pdf";

  return signUpload(
    `email-attachments/${crypto.randomUUID()}-${storageKeyName(name)}`,
    displayPdfName(name),
  );
}
