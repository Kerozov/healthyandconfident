"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import { AdminNavLink, useAdminNavigate } from "@/components/admin/admin-navigation";

export function DashboardStatCard({
  href,
  label,
  value,
  sub,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const { pendingHref } = useAdminNavigate();
  const pending = pendingHref === href;

  return (
    <AdminNavLink
      href={href}
      showSpinner={false}
      className="group rounded-2xl border border-ink/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Icon className="h-5 w-5" aria-hidden />
          )}
        </span>
        <ArrowUpRight
          className="h-4 w-4 text-ink-soft/40 transition-colors group-hover:text-coral-500"
          aria-hidden
        />
      </div>
      <p className="mt-4 font-display text-4xl font-semibold text-ink">{value}</p>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
      {pending ? (
        <p className="mt-2 text-xs font-medium text-forest-700">Зареждане…</p>
      ) : null}
    </AdminNavLink>
  );
}
