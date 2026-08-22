"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import {
  syncFunnelBrandContacts,
  testFunnelBrandConnection,
  type FunnelBrandSyncResult,
} from "@/lib/integrations/funnel-brand-sync";

type ActionResult = { ok: boolean; message: string };

/** Pulls contacts from FunnelBrand. `full` ignores the saved cursor and re-reads everything. */
export async function syncFunnelBrandAction(
  options: { full?: boolean } = {},
): Promise<ActionResult & Partial<FunnelBrandSyncResult>> {
  try {
    await requireAdmin("subscribers", {
      action: "sync",
      summary: options.full
        ? "Пълна синхронизация с FunnelBrand"
        : "Синхронизира контакти от FunnelBrand",
    });
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }

  const result = await syncFunnelBrandContacts({ full: options.full });

  if (result.created > 0 || result.updated > 0) {
    revalidatePath("/admin/subscribers");
    revalidatePath("/admin/campaigns");
  }

  return result;
}

export async function testFunnelBrandAction(): Promise<ActionResult> {
  try {
    await requireAdmin("subscribers");
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }

  return testFunnelBrandConnection();
}
