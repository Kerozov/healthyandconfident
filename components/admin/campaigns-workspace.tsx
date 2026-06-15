"use client";

import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import type { EmailCampaign, Segment, SmsCampaign } from "@/lib/supabase/types";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { CampaignsTable } from "@/components/admin/campaigns-table";
import { SmsCampaignsTable } from "@/components/admin/sms-campaigns-table";
import { cn } from "@/lib/utils";

export function CampaignsWorkspace({
  emailCampaigns,
  smsCampaigns,
  segments,
  subscriberTags,
  smsConfigured,
  emailConfigured,
}: {
  emailCampaigns: EmailCampaign[];
  smsCampaigns: SmsCampaign[];
  segments: Segment[];
  subscriberTags: string[];
  smsConfigured: boolean;
  emailConfigured: boolean;
}) {
  const [tab, setTab] = useState<"email" | "sms">("email");

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-ink/10 p-1">
        <button
          onClick={() => setTab("email")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold",
            tab === "email" ? "bg-forest-600 text-cream" : "text-ink-soft",
          )}
        >
          <Mail className="h-4 w-4" />
          Email
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {emailCampaigns.length}
          </span>
        </button>
        <button
          onClick={() => setTab("sms")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold",
            tab === "sms" ? "bg-forest-600 text-cream" : "text-ink-soft",
          )}
        >
          <MessageSquare className="h-4 w-4" />
          SMS
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {smsCampaigns.length}
          </span>
        </button>
      </div>

      <CampaignComposer
        segments={segments}
        subscriberTags={subscriberTags}
        smsConfigured={smsConfigured}
        emailConfigured={emailConfigured}
        tab={tab}
      />

      <div className="mt-8">
        {tab === "email" ? (
          <CampaignsTable campaigns={emailCampaigns} />
        ) : (
          <SmsCampaignsTable campaigns={smsCampaigns} />
        )}
      </div>
    </div>
  );
}
