"use client";

import { Mail, MessageSquare, GitBranch } from "lucide-react";
import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type AutomationRow = Automation & {
  stats?: { sent: number; scheduled: number };
};

function audienceLabel(
  automation: Automation,
  groups: SegmentGroup[],
  segments: Segment[],
): string {
  const parts: string[] = [];
  const logic = automation.audience_logic === "all" ? "AND" : "OR";

  for (const groupId of automation.group_ids ?? []) {
    const group = groups.find((g) => g.id === groupId);
    if (group) parts.push(`група: ${group.name}`);
  }
  for (const key of automation.segment_keys ?? []) {
    const segment = segments.find((s) => s.key === key);
    parts.push(segment?.name ?? key);
  }

  const excludeParts: string[] = [];
  for (const groupId of automation.exclude_group_ids ?? []) {
    const group = groups.find((g) => g.id === groupId);
    if (group) excludeParts.push(`−${group.name}`);
  }
  for (const key of automation.exclude_segment_keys ?? []) {
    const segment = segments.find((s) => s.key === key);
    excludeParts.push(`−${segment?.name ?? key}`);
  }

  if (parts.length === 0 && excludeParts.length === 0) return "Всички абонати";
  const include = parts.length ? parts.join(logic === "AND" ? " + " : " | ") : "всички";
  const exclude = excludeParts.length ? ` · без: ${excludeParts.join(", ")}` : "";
  return `${include}${exclude}`;
}

function FlowNode({
  automation,
  groups,
  segments,
  isLast,
}: {
  automation: AutomationRow;
  groups: SegmentGroup[];
  segments: Segment[];
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border px-4 py-3 shadow-sm",
          automation.enabled
            ? "border-forest-500/30 bg-white"
            : "border-ink/10 bg-cream-2/50 opacity-70",
        )}
      >
        <div className="flex items-start gap-2">
          {automation.channel === "sms" ? (
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
          ) : (
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{automation.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              {audienceLabel(automation, groups, segments)}
            </p>
            <p className="mt-1 text-[11px] text-ink-soft/80">
              {automation.send_date
                ? `${automation.send_date} ${automation.send_time}`
                : automation.delay_days > 0
                  ? `+${automation.delay_days} дн. · ${automation.send_time}`
                  : `Веднага · ${automation.send_time}`}
            </p>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center py-2 text-forest-600">
          <div className="h-6 w-px bg-forest-400/40" />
          <GitBranch className="h-4 w-4 rotate-90 opacity-60" />
          <div className="h-6 w-px bg-forest-400/40" />
        </div>
      )}
    </div>
  );
}

function buildChains(automations: AutomationRow[]): AutomationRow[][] {
  const byId = new Map(automations.map((a) => [a.id, a]));
  const claimed = new Set<string>();
  const chains: AutomationRow[][] = [];

  const roots = automations
    .filter((a) => !a.after_automation_id || !byId.has(a.after_automation_id))
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const root of roots) {
    const chain: AutomationRow[] = [];
    let current: AutomationRow | undefined = root;
    while (current && !claimed.has(current.id)) {
      chain.push(current);
      claimed.add(current.id);
      current = automations.find((a) => a.after_automation_id === current!.id);
    }
    if (chain.length > 0) chains.push(chain);
  }

  for (const automation of automations) {
    if (!claimed.has(automation.id)) {
      chains.push([automation]);
    }
  }

  return chains;
}

export function AutomationFlowView({
  automations,
  groups,
  segments,
}: {
  automations: AutomationRow[];
  groups: SegmentGroup[];
  segments: Segment[];
}) {
  const chains = buildChains(automations);

  if (automations.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма автоматизации — създай първа от таб „Списък“.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-soft">
        Всяка колона е отделен път (верига). Различни групи/сегменти → различни
        имейли. Използвай <strong>OR</strong> за „ако е в група A или B“,{" "}
        <strong>AND</strong> за „трябва да е и в A, и в B“. Изключения спират
        конкретен имейл.
      </p>
      <div className="grid gap-8 xl:grid-cols-2 2xl:grid-cols-3">
        {chains.map((chain) => (
          <div
            key={chain.map((a) => a.id).join("-")}
            className="rounded-2xl border border-ink/10 bg-cream-2/20 p-5"
          >
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-forest-700">
              Път · {chain[0]?.name}
            </p>
            <div className="flex flex-col items-stretch">
              {chain.map((automation, index) => (
                <FlowNode
                  key={automation.id}
                  automation={automation}
                  groups={groups}
                  segments={segments}
                  isLast={index === chain.length - 1}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
