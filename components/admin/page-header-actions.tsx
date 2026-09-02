"use client";

import { RefreshButton } from "@/components/admin/refresh-button";

export function PageHeaderActions({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RefreshButton />
      {children}
    </div>
  );
}
