import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { recordContactEvent } from "@/lib/contacts/events";
import { getContactByEmail } from "@/lib/contacts/ensure";

export const dynamic = "force-dynamic";

type ZoomWebhookBody = {
  event?: string;
  payload?: {
    object?: {
      participant?: {
        email?: string;
        user_name?: string;
        join_time?: string;
        leave_time?: string;
      };
      id?: string;
    };
  };
};

/**
 * Zoom meeting webhook stub.
 * Configure ZOOM_WEBHOOK_SECRET when Zoom is connected.
 * Events: meeting.participant_joined / meeting.participant_left
 */
export async function POST(req: Request) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET?.trim();
  let body: ZoomWebhookBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.event === "endpoint.url_validation" && secret) {
    const plainToken = (body as { payload?: { plainToken?: string } }).payload?.plainToken;
    if (plainToken) {
      const crypto = await import("crypto");
      const encryptedToken = crypto
        .createHmac("sha256", secret)
        .update(plainToken)
        .digest("hex");
      return NextResponse.json({ plainToken, encryptedToken });
    }
  }

  const participant = body.payload?.object?.participant;
  const email = participant?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: true, skipped: "no_email" });
  }

  const contact = await getContactByEmail(email);
  if (!contact) {
    return NextResponse.json({ ok: true, skipped: "no_contact" });
  }

  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const event = body.event ?? "";

  if (event.includes("participant_joined") || event === "meeting.participant_joined") {
    await supabase
      .from("contacts")
      .update({
        zoom_attended: true,
        zoom_last_joined_at: participant?.join_time ?? now,
        updated_at: now,
      })
      .eq("id", contact.id);

    await recordContactEvent({
      contactId: contact.id,
      eventType: "zoom_joined",
      source: "zoom",
      metadata: {
        meeting_id: body.payload?.object?.id ?? null,
        join_time: participant?.join_time ?? now,
        name: participant?.user_name ?? null,
      },
    });
  }

  if (event.includes("participant_left") || event === "meeting.participant_left") {
    const joinTime = contact.zoom_last_joined_at
      ? new Date(contact.zoom_last_joined_at)
      : participant?.join_time
        ? new Date(participant.join_time)
        : null;
    const leaveTime = participant?.leave_time ? new Date(participant.leave_time) : new Date();
    const durationMinutes =
      joinTime && !Number.isNaN(leaveTime.getTime())
        ? Math.max(0, Math.round((leaveTime.getTime() - joinTime.getTime()) / 60000))
        : 0;

    await supabase
      .from("contacts")
      .update({
        zoom_last_left_at: participant?.leave_time ?? now,
        zoom_total_minutes: (contact.zoom_total_minutes ?? 0) + durationMinutes,
        updated_at: now,
      })
      .eq("id", contact.id);

    await recordContactEvent({
      contactId: contact.id,
      eventType: "zoom_left",
      source: "zoom",
      metadata: {
        meeting_id: body.payload?.object?.id ?? null,
        join_time: joinTime?.toISOString() ?? participant?.join_time ?? null,
        leave_time: participant?.leave_time ?? now,
        duration_minutes: durationMinutes,
      },
    });
  }

  return NextResponse.json({ received: true });
}
