#!/usr/bin/env bun
export {};

/**
 * End-to-end check of the admin upload path: sign → PUT → public read → clean up.
 * Proves the `media` bucket accepts a PDF and a file over the old 5 MB cap.
 *
 * Run: bun run verify:upload
 */
const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A 7 MB PDF: valid header, past the old 5 MB bucket limit and the 4 MB action limit. */
function makePdf(): File {
  const head = new TextEncoder().encode("%PDF-1.4\n% verify-upload\n");
  const pad = new Uint8Array(7 * 1024 * 1024).fill(0x20);
  const tail = new TextEncoder().encode("\n%%EOF\n");
  return new File([head, pad, tail], "verify-upload.pdf", {
    type: "application/pdf",
  });
}

const file = makePdf();
const path = `email-attachments/${crypto.randomUUID()}-verify-upload.pdf`;
console.log(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB PDF → ${path}`);

const { data: signed, error: signError } = await supabase.storage
  .from("media")
  .createSignedUploadUrl(path);

if (signError || !signed) {
  console.error("FAIL — could not sign upload:", signError?.message);
  process.exit(1);
}
console.log("✓ signed upload URL issued");

const body = new FormData();
body.append("cacheControl", "3600");
body.append("", file);

const put = await fetch(signed.signedUrl, {
  method: "PUT",
  headers: { "x-upsert": "false" },
  body,
});

if (!put.ok) {
  const detail = await put.text();
  console.error(`FAIL — Storage rejected the PDF (HTTP ${put.status}):`, detail);
  console.error("Run supabase/migrations/066_media_bucket_pdf.sql, then retry.");
  process.exit(1);
}
console.log("✓ 7 MB PDF accepted by Storage");

const publicUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
const head = await fetch(publicUrl, { method: "HEAD" });
console.log(
  head.ok
    ? `✓ public read OK (${head.headers.get("content-type")})`
    : `FAIL — public read returned HTTP ${head.status}`,
);

await supabase.storage.from("media").remove([path]);
console.log("✓ test file removed");

if (!head.ok) process.exit(1);
console.log("\nUpload path is healthy.");
