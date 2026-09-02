"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshButton({
  label = "Обнови",
  className,
  size = "md",
}: {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white font-semibold text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-wait disabled:opacity-60",
        size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="h-4 w-4" aria-hidden />
      )}
      {label}
    </button>
  );
}
