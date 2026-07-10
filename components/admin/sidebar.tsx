"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Megaphone,
  MousePointerClick,
  Mail,
  Leaf,
  ExternalLink,
  LogOut,
  Globe,
  BarChart3,
  ClipboardList,
  Signature,
  Route,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Преглед",
    items: [{ href: "/admin", label: "Табло", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Съдържание",
    items: [
      { href: "/admin/blog", label: "Блог", icon: FileText },
      { href: "/admin/website", label: "Уебсайт", icon: Globe },
      { href: "/admin/popup", label: "Popup", icon: MousePointerClick },
      { href: "/admin/email-footer", label: "Email подпис", icon: Signature },
    ],
  },
  {
    label: "Аудитория",
    items: [
      { href: "/admin/subscribers", label: "Абонати", icon: Users },
      { href: "/admin/contacts", label: "Контакти", icon: Route },
      { href: "/admin/forms", label: "Форми", icon: ClipboardList },
    ],
  },
  {
    label: "Маркетинг",
    items: [
      { href: "/admin/campaigns", label: "Кампании", icon: Megaphone },
      { href: "/admin/automations", label: "Автоматизации", icon: Mail },
      { href: "/admin/engagement", label: "Статистика", icon: BarChart3 },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35",
                      active
                        ? "bg-forest-600 text-cream shadow-sm"
                        : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const footer = (
    <div className="flex flex-col gap-2 border-t border-ink/10 p-4">
      <Link
        href="/bg"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        Виж сайта
      </Link>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden />
        Изход
      </button>
    </div>
  );

  return (
    <div className="lg:flex lg:min-h-screen lg:shrink-0 lg:flex-col">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-ink/10 bg-white px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-display text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-cream">
            <Leaf className="h-4 w-4" aria-hidden />
          </span>
          Админ
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
          aria-label="Отвори менюто"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[1px] lg:hidden"
          aria-label="Затвори менюто"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-ink/10 bg-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Админ навигация"
      >
        <div className="hidden items-center justify-between gap-2 px-5 py-5 lg:flex">
          <Link href="/admin" className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-600 text-cream">
              <Leaf className="h-4 w-4" aria-hidden />
            </span>
            <span className="truncate">Healthy &amp; Confident</span>
          </Link>
        </div>

        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 lg:hidden">
          <span className="text-sm font-semibold text-ink">Меню</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-ink/5"
            aria-label="Затвори менюто"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>

        {footer}
      </aside>
    </div>
  );
}
