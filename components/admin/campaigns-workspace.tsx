"use client";

import { useState } from "react";
import { Mail, MessageSquare, Plus } from "lucide-react";
import type { EmailCampaign, Segment, SegmentGroup, SiteProduct, SmsCampaign } from "@/lib/supabase/types";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { CampaignsTable } from "@/components/admin/campaigns-table";
import { SmsCampaignsTable } from "@/components/admin/sms-campaigns-table";
import { Alert, TabList } from "@/components/admin/ui";

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
  const [composing, setComposing] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600"
        >
          <Plus className="h-4 w-4" />
          {tab === "email" ? "Нова имейл кампания" : "Нова SMS кампания"}
        </button>
      </div>

      {!workerConfigured && (
        <Alert variant="warning" className="mt-4">
          Задай <code>NOTIFICATION_WORKER_URL</code>,{" "}
          <code>NOTIFICATION_WORKER_API_KEY</code> и{" "}
          <code>NOTIFICATION_WORKER_FROM</code> — иначе нищо няма да се изпраща.
        </Alert>
      )}

      {composing && (
        <CampaignComposer
          segments={segments}
          groups={groups}
          products={products}
          forms={forms}
          subscriberTags={subscriberTags}
          workerConfigured={workerConfigured}
          tab={tab}
          onClose={() => setComposing(false)}
        />
      )}

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
