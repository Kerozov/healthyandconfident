import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { recordContactEvent } from "@/lib/contacts/events";
import { getContactByEmail } from "@/lib/contacts/ensure";
import { setZoomMeetingEnded, setZoomMeetingLive } from "@/lib/zoom/live";
import {
  logZoomWebhook,
  participantEmail,
  recordZoomSession,
} from "@/lib/zoom/sessions";

export const dynamic = "force-dynamic";

type ZoomWebhookBody = {
  event?: string;
  payload?: {
    object?: {
      participant?: Record<string, unknown>;
      id?: string | number;
      topic?: string;
      start_time?: string;
    };
  };
};

function meetingIdFrom(body: ZoomWebhookBody): string {
  const id = body.payload?.object?.id;
  return id != null ? String(id) : "";
}

/**
 * Zoom meeting webhook.
 * Events: meeting/webinar started/ended + participant joined/left.
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

  const event = body.event ?? "";
  const meetingId = meetingIdFrom(body);
  const participant = body.payload?.object?.participant;
  const email = participantEmail(participant);
  const participantName =
    typeof participant?.user_name === "string" ? participant.user_name : null;

  try {
    if (
      (event === "meeting.started" ||
        event.includes("meeting.started") ||
        event === "webinar.started" ||
        event.includes("webinar.started")) &&
      meetingId
    ) {
      await setZoomMeetingLive({
        meetingId,
        topic: body.payload?.object?.topic ?? null,
        startedAt: body.payload?.object?.start_time ?? new Date().toISOString(),
      });
      await logZoomWebhook({
        zoomEvent: event,
        meetingId,
        status: "live_on",
        detail: body.payload?.object?.topic ?? null,
      });
      return NextResponse.json({ received: true, live: true });
    }

    if (
      (event === "meeting.ended" ||
        event.includes("meeting.ended") ||
        event === "webinar.ended" ||
        event.includes("webinar.ended")) &&
      meetingId
    ) {
      const { getZoomLiveConfig } = await import("@/lib/zoom/live");
      const liveConfig = await getZoomLiveConfig();
      const startedAt =
        liveConfig.live_started_at ??
        body.payload?.object?.start_time ??
        null;
      const topic =
        liveConfig.active_topic ?? body.payload?.object?.topic ?? null;
      const endedAt = new Date().toISOString();
      const startDate = startedAt ? new Date(startedAt) : null;
      const endDate = new Date(endedAt);
      const durationMinutes =
        startDate && !Number.isNaN(endDate.getTime())
          ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
          : 0;

      await recordZoomSession({
        meetingId,
        participantName: topic || "На живо среща",
        joinTime: startedAt,
        leaveTime: endedAt,
        durationMinutes,
        zoomEvent: event,
      });

      await setZoomMeetingEnded(meetingId);
      await logZoomWebhook({
        zoomEvent: event,
        meetingId,
        status: "live_off",
      });
      return NextResponse.json({ received: true, live: false });
    }

    if (event.includes("participant_joined")) {
      const contact = email ? await getContactByEmail(email) : null;
      if (contact) {
        const supabase = getAdminClient();
        const now = new Date().toISOString();
        const joinTime =
          typeof participant?.join_time === "string" ? participant.join_time : now;

        await supabase
          .from("contacts")
          .update({
            zoom_attended: true,
            zoom_last_joined_at: joinTime,
            updated_at: now,
          })
          .eq("id", contact.id);

        await recordContactEvent({
          contactId: contact.id,
          eventType: "zoom_joined",
          source: "zoom",
          metadata: {
            meeting_id: meetingId || null,
            join_time: joinTime,
            name: participantName,
          },
        });
      }

      await logZoomWebhook({
        zoomEvent: event,
        meetingId: meetingId || null,
        email,
        status: contact ? "joined" : email ? "joined_no_contact" : "joined_no_email",
        detail: participantName,
      });
      return NextResponse.json({ received: true });
    }

    if (event.includes("participant_left")) {
      const now = new Date().toISOString();
      const joinTime =
        typeof participant?.join_time === "string" ? participant.join_time : null;
      const leaveTime =
        typeof participant?.leave_time === "string" ? participant.leave_time : now;
      const joinDate = joinTime ? new Date(joinTime) : null;
      const leaveDate = new Date(leaveTime);
      const durationMinutes =
        joinDate && !Number.isNaN(leaveDate.getTime())
          ? Math.max(0, Math.round((leaveDate.getTime() - joinDate.getTime()) / 60000))
          : 0;

      const contact = email ? await getContactByEmail(email) : null;

      if (contact) {
        const supabase = getAdminClient();
        const contactJoin = contact.zoom_last_joined_at
          ? new Date(contact.zoom_last_joined_at)
          : joinDate;
        const mins =
          contactJoin && !Number.isNaN(leaveDate.getTime())
            ? Math.max(
                0,
                Math.round((leaveDate.getTime() - contactJoin.getTime()) / 60000),
              )
            : durationMinutes;

        await supabase
          .from("contacts")
          .update({
            zoom_last_left_at: leaveTime,
            zoom_total_minutes: (contact.zoom_total_minutes ?? 0) + mins,
            updated_at: now,
          })
          .eq("id", contact.id);

        await recordContactEvent({
          contactId: contact.id,
          eventType: "zoom_left",
          source: "zoom",
          metadata: {
            meeting_id: meetingId || null,
            join_time: contactJoin?.toISOString() ?? joinTime,
            leave_time: leaveTime,
            duration_minutes: mins,
            name: participantName,
          },
        });
      }

      if (meetingId) {
        await recordZoomSession({
          contactId: contact?.id ?? null,
          meetingId,
          email,
          participantName,
          joinTime,
          leaveTime,
          durationMinutes,
          zoomEvent: event,
        });
      }

      await logZoomWebhook({
        zoomEvent: event,
        meetingId: meetingId || null,
        email,
        status: contact
          ? "left"
          : email
            ? "left_no_contact"
            : "left_no_email",
        detail: participantName,
      });
      return NextResponse.json({ received: true });
    }

    await logZoomWebhook({
      zoomEvent: event || "unknown",
      meetingId: meetingId || null,
      email,
      status: "ignored",
    });
    return NextResponse.json({ received: true, ignored: true });
  } catch (err) {
    await logZoomWebhook({
      zoomEvent: event || "unknown",
      meetingId: meetingId || null,
      email,
      status: "error",
      detail: err instanceof Error ? err.message : "unknown",
    });
    throw err;
  }
}
