import "server-only";

import { publicSiteOrigin } from "@/lib/site";

/** Build tracked redirect URL for email CTAs: /go?contact=…&src=email&campaign=…&job=… */
export function buildContactGoUrl(input: {
  contactId: string;
  campaignId: string;
  workerJobId?: string;
  to?: string;
  src?: string;
}): string {
  const origin = publicSiteOrigin();
  const params = new URLSearchParams({
    contact: input.contactId,
    src: input.src ?? "email",
    campaign: input.campaignId,
  });
  if (input.workerJobId) params.set("job", input.workerJobId);
  if (input.to) params.set("to", input.to);
  return `${origin}/go?${params.toString()}`;
}
