import { statusColorClasses } from "@/lib/admin/contact-crm";
import { cn } from "@/lib/utils";

export function StatusBadge({
  name,
  color,
  size = "sm",
  className,
}: {
  name: string;
  color: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = statusColorClasses(color);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        tone.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}
