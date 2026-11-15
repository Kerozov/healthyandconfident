import type { SiteBlackFridayConfig } from "@/lib/supabase/types";

/**
 * Where the campaign is right now:
 * - `off`    — disabled in the admin;
 * - `early`  — before the public start, the page collects early-access signups;
 * - `live`   — the offers are open;
 * - `ended`  — past the deadline, prices are back to normal.
 */
export type BlackFridayPhase = "off" | "early" | "live" | "ended";

function ms(value: string | null | undefined): number {
  if (!value) return NaN;
  return new Date(value).getTime();
}

export function blackFridayPhase(
  config: SiteBlackFridayConfig | null,
  now: number = Date.now(),
): BlackFridayPhase {
  if (!config?.enabled) return "off";
  const end = ms(config.deadline);
  if (!Number.isNaN(end) && now >= end) return "ended";
  const start = ms(config.early_access_deadline);
  if (!Number.isNaN(start) && now < start) return "early";
  return "live";
}

/**
 * Whether the offers can be seen and bought right now: during the campaign,
 * or before the public start with the secret early-access key from the email.
 */
export function blackFridayOffersOpen(
  config: SiteBlackFridayConfig | null,
  earlyKey: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const phase = blackFridayPhase(config, now);
  if (phase === "live") return true;
  if (phase !== "early") return false;
  const key = config?.early_access_key?.trim() ?? "";
  return Boolean(key) && earlyKey?.trim() === key;
}
