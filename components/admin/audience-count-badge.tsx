import type { AudienceCount } from "@/lib/segments/hierarchy";
import { Badge } from "@/components/admin/ui";

export function AudienceCountBadge({ count }: { count: AudienceCount | undefined }) {
  const subscribed = count?.subscribed ?? 0;
  const unsubscribed = count?.unsubscribed ?? 0;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <Badge
        tone={subscribed > 0 ? "success" : "neutral"}
        className="py-0.5 font-semibold tabular-nums"
      >
        {subscribed} {subscribed === 1 ? "човек" : "души"}
      </Badge>
      {unsubscribed > 0 && (
        <span className="text-xs font-normal text-ink-soft tabular-nums">
          +{unsubscribed} отписани
        </span>
      )}
    </span>
  );
}
