import Link from "next/link";
import { Users, FileText, Megaphone, ArrowUpRight } from "lucide-react";
import { getDashboardStats } from "@/lib/admin/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  const cards = [
    {
      label: "Active subscribers",
      value: stats.activeSubscribers,
      sub: `${stats.totalSubscribers} total`,
      icon: Users,
      href: "/admin/subscribers",
    },
    {
      label: "Published posts",
      value: stats.publishedPosts,
      sub: `${stats.totalPosts} total`,
      icon: FileText,
      href: "/admin/blog",
    },
    {
      label: "Campaigns sent",
      value: stats.recentCampaigns.filter((c) => c.status === "sent").length,
      sub: "recent",
      icon: Megaphone,
      href: "/admin/campaigns",
    },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Overview of subscribers, content and campaigns.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl border border-ink/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <c.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-soft/40 transition-colors group-hover:text-coral-500" />
            </div>
            <p className="mt-4 font-display text-4xl font-semibold">{c.value}</p>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs text-ink-soft/70">{c.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Recent campaigns</h2>
          <Link
            href="/admin/campaigns"
            className="text-sm font-medium text-coral-600 hover:underline"
          >
            View all
          </Link>
        </div>
        {stats.recentCampaigns.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No campaigns yet.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="pb-2">Subject</th>
                <th className="pb-2">Segment</th>
                <th className="pb-2">Recipients</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentCampaigns.map((c) => (
                <tr key={c.id} className="border-b border-ink/5 last:border-0">
                  <td className="py-3 font-medium">{c.subject}</td>
                  <td className="py-3 text-ink-soft">{c.segment_tag}</td>
                  <td className="py-3 text-ink-soft">{c.recipients_count}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs text-forest-600">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 text-ink-soft">
                    {formatDate(c.created_at, "en")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
