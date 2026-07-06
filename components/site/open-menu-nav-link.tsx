"use client";

import { useMenuPopup } from "@/components/site/menu-popup";
import { cn } from "@/lib/utils";

export function OpenMenuNavAnchor({
  label,
  className,
  onNavigate,
}: {
  locale?: string;
  label: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const { openMenuPopup } = useMenuPopup();

  return (
    <button
      type="button"
      onClick={() => {
        openMenuPopup("nav");
        onNavigate?.();
      }}
      className={cn(className)}
    >
      {label}
    </button>
  );
}
