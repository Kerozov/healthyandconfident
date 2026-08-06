"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-screen editing surface. Editors used to live in a ~26rem column squeezed
 * against the left edge, which left the wide screens unused and made long forms
 * unreadable. This takes over the viewport instead: sticky title bar, one wide
 * scrolling body the caller lays out in columns, and a sticky action bar.
 */
export function WorkspaceEditor({
  title,
  subtitle,
  badge,
  onClose,
  footer,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Never throw away a half-written email: selects, date pickers and any
      // field being typed into swallow their own Escape.
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "SELECT" ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-cream-2"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-ink/10 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-lg font-semibold text-ink sm:text-xl">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-ink-soft sm:text-sm">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium text-ink-soft hover:bg-ink/5"
        >
          <X className="h-4 w-4" />
          Затвори
        </button>
      </header>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={cn("mx-auto w-full max-w-[120rem] px-4 py-5 sm:px-6 sm:py-6", className)}>
          {children}
        </div>
      </div>

      {footer && (
        <footer className="shrink-0 border-t border-ink/10 bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex w-full max-w-[120rem] flex-wrap items-center gap-2">
            {footer}
          </div>
        </footer>
      )}
    </div>
  );
}

/** One titled column block inside a `WorkspaceEditor` grid. */
export function WorkspacePanel({
  title,
  description,
  tone = "plain",
  className,
  children,
}: {
  title?: string;
  description?: string;
  tone?: "plain" | "forest" | "gold" | "sky" | "violet" | "coral";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        tone === "plain" && "border-ink/10 bg-white",
        tone === "forest" && "border-forest-500/25 bg-forest-50/50",
        tone === "gold" && "border-gold-500/30 bg-gold-50/40",
        tone === "sky" && "border-sky-500/25 bg-sky-50/40",
        tone === "violet" && "border-violet-500/25 bg-violet-50/40",
        tone === "coral" && "border-coral-500/30 bg-coral-500/5",
        className,
      )}
    >
      {title && (
        <div className="mb-3">
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
