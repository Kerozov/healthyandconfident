import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { TemplateVars } from "@/lib/automation/template";
import type { AutomationRunContext } from "@/lib/automation/run";

/**
 * Everything a `{{…}}` tag may need for this person. The run context carries
 * the full name and phone from whichever path started it; first / last name
 * live on the subscriber row, so read it once when the context doesn't have them.
 */
export async function templateVarsForContext(ctx: AutomationRunContext): Promise<TemplateVars> {
  const email = ctx.email.trim().toLowerCase();
  const vars: TemplateVars = {
    name: ctx.name ?? null,
    firstName: ctx.firstName ?? null,
    lastName: ctx.lastName ?? null,
    phone: ctx.phone ?? null,
    email,
  };
  if (vars.firstName || vars.lastName) return vars;

  try {
    const supabase = getAdminClient();
    const query = supabase.from("subscribers").select("name, first_name, last_name, phone");
    const { data } = ctx.subscriberId
      ? await query.eq("id", ctx.subscriberId).maybeSingle()
      : await query.eq("email", email).maybeSingle();
    const sub = data as
      | { name: string | null; first_name: string | null; last_name: string | null; phone: string | null }
      | null;
    if (sub) {
      vars.name = vars.name?.trim() ? vars.name : sub.name;
      vars.firstName = sub.first_name;
      vars.lastName = sub.last_name;
      vars.phone = vars.phone?.trim() ? vars.phone : sub.phone;
    }
  } catch {
    // No row / no DB — the full name still splits into first and last.
  }
  return vars;
}
