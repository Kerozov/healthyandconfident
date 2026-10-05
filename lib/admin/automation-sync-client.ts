/**
 * Browser side of `/api/admin/automations/sync`. Never throws — a failed
 * refresh just leaves the numbers already on screen.
 */
export type AutomationSyncResult = {
  ok: boolean;
  synced: number;
  total: number;
  remaining: number;
};

export async function requestAutomationSync(
  automationId?: string,
): Promise<AutomationSyncResult> {
  const failed: AutomationSyncResult = { ok: false, synced: 0, total: 0, remaining: 0 };
  try {
    const res = await fetch("/api/admin/automations/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(automationId ? { automationId } : {}),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as Partial<AutomationSyncResult> | null;
    if (!res.ok || !data?.ok) return failed;
    return {
      ok: true,
      synced: data.synced ?? 0,
      total: data.total ?? 0,
      remaining: data.remaining ?? 0,
    };
  } catch {
    return failed;
  }
}
