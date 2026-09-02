"use client";

import { AdminNavLink } from "@/components/admin/admin-navigation";
import { cn } from "@/lib/utils";

export function AdminTextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AdminNavLink href={href} showSpinner={false} className={cn(className)}>
      {children}
    </AdminNavLink>
  );
}
