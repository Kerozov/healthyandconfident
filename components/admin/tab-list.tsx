"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TabList({
  tabs,
  active,
  onChange,
  "aria-label": ariaLabel,
  contentId,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  "aria-label"?: string;
  /** Optional element id to scroll into view after switching tabs. */
  contentId?: string;
}) {
  const fallbackId = useId().replace(/:/g, "");
  const panelId = contentId ?? `tab-panel-${fallbackId}`;
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    setSwitchingTo(null);
  }, [active]);

  function select(id: string) {
    if (id === active) {
      document.getElementById(panelId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    setSwitchingTo(id);
    onChange(id);
    requestAnimationFrame(() => {
      document.getElementById(panelId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const busy = switchingTo !== null;

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-busy={busy}
        className={cn(
          "inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-ink/10 bg-white p-1 transition-opacity",
          busy && "opacity-70",
        )}
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          const switching = switchingTo === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              disabled={busy}
              onClick={() => select(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35 disabled:cursor-wait",
                selected
                  ? "bg-forest-600 text-cream"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              {switching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                tab.icon
              )}
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    selected ? "bg-white/20" : "bg-ink/5",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div id={panelId} aria-live="polite" className="sr-only">
        {busy ? "Зареждане…" : null}
      </div>
    </div>
  );
}
