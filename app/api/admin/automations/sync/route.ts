import { NextResponse } from "next/server";
import { AdminAccessError, requireAdmin } from "@/lib/admin/auth";
import { syncDeliveries } from "@/lib/automation/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Background refresh of opens/deliveries for the automations screen.
 *
 * A route, not a server action, on purpose: the client runs server actions one
 * at a time, so a 40-second sync as an action froze every other button on the
 * screen until it finished. A plain fetch runs alongside them.
 *
 * Body: `{ automationId?: string }` — omit it to refresh every automation.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin("automations");
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

  const body = (await req.json().catch(() => ({}))) as { automationId?: unknown };
  const automationId =
    typeof body.automationId === "string" && body.automationId.trim()
      ? body.automationId.trim()
      : null;

  try {
    const result = await syncDeliveries(automationId ? [automationId] : null, {
      timeBudgetMs: 45_000,
    });
    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error(
      "[admin/automations/sync]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { ok: false, message: "Синхронизацията не успя." },
      { status: 500 },
    );
  }
}
