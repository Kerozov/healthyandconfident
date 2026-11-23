import "server-only";

import { campaignMergeFields, templateVarsFromSubscriber } from "@/lib/automation/template";
import { unsubscribeLinkForEmail } from "@/lib/email/unsubscribe";

export type CampaignMergeSubscriber = {
  id?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
};

/**
 * One recipient's fields for a campaign job: `{{name}}`, `{{email}}`, the
 * subscriber id for tracked links and their own unsubscribe link. Used when the
 * campaign is queued and when a person's address changes after that.
 */
export function campaignRecipientMerge(
  sub: CampaignMergeSubscriber | null | undefined,
  email: string,
  locale: "bg" | "en",
): Record<string, string> {
  return {
    ...campaignMergeFields(templateVarsFromSubscriber(sub, email)),
    sid: sub?.id ?? "",
    unsubscribe_url: unsubscribeLinkForEmail(email, locale) ?? "",
  };
}
