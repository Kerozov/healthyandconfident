"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { SmsCampaign } from "@/lib/supabase/types";
import { deleteSmsCampaign } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<SmsCampaign["status"], string> = {
  draft: "bg-ink/10 text-ink-soft",
  sending: "bg-gold-400/20 text-gold-500",
  sent: "bg-forest-500/15 text-forest-600",
  failed: "bg-coral-500/15 text-coral-600",
};

function audienceLabel(c: SmsCampaign) {
  if (c.target_tags?.length) return `tags: ${c.target_tags.join(", ")}`;
  return c.segment_tag;
}

export function SmsCampaignsTable({ campaigns }: { campaigns: SmsCampaign[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(c: SmsCampaign) {
    if (!confirm(`Delete SMS campaign? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteSmsCampaign(c.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">SMS campaigns</h2>
        <p className="mt-0.5 text-xs text-ink-soft/70">
          Sent via the SMS notifier. Delivery status is logged at send time.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
          No SMS campaigns yet.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-ink/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-base font-semibold line-clamp-2">
                      {c.message}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLES[c.status],
                      )}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft/70">
                    {audienceLabel(c)} · {c.recipients_count} recipients ·{" "}
                    {formatDate(c.sent_at ?? c.created_at, "en")}
                  </p>
                  {c.error && (
                    <p className="mt-1 text-xs text-coral-600">{c.error}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(c)}
                  disabled={pending}
                  title="Delete"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
