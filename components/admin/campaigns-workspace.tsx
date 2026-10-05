"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Mail, MessageSquare, Plus, X } from "lucide-react";
import type { EmailCampaign, Segment, SegmentGroup, SiteGuide, SiteProduct, SmsCampaign } from "@/lib/supabase/types";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { useCopiedEmail } from "@/components/admin/email-clipboard";
import { clearCopiedEmail, type CopiedEmail } from "@/lib/email/content-clipboard";
import { CampaignsTable } from "@/components/admin/campaigns-table";
import { SmsCampaignsTable } from "@/components/admin/sms-campaigns-table";
import { Alert, TabList } from "@/components/admin/ui";

export function CampaignsWorkspace({
  emailCampaigns,
  smsCampaigns,
  segments,
  groups,
  products,
  guides = [],
  forms,
  subscriberTags,
  workerConfigured,
  pasteOnOpen = false,
}: {
  emailCampaigns: EmailCampaign[];
  smsCampaigns: SmsCampaign[];
  segments: Segment[];
  groups: SegmentGroup[];
  products: SiteProduct[];
  guides?: SiteGuide[];
  forms: import("@/lib/forms/types").FormTemplateRecord[];
  subscriberTags: string[];
  workerConfigured: boolean;
  /** `?paste=1` — arrived from "Кампания от този имейл" on an automation. */
  pasteOnOpen?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "sms">("email");
  const [composing, setComposing] = useState<{ initial: CopiedEmail | null } | null>(null);
  const [pasteHandled, setPasteHandled] = useState(false);
  const copiedEmail = useCopiedEmail();

  // Set during render, not in an effect: the clipboard is only readable after
  // hydration, and the composer should open filled the moment it is. Copied
  // into state once, so a later copy cannot swap the content mid-edit.
  if (pasteOnOpen && !pasteHandled && copiedEmail) {
    setPasteHandled(true);
    setTab("email");
    setComposing({ initial: copiedEmail });
  }

  function openComposer(initial: CopiedEmail | null) {
    if (initial) setTab("email");
    setComposing({ initial });
  }

  function closeComposer() {
    setComposing(null);
    // Drop `?paste=1` so a reload does not open the composer again.
    if (pasteOnOpen) router.replace("/admin/campaigns");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabList
          aria-label="Тип кампания"
          active={tab}
          onChange={(id) => setTab(id as "email" | "sms")}
          contentId="campaigns-workspace-panel"
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
          onClick={() => openComposer(null)}
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

      {copiedEmail && !composing && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-forest-400/60 bg-forest-50/60 px-4 py-3">
          <ClipboardPaste className="h-4 w-4 shrink-0 text-forest-700" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-forest-900">
            Копиран имейл{copiedEmail.source ? ` от ${copiedEmail.source}` : ""}:{" "}
            <strong>{copiedEmail.name}</strong> — с текста, бутоните и прикачения файл.
          </p>
          <button
            type="button"
            onClick={() => openComposer(copiedEmail)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-forest-600 px-4 text-xs font-semibold text-cream hover:bg-forest-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Нова кампания с него
          </button>
          <button
            type="button"
            onClick={clearCopiedEmail}
            aria-label="Изчисти копирания имейл"
            title="Изчисти копирания имейл"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white text-ink-soft hover:bg-ink/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {composing && (
        <CampaignComposer
          key={composing.initial?.copiedAt ?? "blank"}
          segments={segments}
          groups={groups}
          products={products}
          guides={guides}
          forms={forms}
          subscriberTags={subscriberTags}
          workerConfigured={workerConfigured}
          tab={tab}
          initialEmail={composing.initial}
          onClose={closeComposer}
        />
      )}

      <div id="campaigns-workspace-panel" className="mt-8" role="tabpanel">
        {tab === "email" ? (
          <CampaignsTable campaigns={emailCampaigns} />
        ) : (
          <SmsCampaignsTable campaigns={smsCampaigns} />
        )}
      </div>
    </div>
  );
}
