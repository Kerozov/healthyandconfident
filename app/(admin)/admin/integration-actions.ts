"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listFunnelBrandFunnels,
  syncFunnelBrandContacts,
  testFunnelBrandConnection,
  type FunnelBrandFunnelOption,
  type FunnelBrandSyncResult,
  type FunnelSegmentRouting,
} from "@/lib/integrations/funnel-brand-sync";

type ActionResult = { ok: boolean; message: string };

/**
 * Pulls contacts from FunnelBrand. `full` ignores the saved cursor and re-reads
 * everything; `routing` picks the segment each funnel's contacts go to.
 */
export async function syncFunnelBrandAction(
  options: { full?: boolean; routing?: FunnelSegmentRouting } = {},
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

  const result = await syncFunnelBrandContacts({
    full: options.full,
    routing: options.routing,
  });

  if (result.created > 0 || result.updated > 0) {
    revalidatePath("/admin/subscribers");
    revalidatePath("/admin/campaigns");
  }

  return result;
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
