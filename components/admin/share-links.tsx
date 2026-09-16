"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { ShareLink } from "@/lib/site/share-links";
import { cn } from "@/lib/utils";

/**
 * `navigator.clipboard` is missing whenever the panel is opened over plain
 * http — a stage host, a phone on the office network. The hidden textarea is
 * the old way of doing it and still works there, and copying a link is exactly
 * the kind of small thing that must not fail silently.
 */
async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Permission denied or insecure context — fall through.
  }

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  title = "Копирай линка",
  className,
  children,
}: {
  value: string;
  title?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void copyText(value).then((ok) => setState(ok ? "copied" : "failed"));
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors",
        state === "copied"
          ? "border-forest-500/40 bg-forest-50 text-forest-700"
          : state === "failed"
            ? "border-coral-400/40 bg-coral-500/10 text-coral-700"
            : "border-ink/15 text-ink-soft hover:border-forest-500/40 hover:bg-forest-50 hover:text-forest-700",
        className,
      )}
    >
      {state === "copied" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {children ??
        (state === "copied"
          ? "Копирано"
          : state === "failed"
            ? "Копирай ръчно"
            : "Копирай")}
    </button>
  );
}

/** One link: what it is, the full address, copy, open. */
export function ShareLinkRow({ link }: { link: ShareLink }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        link.primary
          ? "border-forest-500/40 bg-forest-50/50"
          : "border-ink/10 bg-white",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink">{link.label}</span>
        {link.primary && (
          <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            бутоните водят тук
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          readOnly
          value={link.url}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-cream-2/40 px-2.5 py-1.5 font-mono text-[11px] text-ink outline-none focus:border-forest-400"
        />
        <CopyButton value={link.url} />
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Отвори в нов таб"
          aria-label="Отвори в нов таб"
          className="inline-flex h-[26px] w-7 shrink-0 items-center justify-center rounded-lg border border-ink/15 text-ink-soft transition-colors hover:border-forest-500/40 hover:bg-forest-50 hover:text-forest-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      {link.note && (
        <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">{link.note}</p>
      )}
    </div>
  );
}

/** The box in an editor form that lists every link leading to this row. */
export function ShareLinksPanel({
  links,
  title = "Линкове за споделяне",
  hint,
  empty = "Запази, за да се появи линкът.",
}: {
  links: ShareLink[];
  title?: string;
  hint?: string;
  empty?: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-forest-500/20 bg-forest-50/30 p-4">
      <div>
        <p className="text-sm font-semibold text-forest-800">{title}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{hint}</p>}
      </div>
      {links.length === 0 ? (
        <p className="text-xs text-ink-soft">{empty}</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <ShareLinkRow key={`${link.label}-${link.path}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The compact form used on list cards: the path as the visible text, the full
 * address on the clipboard — pasting a `/bg/guides/x` into a message helps
 * nobody.
 */
export function ShareLinkChips({
  links,
  max = 2,
}: {
  links: ShareLink[];
  max?: number;
}) {
  const shown = links.filter((l) => l.primary).slice(0, max);
  const list = shown.length > 0 ? shown : links.slice(0, max);
  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {list.map((link) => (
        <div key={`${link.label}-${link.path}`} className="flex items-center gap-1.5">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={link.url}
            className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11px] font-medium text-forest-700 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{link.path}</span>
          </a>
          <CopyButton value={link.url} className="px-1.5 py-0.5">
            <span className="sr-only">Копирай</span>
          </CopyButton>
        </div>
      ))}
    </div>
  );
}
