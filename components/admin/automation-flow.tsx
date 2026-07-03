"use client";

import {
  Mail,
  MessageSquare,
  GitBranch,
  ArrowDown,
  ArrowRight,
  UserMinus,
  Users,
  Tag,
  Zap,
} from "lucide-react";
import type {
  Automation,
  AutomationTrigger,
  Segment,
  SegmentGroup,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type AutomationRow = Automation & {
  stats?: { sent: number; scheduled: number };
};

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  new_subscriber: "Нов абонат",
  registration: "Записване от сайта",
  purchase: "След покупка",
};

type ResolvedAudience = {
  groups: { id: string; name: string }[];
  segments: { key: string; name: string }[];
  excludes: { kind: "group" | "segment"; id: string; name: string }[];
};

function resolveAudience(
  automation: Automation,
  groups: SegmentGroup[],
  segments: Segment[],
): ResolvedAudience {
  const resolvedGroups = (automation.group_ids ?? [])
    .map((id) => {
      const group = groups.find((g) => g.id === id);
      return group ? { id, name: group.name } : null;
    })
    .filter(Boolean) as { id: string; name: string }[];

  const resolvedSegments = (automation.segment_keys ?? [])
    .map((key) => {
      const segment = segments.find((s) => s.key === key);
      return { key, name: segment?.name ?? key };
    })
    .filter((s) => s.key);

  const excludes: ResolvedAudience["excludes"] = [];
  for (const groupId of automation.exclude_group_ids ?? []) {
    const group = groups.find((g) => g.id === groupId);
    excludes.push({
      kind: "group",
      id: groupId,
      name: group?.name ?? groupId.slice(0, 8),
    });
  }
  for (const key of automation.exclude_segment_keys ?? []) {
    const segment = segments.find((s) => s.key === key);
    excludes.push({
      kind: "segment",
      id: key,
      name: segment?.name ?? key,
    });
  }

  return { groups: resolvedGroups, segments: resolvedSegments, excludes };
}

function scheduleLabel(automation: Automation): string {
  if (automation.send_date) {
    return `${automation.send_date} · ${automation.send_time}`;
  }
  if ((automation.delay_days ?? 0) > 0) {
    return `+${automation.delay_days} дн. · ${automation.send_time}`;
  }
  return `Веднага · ${automation.send_time}`;
}

function AudienceChips({
  audience,
  logic,
}: {
  audience: ResolvedAudience;
  logic: "any" | "all";
}) {
  const hasInclude =
    audience.groups.length > 0 || audience.segments.length > 0;

  if (!hasInclude) {
    return (
      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
        Всички абонати
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {logic === "all" && audience.groups.length + audience.segments.length > 1 && (
        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          AND
        </span>
      )}
      {logic === "any" && audience.groups.length + audience.segments.length > 1 && (
        <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
          OR
        </span>
      )}
      {audience.groups.map((g) => (
        <span
          key={g.id}
          className="inline-flex items-center gap-1 rounded-md bg-forest-500/12 px-2 py-0.5 text-[11px] font-medium text-forest-700"
        >
          <Users className="h-3 w-3 shrink-0 opacity-70" />
          {g.name}
        </span>
      ))}
      {audience.segments.map((s) => (
        <span
          key={s.key}
          className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-[11px] font-medium text-slate-700"
        >
          <Tag className="h-3 w-3 shrink-0 opacity-70" />
          {s.name}
        </span>
      ))}
    </div>
  );
}

function ExcludeBranch({
  item,
}: {
  item: ResolvedAudience["excludes"][number];
}) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-coral-500" />
      <div className="inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-dashed border-coral-300 bg-coral-50/80 px-2.5 py-1.5 text-[11px] font-medium text-coral-800">
        <UserMinus className="h-3.5 w-3.5 shrink-0 text-coral-600" />
        <span className="min-w-0 truncate">
          {item.kind === "group" ? "Група" : "Сегмент"} ·{" "}
          <strong className="font-semibold">{item.name}</strong>
          <span className="text-coral-600/90"> — спира на тази стъпка</span>
        </span>
      </div>
    </div>
  );
}

function FlowNode({
  automation,
  audience,
  stepNumber,
}: {
  automation: AutomationRow;
  audience: ResolvedAudience;
  stepNumber: number;
}) {
  return (
    <div
      className={cn(
        "relative w-full max-w-md rounded-xl border px-4 py-3 shadow-sm",
        automation.enabled
          ? "border-forest-500/25 bg-white"
          : "border-ink/10 bg-cream-2/60 opacity-75",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-500/10 text-xs font-bold text-forest-700">
          {stepNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {automation.channel === "sms" ? (
              <MessageSquare className="h-4 w-4 shrink-0 text-forest-600" />
            ) : (
              <Mail className="h-4 w-4 shrink-0 text-forest-600" />
            )}
            <p className="font-display text-sm font-semibold leading-snug text-ink">
              {automation.name}
            </p>
            {!automation.enabled && (
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                Изключена
              </span>
            )}
          </div>

          <div className="mt-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft/70">
              Получатели
            </p>
            <AudienceChips
              audience={audience}
              logic={automation.audience_logic === "all" ? "all" : "any"}
            />
          </div>

          <p className="mt-2.5 text-[11px] text-ink-soft">
            <Zap className="mr-1 inline h-3 w-3 opacity-60" />
            {scheduleLabel(automation)}
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowConnector({ hasExcludeBranch }: { hasExcludeBranch: boolean }) {
  return (
    <div
      className={cn(
        "flex items-stretch py-1",
        hasExcludeBranch ? "min-h-[52px]" : "min-h-[28px]",
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="h-full min-h-[20px] w-px flex-1 bg-forest-400/35" />
        <ArrowDown className="h-4 w-4 shrink-0 text-forest-500/70" />
        <div className="h-2 w-px bg-forest-400/35" />
      </div>
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

function PathColumn({
  chain,
  groups,
  segments,
}: {
  chain: AutomationRow[];
  groups: SegmentGroup[];
  segments: Segment[];
}) {
  const root = chain[0];
  if (!root) return null;

  const pathName = root.name;
  const trigger = TRIGGER_LABELS[root.trigger_event] ?? root.trigger_event;

  return (
    <div className="rounded-2xl border border-forest-200/60 bg-gradient-to-b from-cream/80 to-white p-5 shadow-sm">
      <div className="mb-5 border-b border-forest-100 pb-4">
        <div className="flex items-start gap-2">
          <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-forest-600">
              Път · {chain.length} {chain.length === 1 ? "стъпка" : "стъпки"}
            </p>
            <h3 className="mt-1 font-display text-base font-semibold leading-snug text-ink">
              {pathName}
            </h3>
            <p className="mt-1.5 text-xs text-ink-soft">
              Тригър: <span className="font-medium text-slate-700">{trigger}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        {chain.map((automation, index) => {
          const audience = resolveAudience(automation, groups, segments);
          const hasExcludes = audience.excludes.length > 0;
          const isLast = index === chain.length - 1;

          return (
            <div key={automation.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <FlowNode
                  automation={automation}
                  audience={audience}
                  stepNumber={index + 1}
                />

                {hasExcludes && (
                  <div className="flex flex-col gap-2 border-l-2 border-dashed border-coral-200 pl-4 lg:ml-4 lg:min-w-[210px] lg:max-w-[260px] lg:flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-coral-600/80">
                      Разклонение · спира
                    </p>
                    {audience.excludes.map((item) => (
                      <ExcludeBranch
                        key={`${item.kind}-${item.id}`}
                        item={item}
                      />
                    ))}
                  </div>
                )}
              </div>

              {!isLast && <FlowConnector hasExcludeBranch={hasExcludes} />}
            </div>
          );
        })}
      </div>
    </div>
  );
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
    <div className="space-y-6">
      <div className="rounded-xl border border-forest-100 bg-cream/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
        <p>
          Всяка колона е отделен <strong className="text-slate-800">път</strong> надолу.
          Името на пътя е от <strong className="text-slate-800">първата стъпка</strong>;
          всяка стъпка показва собственото си име, групи и сегменти.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-forest-500/20" />
            Група
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-500/20" />
            Сегмент
          </span>
          <span className="inline-flex items-center gap-1 text-coral-700">
            <ArrowRight className="h-3 w-3" />
            Изключена аудитория — спира на тази стъпка
          </span>
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {chains.map((chain) => (
          <PathColumn
            key={chain.map((a) => a.id).join("-")}
            chain={chain}
            groups={groups}
            segments={segments}
          />
        ))}
      </div>
    </div>
  );
}
