"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, Users, Megaphone, MousePointerClick, Mail, Leaf, ExternalLink, LogOut, Globe, BarChart3, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/subscribers", label: "Subscribers", icon: Users },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/automations", label: "Automations", icon: Mail },
  { href: "/admin/forms", label: "Форми", icon: ClipboardList },
  { href: "/admin/engagement", label: "Статистика", icon: BarChart3 },
  { href: "/admin/website", label: "Website", icon: Globe },
  { href: "/admin/popup", label: "Popup", icon: MousePointerClick },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col border-b border-ink/10 bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-6 py-5 font-display text-lg font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-cream">
          <Leaf className="h-4 w-4" />
        </span>
        Admin
      </div>
      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
        {links.map((l) => {
          const active = l.exact
            ? pathname === l.href
            : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-forest-600 text-cream"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-3 border-t border-ink/10 px-6 py-4">
        <Link
          href="/bg"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View site
        </Link>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-ink/5 hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
