import { getSubscribers, getSegments } from "@/lib/admin/data";
import { SubscribersManager } from "@/components/admin/subscribers-manager";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const [subscribers, segments] = await Promise.all([
    getSubscribers(),
    getSegments(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Subscribers</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Full control of your list — add manually, segment, export and manage status.
      </p>
      <div className="mt-8">
        <SubscribersManager subscribers={subscribers} segments={segments} />
      </div>
    </div>
  );
}
