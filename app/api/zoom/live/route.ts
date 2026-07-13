import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getPublicZoomLiveState } from "@/lib/zoom/live";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const localeParam = searchParams.get("locale") ?? "bg";
  const locale = isLocale(localeParam) ? localeParam : "bg";
  const state = await getPublicZoomLiveState(locale);
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
