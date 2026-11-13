import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getSyncState, saveSyncState } from "@/lib/integrations/sync-state";
import {
  getFunnelBrandConfig,
  reportFunnelBrandEmailDays,
  type FunnelBrandEmailDay,
} from "@/lib/integrations/funnel-brand";
import {
  emailDaysSince,
  previousMonthStart,
  sofiaDay,
} from "@/lib/integrations/launchify-email-days";

/**
 * Изпратеното от сайта се брои в лимита на акаунта в Launchify, за да показват
 * лентата тук и картата там едно и също число.
 *
 * Не заявка на писмо: сайтът събира дневните суми от своите редове (една SQL
 * функция) и ги праща наведнъж — от началото на миналия месец до днес. Сумата
 * за деня заменя предишната отсреща, така че отказана насрочена кампания се
 * оправя сама, а повторният доклад не брои двойно.
 *
 * Кога: най-много веднъж на час, когато някой отвори лентата, плюс веднага след
 * кампания и в нощната синхронизация (`force`).
 */

export const LAUNCHIFY_EMAIL_USAGE = "launchify-email-usage";
const MIN_INTERVAL_MS = 60 * 60 * 1000;

export type LaunchifyEmailUsageResult =
  | { ok: true; reported: boolean; emails: number }
  | { ok: false; message: string };

export async function reportLaunchifyEmailUsage({
  force = false,
}: { force?: boolean } = {}): Promise<LaunchifyEmailUsageResult> {
  const config = getFunnelBrandConfig();
  if (!config) return { ok: true, reported: false, emails: 0 };

  if (!force) {
    const state = await getSyncState(LAUNCHIFY_EMAIL_USAGE);
    const last = state?.last_run_at ? Date.parse(state.last_run_at) : 0;
    if (Date.now() - last < MIN_INTERVAL_MS)
      return { ok: true, reported: false, emails: 0 };
  }

  const now = new Date();
  const from = previousMonthStart(sofiaDay(now));
  const { data, error } = await getAdminClient().rpc(
    "launchify_email_usage_by_day",
    { p_from: from },
  );
  if (error) {
    // Миграция 048 още не е пусната — нищо за докладване, без шум на всяко отваряне.
    if (error.code !== "PGRST202")
      console.error("[launchify-email-usage] read:", error.message);
    return { ok: false, message: "Не успях да преброя изпратените имейли." };
  }

  const days: FunnelBrandEmailDay[] = emailDaysSince(
    from,
    sofiaDay(now),
    (data ?? []) as Array<{ day: string; emails: number | string }>,
  );
  const emails = days.reduce((sum, d) => sum + d.emails, 0);

  try {
    await reportFunnelBrandEmailDays(config, days);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Launchify не прие доклада.";
    console.error("[launchify-email-usage] report:", message);
    return { ok: false, message };
  }

  await saveSyncState(LAUNCHIFY_EMAIL_USAGE, {
    last_run_at: now.toISOString(),
    last_error: null,
  });
  return { ok: true, reported: true, emails };
}
