import { publicSiteOrigin } from "@/lib/site";

/**
 * Public Storage files are served through `/files/…` on our own domain, never
 * straight from Supabase.
 *
 * The free plan allows 5 GB of Storage egress a month for the whole Supabase
 * organisation; past that every project in it answers 402 until the cycle
 * resets. `/files` is cached by Vercel's CDN for a year, so Supabase serves
 * each file roughly once instead of once per page view, email open and
 * worker attachment fetch.
 */
const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).replace(/\/$/, "");

export const STORAGE_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;

/**
 * Null on a local origin: an upload made from `next dev` writes its URL into
 * the shared database, and a localhost link would break for every visitor.
 */
function filesBase(): string | null {
  const origin = publicSiteOrigin();
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])\b/i.test(origin)) return null;
  return `${origin}/files/`;
}

/** A Supabase public-object URL → the cached `/files` URL. Anything else is returned untouched. */
export function cdnUrl(url: string): string;
export function cdnUrl(url: string | null | undefined): string | null | undefined;
export function cdnUrl(url: string | null | undefined) {
  if (!url || !SUPABASE_URL || !url.startsWith(STORAGE_PUBLIC_PREFIX)) return url;
  const base = filesBase();
  return base ? base + url.slice(STORAGE_PUBLIC_PREFIX.length) : url;
}

/** Every Supabase public-object URL inside an HTML string → `/files`. */
export function rewriteStorageUrls(html: string): string {
  if (!SUPABASE_URL || !html.includes(STORAGE_PUBLIC_PREFIX)) return html;
  const base = filesBase();
  return base ? html.split(STORAGE_PUBLIC_PREFIX).join(base) : html;
}
