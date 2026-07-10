"use client";

import { useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import type { EmailCampaign, Segment, SegmentGroup, SiteProduct, SmsCampaign } from "@/lib/supabase/types";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { CampaignsTable } from "@/components/admin/campaigns-table";
import { SmsCampaignsTable } from "@/components/admin/sms-campaigns-table";
import { TabList } from "@/components/admin/ui";

export function CampaignsWorkspace({
  emailCampaigns,
  smsCampaigns,
  segments,
  groups,
  products,
  forms,
  subscriberTags,
  workerConfigured,
}: {
  emailCampaigns: EmailCampaign[];
  smsCampaigns: SmsCampaign[];
  segments: Segment[];
  groups: SegmentGroup[];
  products: SiteProduct[];
  forms: import("@/lib/forms/types").FormTemplateRecord[];
  subscriberTags: string[];
  workerConfigured: boolean;
}) {
  const [tab, setTab] = useState<"email" | "sms">("email");

  return (
    <div>
      <TabList
        aria-label="Тип кампания"
        active={tab}
        onChange={(id) => setTab(id as "email" | "sms")}
        tabs={[
          {
            id: "email",
            label: "Имейл",
            icon: <Mail className="h-4 w-4" aria-hidden />,
            count: emailCampaigns.length,
          },
          {
            id: "sms",
            label: "SMS",
            icon: <MessageSquare className="h-4 w-4" aria-hidden />,
            count: smsCampaigns.length,
          },
        ]}
      />

      <div className="mt-6">
        <CampaignComposer
          segments={segments}
          groups={groups}
          products={products}
          forms={forms}
          subscriberTags={subscriberTags}
          workerConfigured={workerConfigured}
          tab={tab}
        />
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "email" ? (
          <CampaignsTable campaigns={emailCampaigns} />
        ) : (
          <SmsCampaignsTable campaigns={smsCampaigns} />
        )}
      </div>
    </div>
  );
}
