import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { AdminAccessError, requireAdmin } from "@/lib/admin/auth";
import { importSubscriberBatch, IMPORT_BATCH_SIZE } from "@/lib/admin/import-run";
import type { ImportSubscriberRow } from "@/lib/admin/import-subscribers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One chunk of a spreadsheet import.
 *
 * Imports used to go through a server action, which caps the request body at 1 MB —
 * anything past a few thousand rows came back as "the file is too large". The
 * browser now posts `IMPORT_BATCH_SIZE` rows at a time to this route instead, so
 * file size stops being a limit at all.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin("subscribers", {
      action: "import",
      summary: "Импортира абонати",
    });
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

  let body: { rows?: unknown; mergeSegments?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const rows = Array.isArray(body.rows)
    ? (body.rows as ImportSubscriberRow[])
    : [];

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Няма редове за импорт." },
      { status: 400 },
    );
  }

  if (rows.length > IMPORT_BATCH_SIZE * 4) {
    return NextResponse.json(
      {
        ok: false,
        message: `Твърде много редове наведнъж (максимум ${IMPORT_BATCH_SIZE * 4}).`,
      },
      { status: 413 },
    );
  }

  try {
    const result = await importSubscriberBatch(rows, {
      mergeSegments: body.mergeSegments !== false,
    });
    revalidatePath("/admin/subscribers");
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error(
      "[admin/import]",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error ? err.message : "Импортът не беше завършен.",
      },
      { status: 500 },
    );
  }
}
