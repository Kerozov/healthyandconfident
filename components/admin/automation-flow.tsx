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
  Split,
  UserCheck,
  ShoppingBag,
  UserPlus,
  Pencil,
} from "lucide-react";
import type {
  Automation,
  AutomationStats,
  AutomationTrigger,
  Segment,
  SegmentGroup,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type AutomationRow = Automation & AutomationStats;

type TreeNode = {
  automation: AutomationRow;
  children: TreeNode[];
};

const TRIGGER_META: Record<
  AutomationTrigger,
  { label: string; icon: typeof UserPlus; color: string }
> = {
  new_subscriber: {
    label: "Нов абонат",
    icon: UserPlus,
    color: "bg-sky-100 text-sky-800 border-sky-200",
  },
  registration: {
    label: "Записване от сайта",
    icon: UserCheck,
    color: "bg-forest-500/15 text-forest-800 border-forest-200",
  },
  purchase: {
    label: "След покупка",
    icon: ShoppingBag,
    color: "bg-amber-100 text-amber-900 border-amber-200",
  },
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
    return `Дата: ${automation.send_date} · ${automation.send_time}`;
  }
  if ((automation.delay_days ?? 0) > 0) {
    return `След ${automation.delay_days} дн. · ${automation.send_time}`;
  }
  if ((automation.delay_minutes ?? 0) > 0) {
    return `След ${automation.delay_minutes} мин.`;
  }
  if (automation.after_automation_id) {
    return "Веднага след предишната";
  }
  return `Веднага / днес ${automation.send_time}`;
}

function audienceSummary(
  automation: Automation,
  audience: ResolvedAudience,
): string {
  const logic = automation.audience_logic === "all" ? " И " : " ИЛИ ";
  const include: string[] = [];
  audience.groups.forEach((g) => include.push(`група „${g.name}"`));
  audience.segments.forEach((s) => include.push(`сегмент „${s.name}"`));
  const inc =
    include.length > 0 ? include.join(logic) : "всички абонати (без филтър)";
  const exc =
    audience.excludes.length > 0
      ? ` · без: ${audience.excludes.map((e) => `„${e.name}"`).join(", ")}`
      : "";
  return `${inc}${exc}`;
}

function buildTree(automations: AutomationRow[], root: AutomationRow): TreeNode {
  const children = automations
    .filter((a) => a.after_automation_id === root.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => buildTree(automations, a));
  return { automation: root, children };
}

function buildForestByTrigger(
  automations: AutomationRow[],
): Record<AutomationTrigger, TreeNode[]> {
  const byId = new Map(automations.map((a) => [a.id, a]));
  const forest: Record<AutomationTrigger, TreeNode[]> = {
    new_subscriber: [],
    registration: [],
    purchase: [],
  };

  const roots = automations
    .filter((a) => !a.after_automation_id || !byId.has(a.after_automation_id))
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const root of roots) {
    forest[root.trigger_event].push(buildTree(automations, root));
  }

  return forest;
}

export const TRIGGER_SECTION_LABELS: Record<AutomationTrigger, string> = {
  new_subscriber: "Нов абонат",
  registration: "Записване от сайта",
  purchase: "След покупка",
};

export type FlatAutomationRow = {
  automation: AutomationRow;
  depth: number;
  pathLabel: string;
  parentName?: string;
  trigger: AutomationTrigger;
};

/** Ordered list for compact UI — same tree order as the visual schema. */
export function flattenAutomationsForDisplay(
  automations: AutomationRow[],
): FlatAutomationRow[] {
  const forest = buildForestByTrigger(automations);
  const result: FlatAutomationRow[] = [];
  const triggers: AutomationTrigger[] = ["new_subscriber", "registration", "purchase"];

  for (const trigger of triggers) {
    forest[trigger].forEach((tree, pathIndex) => {
      function walk(
        node: TreeNode,
        depth: number,
        path: string,
        parentName?: string,
      ) {
        result.push({
          automation: node.automation,
          depth,
          pathLabel: path,
          parentName,
          trigger,
        });
        node.children.forEach((child, i) => {
          walk(child, depth + 1, `${path}.${i + 1}`, node.automation.name);
        });
      }
      walk(tree, 0, `${pathIndex + 1}`);
    });
  }

  return result;
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
      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
        Всички абонати
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {logic === "all" &&
        audience.groups.length + audience.segments.length > 1 && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            AND
          </span>
        )}
      {logic === "any" &&
        audience.groups.length + audience.segments.length > 1 && (
          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
            OR
          </span>
        )}
      {audience.groups.map((g) => (
        <span
          key={g.id}
          className="inline-flex items-center gap-1 rounded-md bg-forest-500/12 px-2 py-0.5 text-[11px] font-medium text-forest-700"
        >
          <Users className="h-3 w-3" /> {g.name}
        </span>
      ))}
      {audience.segments.map((s) => (
        <span
          key={s.key}
          className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-[11px] font-medium text-slate-700"
        >
          <Tag className="h-3 w-3" /> {s.name}
        </span>
      ))}
    </div>
  );
}

function FlowCard({
  automation,
  audience,
  stepLabel,
  parentName,
  selected,
  onSelect,
}: {
  automation: AutomationRow;
  audience: ResolvedAudience;
  stepLabel: string;
  parentName?: string;
  selected?: boolean;
  onSelect?: (automation: AutomationRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(automation)}
      className={cn(
        "w-full min-w-[280px] max-w-md rounded-xl border-2 px-4 py-3 text-left shadow-sm transition-all",
        "cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400 focus-visible:ring-offset-2",
        selected
          ? "border-forest-500 bg-forest-500/5 ring-2 ring-forest-400/60"
          : automation.enabled
            ? automation.channel === "sms"
              ? "border-sky-300/60 bg-white hover:border-sky-400"
              : "border-forest-400/40 bg-white hover:border-forest-500"
            : "border-ink/10 bg-cream-2/60 opacity-70 hover:opacity-90",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {stepLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {!automation.enabled && (
            <span className="text-[10px] font-medium text-ink-soft">изключена</span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              selected
                ? "bg-forest-500 text-white"
                : "bg-slate-100 text-slate-600",
            )}
          >
            <Pencil className="h-3 w-3" />
            {selected ? "Редактираш" : "Редакция"}
          </span>
        </div>
      </div>

      {parentName && (
        <p className="mt-2 text-[10px] text-ink-soft">
          ↳ след „<span className="font-medium text-slate-700">{parentName}</span>"
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {automation.channel === "sms" ? (
          <MessageSquare className="h-4 w-4 text-sky-600" />
        ) : (
          <Mail className="h-4 w-4 text-forest-600" />
        )}
        <p className="font-display text-sm font-semibold text-ink">
          {automation.name}
        </p>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
        {automation.new_subscribers_only
          ? "👤 Само при първо добавяне на имейла"
          : "👥 Нов и съществуващ имейл в списъка"}
      </p>

      <div className="mt-3 rounded-lg bg-cream/80 p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-forest-600">
          Получава, ако
        </p>
        <div className="mt-1.5">
          <AudienceChips
            audience={audience}
            logic={automation.audience_logic === "all" ? "all" : "any"}
          />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-600">
          {audienceSummary(automation, audience)}
        </p>
      </div>

      {audience.excludes.length > 0 && (
        <div className="mt-2 rounded-lg border border-dashed border-coral-200 bg-coral-50/60 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-coral-700">
            Не получава (изключение)
          </p>
          <ul className="mt-1 space-y-1">
            {audience.excludes.map((ex) => (
              <li
                key={`${ex.kind}-${ex.id}`}
                className="flex items-center gap-1.5 text-[11px] text-coral-800"
              >
                <UserMinus className="h-3 w-3 shrink-0" />
                {ex.kind === "group" ? "Група" : "Сегмент"} ·{" "}
                <strong>{ex.name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1 text-[11px] text-ink-soft">
        <Zap className="h-3 w-3" />
        {scheduleLabel(automation)}
      </p>
    </button>
  );
}

function DownConnector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-2">
      {label && (
        <span className="mb-1 max-w-[200px] text-center text-[10px] font-medium text-forest-600">
          {label}
        </span>
      )}
      <div className="h-4 w-px bg-forest-400/50" />
      <ArrowDown className="h-4 w-4 text-forest-500" />
      <div className="h-2 w-px bg-forest-400/50" />
    </div>
  );
}

function ForkConnector({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center py-2">
      <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold text-amber-900">
        <Split className="h-3 w-3" />
        {count} клона — различна аудитория
      </div>
      <div className="mt-2 h-4 w-px bg-forest-400/50" />
      <ArrowDown className="h-4 w-4 text-forest-500" />
    </div>
  );
}

function ExcludeExit({ item }: { item: ResolvedAudience["excludes"][number] }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-coral-200 bg-coral-50 px-2.5 py-2 text-[11px] text-coral-800">
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-coral-500" />
      <UserMinus className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>{item.name}</strong> — спира на тази стъпка
      </span>
    </div>
  );
}

function TreeBranch({
  node,
  groups,
  segments,
  stepPrefix,
  parentName,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  groups: SegmentGroup[];
  segments: Segment[];
  stepPrefix: string;
  parentName?: string;
  depth: number;
  selectedId?: string | null;
  onSelect?: (automation: AutomationRow) => void;
}) {
  const audience = resolveAudience(node.automation, groups, segments);

  return (
    <div className="flex flex-col items-center">
      <div className="grid w-full gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <FlowCard
          automation={node.automation}
          audience={audience}
          stepLabel={`${stepPrefix}${depth}`}
          parentName={parentName}
          selected={selectedId === node.automation.id}
          onSelect={onSelect}
        />
        {audience.excludes.length > 0 && (
          <div className="flex flex-col gap-2 lg:max-w-[220px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-coral-600">
              Изключва се
            </p>
            {audience.excludes.map((ex) => (
              <ExcludeExit key={`${ex.kind}-${ex.id}`} item={ex} />
            ))}
          </div>
        )}
      </div>

      {node.children.length === 1 && (
        <>
          <DownConnector label="след изпращане → следваща стъпка" />
          <TreeBranch
            node={node.children[0]!}
            groups={groups}
            segments={segments}
            stepPrefix={stepPrefix}
            parentName={node.automation.name}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </>
      )}

      {node.children.length > 1 && (
        <>
          <ForkConnector count={node.children.length} />
          <div className="flex w-full flex-wrap justify-center gap-6 pt-2">
            {node.children.map((child, i) => (
              <div
                key={child.automation.id}
                className="flex flex-col items-center border-t-2 border-forest-300/40 pt-4"
              >
                <span className="mb-2 rounded-full bg-forest-500/10 px-2.5 py-0.5 text-[10px] font-bold text-forest-700">
                  Клон {i + 1}
                </span>
                <TreeBranch
                  node={child}
                  groups={groups}
                  segments={segments}
                  stepPrefix={stepPrefix}
                  parentName={node.automation.name}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TriggerSection({
  trigger,
  trees,
  groups,
  segments,
  selectedId,
  onSelect,
}: {
  trigger: AutomationTrigger;
  trees: TreeNode[];
  groups: SegmentGroup[];
  segments: Segment[];
  selectedId?: string | null;
  onSelect?: (automation: AutomationRow) => void;
}) {
  if (trees.length === 0) return null;
  const meta = TRIGGER_META[trigger];
  const Icon = meta.icon;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div
        className={cn(
          "mb-6 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5",
          meta.color,
        )}
      >
        <Icon className="h-5 w-5" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
            Започва при
          </p>
          <p className="font-display text-base font-semibold">{meta.label}</p>
        </div>
      </div>

      <div className="space-y-10">
        {trees.map((tree, pathIndex) => (
          <div
            key={tree.automation.id}
            className="rounded-xl border border-forest-100 bg-gradient-to-b from-cream/40 to-white p-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-forest-100 pb-3">
              <GitBranch className="h-4 w-4 text-forest-600" />
              <p className="text-sm font-semibold text-slate-800">
                Верига {pathIndex + 1}: {tree.automation.name}
              </p>
            </div>
            <TreeBranch
              node={tree}
              groups={groups}
              segments={segments}
              stepPrefix={`${pathIndex + 1}.`}
              depth={1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AutomationFlowView({
  automations,
  groups,
  segments,
  selectedId,
  onSelectAutomation,
}: {
  automations: AutomationRow[];
  groups: SegmentGroup[];
  segments: Segment[];
  selectedId?: string | null;
  onSelectAutomation?: (automation: AutomationRow) => void;
}) {
  const forest = buildForestByTrigger(automations);
  const hasAny = automations.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-ink-soft">
        Няма автоматизации — създай първа от таб „Списък“.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-forest-100 bg-cream/50 px-4 py-3 text-sm text-ink-soft">
        <p>
          Кликни стъпка за редакция.{" "}
          <span className="text-amber-800">Разклонения</span> = различни пътища.{" "}
          <span className="text-coral-700">Изключения</span> = спират веригата.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 text-forest-600" /> Група
          </span>
          <span className="inline-flex items-center gap-1">
            <Tag className="h-3 w-3 text-slate-600" /> Сегмент
          </span>
          <span className="inline-flex items-center gap-1 text-amber-800">
            <Split className="h-3 w-3" /> Разклонение
          </span>
          <span className="inline-flex items-center gap-1 text-coral-700">
            <UserMinus className="h-3 w-3" /> Изключение
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {(["registration", "new_subscriber", "purchase"] as const).map(
          (trigger) => (
            <TriggerSection
              key={trigger}
              trigger={trigger}
              trees={forest[trigger]}
              groups={groups}
              segments={segments}
              selectedId={selectedId}
              onSelect={onSelectAutomation}
            />
          ),
        )}
      </div>
    </div>
  );
}
