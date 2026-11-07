import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSegmentGroups, getSegments, getSubscriberTags } from "@/lib/admin/data";
import { getContactStatuses, getSubscriberHistory } from "@/lib/admin/contact-statuses";
import { getFormNamesBySlug } from "@/lib/admin/forms-data";
import { getSubscriberEngagementDetail } from "@/lib/admin/engagement";
import { getPersonProfile } from "@/lib/admin/person-profile";
import {
  SubscriberProfile,
  type SubscriberProfileData,
} from "@/components/admin/subscriber-profile";
import type { Subscriber } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
// Email history and the Zoom report are aggregated per request.
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One failing source (Zoom, the email worker) must not take the whole profile down. */
async function safe<T>(label: string, load: () => Promise<T>, fallback: T): Promise<{
  value: T;
  failed: boolean;
}> {
  try {
    return { value: await load(), failed: false };
  } catch (err) {
    console.error(`[subscriber-profile] ${label}:`, err);
    return { value: fallback, failed: true };
  }
}

export default async function SubscriberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data } = await getAdminClient()
    .from("subscribers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const subscriber = (data as Subscriber | null) ?? null;
  if (!subscriber) notFound();

  const [segments, groups, statusData, history, formNames, subscriberTags, engagement, profile] =
    await Promise.all([
      getSegments(),
      getSegmentGroups(),
      getContactStatuses(),
      getSubscriberHistory(subscriber.id),
      getFormNamesBySlug(),
      getSubscriberTags(),
      safe("engagement", () => getSubscriberEngagementDetail(subscriber.email), null),
      safe("profile", () => getPersonProfile(subscriber.email), null),
    ]);

  const detail: SubscriberProfileData = {
    engagement: engagement.value,
    profile: profile.value,
    partial: engagement.failed || profile.failed,
  };

  return (
    <SubscriberProfile
      subscriber={subscriber}
      segments={segments}
      groups={groups}
      statuses={statusData.statuses}
      statusesAvailable={statusData.available}
      history={history}
      formNames={formNames}
      subscriberTags={subscriberTags}
      data={detail}
    />
  );
}
