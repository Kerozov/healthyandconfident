import type { AdminAuditLog } from "@/lib/supabase/types";
import { adminScreenLabel } from "@/lib/admin/screens";
import { formatAdminWhen } from "@/lib/admin/format-time";
import { cn } from "@/lib/utils";

export function AuditActivityList({
  items,
  empty = "Все още няма записани промени.",
  showActor = true,
  className,
}: {
  items: AdminAuditLog[];
  empty?: string;
  showActor?: boolean;
  className?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">{empty}</p>;
  }

  return (
    <ol className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">
              {showActor ? (
                <span className="font-medium">{item.actor_name} </span>
              ) : null}
              {item.summary}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {adminScreenLabel(item.screen)} · {formatAdminWhen(item.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
