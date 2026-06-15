import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getJobTracking, getNotOpenedEmails } from "@/lib/worker/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const wantNotOpened = searchParams.get("notOpened") === "1";

  try {
    const tracking = await getJobTracking(jobId);
    const notOpenedEmails = wantNotOpened ? await getNotOpenedEmails(jobId) : undefined;
    return NextResponse.json({ tracking, notOpenedEmails });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
