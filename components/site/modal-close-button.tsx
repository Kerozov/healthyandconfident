"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModalCloseButton({
  onClick,
  label,
  className,
  disabled,
}: {
  onClick: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-800 shadow-md ring-1 ring-forest-100 transition-colors hover:bg-cream disabled:opacity-50 sm:right-4 sm:top-4",
        className,
      )}
    >
      <X className="h-5 w-5" strokeWidth={2.25} />
    </button>
  );
}
