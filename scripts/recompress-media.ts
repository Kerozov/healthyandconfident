#!/usr/bin/env bun
export {};

/**
 * Shrinks the photos that went into the `media` bucket before uploads were
 * compressed in the browser (`lib/admin/compress-image.ts`).
 *
 *   bun scripts/recompress-media.ts          # show what it would do
 *   bun scripts/recompress-media.ts --write  # overwrite them
 *
 * Those are 2–5 MB PNGs, and `/files` pulls each one from Supabase again on
 * every Vercel CDN miss (each region, each deploy) — a few of them were most of
 * the organisation's cached egress. Each file is re-encoded as WebP at most
 * 2000 px, the same as a new upload, and written back under the SAME key, so
 * every URL already stored in the database and in sent emails keeps working.
 * Storage serves it with the new content type; the extension in the key is
 * only a name.
 *
 * Files under 400 KB, GIFs, PDFs and anything that would not shrink by at
 * least a third are left alone.
 */
import sharp from "sharp";

const BUCKET = "media";
const MAX_SIDE = 2000;
const QUALITY = 82;
const MIN_BYTES = 400 * 1024;
const MIN_SAVING = 1 / 3;

const write = process.argv.includes("--write");

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Entry = { path: string; size: number; mimetype: string };

async function listFolder(prefix: string): Promise<Entry[]> {
  const out: Entry[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (!item.id) {
        out.push(...(await listFolder(path)));
      } else {
        out.push({
          path,
          size: Number(item.metadata?.size ?? 0),
          mimetype: String(item.metadata?.mimetype ?? ""),
        });
      }
    }
    if (data.length < 100) break;
  }
  return out;
}

const mb = (n: number) => `${(n / 1048576).toFixed(2)} MB`;

const candidates = (await listFolder("")).filter(
  (f) =>
    f.size >= MIN_BYTES &&
    f.mimetype.startsWith("image/") &&
    f.mimetype !== "image/gif",
);

let before = 0;
let after = 0;

for (const file of candidates) {
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(file.path);
  if (error || !blob) {
    console.error(`skip ${file.path}: ${error?.message ?? "no data"}`);
    continue;
  }

  const input = Buffer.from(await blob.arrayBuffer());
  const output = await sharp(input)
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  if (output.length > input.length * (1 - MIN_SAVING)) {
    console.log(`keep ${file.path}: ${mb(input.length)} → ${mb(output.length)} is not worth it`);
    continue;
  }

  before += input.length;
  after += output.length;
  console.log(`${write ? "write" : "would write"} ${file.path}: ${mb(input.length)} → ${mb(output.length)}`);

  if (!write) continue;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(file.path, output, {
    upsert: true,
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (upErr) console.error(`  failed: ${upErr.message}`);
}

console.log(`\n${candidates.length} candidates, ${mb(before)} → ${mb(after)}${write ? "" : " (dry run, add --write)"}`);
