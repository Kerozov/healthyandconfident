import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getMetaPixelConfig, isCapiActive, isPixelActive } from "@/lib/meta/config";
import type { MetaEventLogRow, MetaPixelConfig } from "@/lib/meta/types";

export type MetaEventSummaryRow = {
  eventName: string;
  sent: number;
  failed: number;
  skipped: number;
  browser: number;
  server: number;
  valueCents: number;
};

export type MetaPixelAdminData = {
  config: MetaPixelConfig;
  pixelActive: boolean;
  capiActive: boolean;
  /** Set through env vars rather than this form — shown as read-only hints. */
  envPixelId: string;
  envTokenPresent: boolean;
  summary: MetaEventSummaryRow[];
  recent: MetaEventLogRow[];
  last7: { sent: number; failed: number };
  lastEventAt: string | null;
};

export async function getMetaPixelAdminData(): Promise<MetaPixelAdminData> {
  const config = await getMetaPixelConfig();
  const supabase = getAdminClient();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: logRows }, { data: recentRows }] = await Promise.all([
    supabase
      .from("meta_event_log")
      .select("event_name, source, status, value_cents, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("meta_event_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows =
    (logRows as {
      event_name: string;
      source: "browser" | "server";
      status: "sent" | "failed" | "skipped";
      value_cents: number | null;
      created_at: string;
    }[] | null) ?? [];

  const byEvent = new Map<string, MetaEventSummaryRow>();
  let last7Sent = 0;
  let last7Failed = 0;

  for (const row of rows) {
    const entry =
      byEvent.get(row.event_name) ??
      ({
        eventName: row.event_name,
        sent: 0,
        failed: 0,
        skipped: 0,
        browser: 0,
        server: 0,
        valueCents: 0,
      } satisfies MetaEventSummaryRow);

    entry[row.status] += 1;
    entry[row.source] += 1;
    if (row.status === "sent") entry.valueCents += row.value_cents ?? 0;
    byEvent.set(row.event_name, entry);

    if (row.created_at >= since7) {
      if (row.status === "sent") last7Sent += 1;
      if (row.status === "failed") last7Failed += 1;
    }
  }

  const recent = (recentRows as MetaEventLogRow[] | null) ?? [];

  return {
    config,
    pixelActive: isPixelActive(config),
    capiActive: isCapiActive(config),
    envPixelId:
      process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
      process.env.META_PIXEL_ID?.trim() ||
      "",
    envTokenPresent: Boolean(process.env.META_CONVERSIONS_API_TOKEN?.trim()),
    summary: [...byEvent.values()].sort((a, b) => b.sent - a.sent),
    recent,
    last7: { sent: last7Sent, failed: last7Failed },
    lastEventAt: recent[0]?.created_at ?? null,
  };
}
