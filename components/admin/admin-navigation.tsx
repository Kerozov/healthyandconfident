"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminNavigationContextValue = {
  pathname: string;
  pendingHref: string | null;
  navigate: (href: string) => void;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(
  null,
);

function useAdminNavigation() {
  const ctx = useContext(AdminNavigationContext);
  if (!ctx) {
    throw new Error("AdminNavLink must be used within AdminNavigationProvider");
  }
  return ctx;
}

export function AdminNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [requestedHref, setRequestedHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The spinner belongs to the in-flight transition, so derive it rather than
  // clearing it from an effect — that left the spinner up for an extra frame
  // (and forever, if the navigation resolved to the page we were already on).
  const pendingHref = pending ? requestedHref : null;

  const navigate = useCallback(
    (href: string) => {
      setRequestedHref(href);
      startTransition(() => {
        if (typeof window !== "undefined") {
          const target = new URL(href, window.location.origin);
          const current = new URL(window.location.href);
          if (
            target.pathname === current.pathname &&
            target.search === current.search
          ) {
            router.refresh();
            return;
          }
        } else if (href === pathname) {
          router.refresh();
          return;
        }
        router.push(href);
      });
    },
    [pathname, router],
  );

  return (
    <AdminNavigationContext.Provider
      value={{ pathname, pendingHref, navigate }}
    >
      {children}
    </AdminNavigationContext.Provider>
  );
}

function linkIsActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  const pathOnly = href.split("?")[0] ?? href;
  if (pathname === pathOnly) return true;
  return pathname.startsWith(`${pathOnly}/`);
}

export function AdminNavLink({
  href,
  active,
  className,
  children,
  onNavigate,
  showSpinner = true,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  /** When false, pending state only dims the link (for rich card content). */
  showSpinner?: boolean;
}) {
  const { pathname, pendingHref, navigate } = useAdminNavigation();
  const isActive = active ?? linkIsActive(pathname, href);
  const pending = pendingHref === href;

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      aria-busy={pending}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
        navigate(href);
      }}
      className={cn(className, pending && "cursor-wait opacity-70")}
    >
      {pending && showSpinner ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          {children}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}

export function useAdminNavigate() {
  const { navigate, pendingHref } = useAdminNavigation();
  return { navigate, pendingHref };
}
