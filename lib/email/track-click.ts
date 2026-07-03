import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { ClickSourceType } from "@/lib/email/click-token";

export async function recordEmailLinkClick(input: {
  sourceType: ClickSourceType;
  sourceId: string;
  email: string;
  subscriberId?: string | null;
  targetUrl: string;
}): Promise<void> {
  const supabase = getAdminClient();
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  await supabase.from("email_link_clicks").insert({
    source_type: input.sourceType,
    source_id: input.sourceId,
    email,
    subscriber_id: input.subscriberId ?? null,
    target_url: input.targetUrl,
    clicked_at: now,
  });

  if (input.sourceType === "automation") {
    const { data: rows } = await supabase
      .from("automation_deliveries")
      .select("id, click_count, first_clicked_at")
      .eq("automation_id", input.sourceId)
      .eq("email", email)
      .eq("channel", "email")
      .in("status", ["sent", "scheduled"])
      .order("sent_at", { ascending: false })
      .limit(1);

    const delivery = (rows as { id: string; click_count: number; first_clicked_at: string | null }[] | null)?.[0];
    if (delivery) {
      await supabase
        .from("automation_deliveries")
        .update({
          click_count: (delivery.click_count ?? 0) + 1,
          first_clicked_at: delivery.first_clicked_at ?? now,
        })
        .eq("id", delivery.id);
    }
    return;
  }

  const { data: rows } = await supabase
    .from("campaign_deliveries")
    .select("id, click_count, first_clicked_at")
    .eq("campaign_id", input.sourceId)
    .eq("email", email)
    .order("sent_at", { ascending: false })
    .limit(1);

  const delivery = (rows as { id: string; click_count: number; first_clicked_at: string | null }[] | null)?.[0];
  if (delivery) {
    await supabase
      .from("campaign_deliveries")
      .update({
        click_count: (delivery.click_count ?? 0) + 1,
        first_clicked_at: delivery.first_clicked_at ?? now,
      })
      .eq("id", delivery.id);
  }

  const { data: agg } = await supabase
    .from("campaign_deliveries")
    .select("click_count")
    .eq("campaign_id", input.sourceId);

  const clickedCount = ((agg as { click_count: number }[] | null) ?? []).reduce(
    (sum, row) => sum + (row.click_count ?? 0),
    0,
  );

  await supabase
    .from("email_campaigns")
    .update({ clicked_count: clickedCount })
    .eq("id", input.sourceId);
}
