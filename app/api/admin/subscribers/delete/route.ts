import { NextResponse } from "next/server";
import { AdminAccessError, requireAdmin } from "@/lib/admin/auth";
import { deleteSubscribersByIds } from "@/lib/admin/delete-subscribers";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireAdmin("subscribers", {
      action: "delete",
      summary: "Масово изтриване на абонати",
    });
  } catch (err) {
    const message =
      err instanceof AdminAccessError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Няма достъп.";
    const status = message === "UNAUTHORIZED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];

  const result = await deleteSubscribersByIds(ids);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  revalidatePath("/admin/subscribers");
  return NextResponse.json(result);
}
