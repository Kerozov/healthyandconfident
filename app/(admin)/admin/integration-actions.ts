"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listFunnelBrandFunnels,
  previewFunnelBrandSync,
  saveFunnelBrandSettings,
  syncFunnelBrandContacts,
  testFunnelBrandConnection,
  type FunnelBrandFunnelOption,
  type FunnelBrandPreview,
  type FunnelBrandSyncResult,
  type FunnelBrandSyncSettings,
} from "@/lib/integrations/funnel-brand-sync";

type ActionResult = { ok: boolean; message: string };

/**
 * Pulls contacts from Launchify. `full` ignores the saved cursor and re-reads
 * everything; `settings` are the admin's webinar → group choices (saved too).
 */
export async function syncFunnelBrandAction(
  options: { full?: boolean; settings?: FunnelBrandSyncSettings } = {},
): Promise<ActionResult & Partial<FunnelBrandSyncResult>> {
  let actor: { id: string | null; name: string };
  try {
    const session = await requireAdmin("subscribers", {
      action: "sync",
      summary: options.full
        ? "Пълна синхронизация с Launchify"
        : "Синхронизира контакти от Launchify",
    });
    actor = { id: session.id, name: session.displayName || session.username };
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }

  const result = await syncFunnelBrandContacts({
    full: options.full,
    settings: options.settings,
    actor,
  });

  revalidatePath("/admin/subscribers", "layout");
  if (result.created > 0 || result.updated > 0) {
    revalidatePath("/admin/campaigns");
  }

  return result;
}

/** What the next sync would bring, per webinar — read only, nothing is written. */
export async function previewFunnelBrandSyncAction(options: { full?: boolean } = {}): Promise<
  { ok: true; preview: FunnelBrandPreview } | { ok: false; message: string }
> {
  try {
    await requireAdmin("subscribers");
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }
  return previewFunnelBrandSync(options);
}

export async function saveFunnelBrandSettingsAction(
  settings: FunnelBrandSyncSettings,
): Promise<ActionResult> {
  try {
    await requireAdmin("subscribers", {
      action: "update",
      summary: "Промени настройките на синхронизацията с Launchify",
    });
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }
  await saveFunnelBrandSettings(settings);
  revalidatePath("/admin/subscribers");
  return { ok: true, message: "Настройките са запазени." };
}

export async function listFunnelBrandFunnelsAction(): Promise<
  { ok: true; funnels: FunnelBrandFunnelOption[] } | { ok: false; message: string }
> {
  try {
    await requireAdmin("subscribers");
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }

  return listFunnelBrandFunnels();
}

export async function testFunnelBrandAction(): Promise<ActionResult> {
  try {
    await requireAdmin("subscribers");
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }

  return testFunnelBrandConnection();
}
