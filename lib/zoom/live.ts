import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/i18n/config";
import type { ZoomLiveConfig } from "@/lib/supabase/types";
import type { ZoomLivePublicState } from "@/lib/zoom/live-types";

const CONFIG_KEY = "default";

const EMPTY_CONFIG: ZoomLiveConfig = {
  key: CONFIG_KEY,
  feature_enabled: true,
  watch_meeting_id: null,
  join_url: "",
  label_bg: "Присъедини се на живо",
  label_en: "Join live",
  manual_is_live: false,
  is_live: false,
  active_meeting_id: null,
  active_topic: null,
  live_started_at: null,
  updated_at: new Date(0).toISOString(),
};

export async function getZoomLiveConfig(): Promise<ZoomLiveConfig> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("zoom_live_config")
    .select("*")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  return (data as ZoomLiveConfig | null) ?? EMPTY_CONFIG;
}

function meetingIdsMatch(configured: string | null | undefined, incoming: string): boolean {
  if (!configured?.trim()) return true;
  const a = configured.trim();
  const b = incoming.trim();
  return a === b || a.replace(/\D/g, "") === b.replace(/\D/g, "");
}

export function toPublicLiveState(
  config: ZoomLiveConfig,
  locale: Locale,
): ZoomLivePublicState {
  const joinUrl = config.join_url.trim() || null;
  const webhookLive = config.is_live;
  const isLive =
    config.feature_enabled &&
    Boolean(joinUrl) &&
    (config.manual_is_live || webhookLive);

  return {
    isLive,
    joinUrl: isLive ? joinUrl : null,
    label: locale === "bg" ? config.label_bg : config.label_en,
    topic: config.active_topic,
    startedAt: config.live_started_at,
  };
}

export async function getPublicZoomLiveState(
  locale: Locale,
): Promise<ZoomLivePublicState> {
  const config = await getZoomLiveConfig();
  return toPublicLiveState(config, locale);
}

export async function setZoomMeetingLive(input: {
  meetingId: string;
  topic?: string | null;
  startedAt?: string;
}): Promise<void> {
  const config = await getZoomLiveConfig();
  if (!meetingIdsMatch(config.watch_meeting_id, input.meetingId)) return;

  const supabase = getAdminClient();
  await supabase
    .from("zoom_live_config")
    .update({
      is_live: true,
      active_meeting_id: input.meetingId,
      active_topic: input.topic?.trim() || null,
      live_started_at: input.startedAt ?? new Date().toISOString(),
    })
    .eq("key", CONFIG_KEY);
}

export async function setZoomMeetingEnded(meetingId: string): Promise<void> {
  const config = await getZoomLiveConfig();
  if (
    config.active_meeting_id &&
    !meetingIdsMatch(config.active_meeting_id, meetingId) &&
    !meetingIdsMatch(config.watch_meeting_id, meetingId)
  ) {
    return;
  }
  if (
    config.watch_meeting_id?.trim() &&
    !meetingIdsMatch(config.watch_meeting_id, meetingId)
  ) {
    return;
  }

  const supabase = getAdminClient();
  await supabase
    .from("zoom_live_config")
    .update({
      is_live: false,
      active_meeting_id: null,
      active_topic: null,
      live_started_at: null,
    })
    .eq("key", CONFIG_KEY);
}
