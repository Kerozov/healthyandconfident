import { NextResponse } from "next/server";
import { getPublicClient } from "@/lib/supabase/public";
import { isLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") || "bg";
  if (!isLocale(locale)) {
    return NextResponse.json({ enabled: false }, { status: 400 });
  }

  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("popup_config")
      .select(
        "enabled, title, message, cta_label, success_message, image_url, segment_tag, delay_seconds",
      )
      .eq("locale", locale)
      .maybeSingle();

    if (!data) return NextResponse.json({ enabled: false });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
