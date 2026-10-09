import { STORAGE_PUBLIC_PREFIX } from "@/lib/storage/cdn-url";

/**
 * Cached proxy in front of Supabase Storage — see `lib/storage/cdn-url.ts`.
 *
 * Keys are UUIDs that are never overwritten, so a successful response is
 * immutable: browsers and Vercel's CDN keep it for a year and Supabase only
 * sees the first request per CDN region.
 */
const BUCKETS = new Set(["media"]);

const IMMUTABLE = "public, max-age=31536000, immutable";

const PASS_THROUGH = ["content-type", "content-length", "etag", "last-modified"];

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const [bucket, ...rest] = path;

  if (
    !bucket ||
    !BUCKETS.has(bucket) ||
    rest.length === 0 ||
    path.some((part) => !part || part === "." || part === "..")
  ) {
    return new Response("Not found", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      STORAGE_PUBLIC_PREFIX + path.map(encodeURIComponent).join("/"),
      { cache: "no-store" },
    );
  } catch {
    return new Response("Storage unreachable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    // A missing file may still be uploaded under that key; a 402 or 5xx is
    // temporary. Neither may stick in the CDN.
    return new Response(upstream.status === 404 ? "Not found" : "Unavailable", {
      status: upstream.status === 404 ? 404 : 502,
      headers: {
        "Cache-Control":
          upstream.status === 404 ? "public, max-age=60" : "no-store",
      },
    });
  }

  const headers = new Headers();
  for (const name of PASS_THROUGH) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", IMMUTABLE);
  headers.set("CDN-Cache-Control", IMMUTABLE);
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, { status: 200, headers });
}
