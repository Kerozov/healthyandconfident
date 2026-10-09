/**
 * Shrinks a photo in the browser before it goes to Storage.
 *
 * Every byte in the `media` bucket is paid for again on each page view and
 * each email open (Supabase "cached egress"), and the free plan caps that at
 * 5 GB a month for the whole organisation. A phone photo straight off the
 * camera is 3–8 MB; the same photo at 2000 px WebP is ~200–400 KB.
 *
 * GIFs are left alone (canvas would drop the animation), and so is any file
 * that comes out no smaller than it went in.
 */
const MAX_SIDE = 2000;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );
  // Safari before 16 has no WebP encoder and hands back PNG — usually bigger.
  if (!blob || blob.type !== "image/webp" || blob.size >= file.size) {
    return file;
  }

  const stem = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${stem}.webp`, { type: "image/webp" });
}
