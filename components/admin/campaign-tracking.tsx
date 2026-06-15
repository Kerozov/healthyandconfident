"use client";

import { useState } from "react";
import { BarChart3, Copy, Loader2 } from "lucide-react";

type Tracking = {
  opened: number;
  notOpened: number;
  sent: number;
  failed: number;
};

export function CampaignTracking({ jobId }: { jobId: string | null }) {
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [notOpened, setNotOpened] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!jobId) return <span className="text-xs text-ink-soft/50">—</span>;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tracking?jobId=${jobId}&notOpened=1`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setTracking(data.tracking);
      setNotOpened(data.notOpenedEmails ?? []);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <BarChart3 className="h-3.5 w-3.5" />
        )}
        Opens
      </button>

      {error && <p className="mt-1 text-xs text-coral-600">{error}</p>}

      {open && tracking && (
        <div className="mt-2 rounded-xl border border-ink/10 bg-cream-2/40 p-3 text-xs">
          <div className="flex flex-wrap gap-3">
            <span className="font-semibold text-forest-600">
              Opened: {tracking.opened}
            </span>
            <span className="text-ink-soft">Not opened: {tracking.notOpened}</span>
            <span className="text-ink-soft">Sent: {tracking.sent}</span>
            {tracking.failed > 0 && (
              <span className="text-coral-600">Failed: {tracking.failed}</span>
            )}
          </div>
          {notOpened.length > 0 && (
            <button
              onClick={() => navigator.clipboard.writeText(notOpened.join(", "))}
              className="mt-2 inline-flex items-center gap-1.5 text-coral-600 hover:underline"
            >
              <Copy className="h-3 w-3" /> Copy {notOpened.length} not-opened emails (for
              resend)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
