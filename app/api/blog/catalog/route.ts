import { isLocale } from "@/i18n/config";
import { getPostCatalog } from "@/lib/site/post-catalog-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") || "bg";
  if (!isLocale(locale)) return Response.json({ error: "Invalid locale" }, { status: 400 });
  try {
    return Response.json({ items: await getPostCatalog(locale) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[blog/catalog]", error);
    return Response.json({ error: "Предложенията не можаха да се заредят." }, { status: 503 });
  }
}
