import "server-only";

import { siteConfig } from "@/lib/site";

/** Build tracked redirect URL for email CTAs: /go?contact=…&src=email&campaign=…&job=… */
export function buildContactGoUrl(input: {
  contactId: string;
  campaignId: string;
  workerJobId?: string;
  to?: string;
  src?: string;
}): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteConfig.domain;
  const params = new URLSearchParams({
    contact: input.contactId,
    src: input.src ?? "email",
    campaign: input.campaignId,
  });
  if (input.workerJobId) params.set("job", input.workerJobId);
  if (input.to) params.set("to", input.to);
  return `${origin.replace(/\/$/, "")}/go?${params.toString()}`;
}
