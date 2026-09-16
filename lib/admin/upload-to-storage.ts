/**
 * Browser → Supabase Storage upload against a signed upload URL.
 *
 * Mirrors what `storage-js` does for a Blob (PUT, multipart body, empty field
 * name) without pulling the client SDK into the admin bundle. The signed URL is
 * absolute and already carries its token, so no Supabase keys reach the browser.
 */
export type StorageUploadResult = { ok: true } | { ok: false; message: string };

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `Storage отказа файла (${res.status}).`;
    try {
      const body = JSON.parse(text) as { message?: string; error?: string };
      const message = body.message || body.error;
      if (message) return message;
    } catch {
      /* not JSON — fall through to the raw text */
    }
    return text.slice(0, 200);
  } catch {
    return `Storage отказа файла (${res.status}).`;
  }
}

export async function putToSignedUrl(
  uploadUrl: string,
  file: File,
): Promise<StorageUploadResult> {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);

  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "x-upsert": "false" },
      body,
    });
  } catch {
    return {
      ok: false,
      message: "Връзката прекъсна по време на качването. Опитай отново.",
    };
  }

  if (!res.ok) {
    return { ok: false, message: await readErrorMessage(res) };
  }

  return { ok: true };
}

/** Server Actions scrub error messages in production — say something useful. */
export function uploadErrorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (/fetch|network|Failed to fetch/i.test(raw)) {
    return "Няма връзка със сървъра. Провери мрежата и опитай пак.";
  }
  return "Качването не успя. Опитай отново.";
}
