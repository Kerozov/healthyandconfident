import "server-only";

import type { Locale } from "@/lib/supabase/types";
import { runAutomations } from "@/lib/automation/run";

export type SendAutomatedEmailInput = {
  email: string;
  name?: string | null;
  phone?: string | null;
  locale?: Locale;
  subscriberId?: string | null;
  tags?: string[];
  isNew?: boolean;
  source?: string;
};

function toContext(input: SendAutomatedEmailInput): Parameters<typeof runAutomations>[0] {
  return {
    email: input.email,
    name: input.name,
    phone: input.phone,
    locale: input.locale,
    subscriberId: input.subscriberId,
    tags: input.tags ?? [],
    isNew: input.isNew ?? false,
    source: input.source,
  };
}

/** @deprecated Use runAutomations — kept for subscribe route */
export async function sendPurchaseWelcomeEmail(
  input: SendAutomatedEmailInput,
): Promise<{ ok: boolean }> {
  await runAutomations({ ...toContext(input), source: "purchase", isNew: input.isNew ?? false });
  return { ok: true };
}

export async function sendRegistrationWelcomeEmail(
  input: SendAutomatedEmailInput,
): Promise<{ ok: boolean }> {
  await runAutomations({
    ...toContext(input),
    isNew: true,
    source: input.source ?? "popup",
  });
  return { ok: true };
}

export { runAutomations, runAutomationsForSubscriber } from "@/lib/automation/run";
export type { AutomationRunReport } from "@/lib/automation/run";
