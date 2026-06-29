import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type { MediaFolder } from "@/lib/media/folders";

export type { MediaFolder } from "@/lib/media/folders";

const BUCKET = "media";
const MAX_BYTES = 5 * 1024 * 1024;

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

export async function uploadMediaImage(
  file: File,
  folder: MediaFolder,
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  if (!file.size) {
    return { ok: false, message: "Празен файл." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Максимален размер: 5 MB." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Позволени формати: JPEG, PNG, WebP, GIF, AVIF." };
  }

  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
