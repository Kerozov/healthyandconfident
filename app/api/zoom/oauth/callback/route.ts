import { NextResponse } from "next/server";

/**
 * Zoom OAuth redirect after Local Test / Add App install.
 * Webhooks do not need stored tokens; Zoom registers the install on Allow.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const dest = new URL("/admin/zoom", url.origin);
  dest.searchParams.set("zoom", code ? "connected" : "denied");
  return NextResponse.redirect(dest);
}
