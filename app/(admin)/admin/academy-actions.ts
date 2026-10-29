"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { academyConfig, fetchAcademyCatalog, type AcademyCatalog } from "@/lib/academy/issue";

/** The academy's programs by name, so a product picks one from a list. */
export async function listAcademyCourses(): Promise<
  { ok: true; schools: AcademyCatalog["schools"] } | { ok: false; message: string }
> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "Нямаш достъп." };
  }
  const config = academyConfig();
  if (!config) {
    return { ok: false, message: "Академията не е свързана: във Vercel липсват ACADEMY_URL и ACADEMY_SALE_KEY." };
  }
  const res = await fetchAcademyCatalog(config);
  return res.ok ? { ok: true, schools: res.catalog.schools } : res;
}
