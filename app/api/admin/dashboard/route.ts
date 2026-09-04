import { NextResponse } from "next/server";
import { AdminAccessError, requireAdmin } from "@/lib/admin/auth";
import { getDashboardOverview } from "@/lib/admin/dashboard-overview";
import { parseStatsPeriod } from "@/lib/admin/stats-periods";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The admin home fetches this instead of rendering stats on the server, so a
 * slow report never blocks the page — it lands as a card-level error with a
 * retry button.
 */
export async function GET(req: Request) {
  try {
    await requireAdmin("dashboard");
  } catch (err) {
    const message =
      err instanceof AdminAccessError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Няма достъп.";
    return NextResponse.json(
      { ok: false, message },
      { status: message === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  const period = parseStatsPeriod(
    new URL(req.url).searchParams.get("period"),
  );

  try {
    const overview = await getDashboardOverview(period);
    return NextResponse.json(
      { ok: true, overview },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error(
      "[admin/dashboard]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      {
        ok: false,
        message:
          "Справката не се зареди. Опитай отново или избери по-кратък период.",
      },
      { status: 500 },
    );
  }
}
