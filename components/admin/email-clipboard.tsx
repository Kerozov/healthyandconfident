"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, ClipboardCopy, ClipboardPaste } from "lucide-react";
import {
  COPIED_EMAIL_EVENT,
  parseCopiedEmail,
  readCopiedEmailRaw,
  writeCopiedEmail,
  type CopiedEmail,
} from "@/lib/email/content-clipboard";
import { cn } from "@/lib/utils";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(COPIED_EMAIL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COPIED_EMAIL_EVENT, onChange);
  };
}

/**
 * The email waiting to be pasted, or null. Null on the server and during
 * hydration, so the markup matches; the real value lands right after.
 */
export function useCopiedEmail(): CopiedEmail | null {
  const raw = useSyncExternalStore(subscribe, readCopiedEmailRaw, () => null);
  return useMemo(() => parseCopiedEmail(raw), [raw]);
}

const BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors disabled:opacity-50";
const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-11 px-4 text-sm",
};

/** Puts the email on the admin clipboard — subject, body, buttons, attachment. */
export function CopyEmailButton({
  build,
  onCopied,
  label = "Копирай имейла",
  size = "sm",
  disabled,
  className,
}: {
  build: () => CopiedEmail | null;
  onCopied?: (copied: CopiedEmail) => void;
  label?: string;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "empty">("idle");

  function copy() {
    const copied = build();
    if (!copied) {
      setState("empty");
      window.setTimeout(() => setState("idle"), 2500);
      return;
    }
    if (!writeCopiedEmail(copied)) return;
    setState("done");
    onCopied?.(copied);
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      title="Копира темата, текста с бутоните, главния бутон, снимката и прикачения файл — за да ги поставиш в кампания или друга автоматизация"
      className={cn(
        BUTTON,
        SIZES[size],
        state === "done"
          ? "border-forest-500/40 bg-forest-50 text-forest-700"
          : "border-ink/15 bg-white text-ink-soft hover:bg-ink/5",
        className,
      )}
    >
      {state === "done" ? (
        <Check className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
      )}
      {state === "done" ? "Копирано" : state === "empty" ? "Няма текст за копиране" : label}
    </button>
  );
}

/** Shown only while something is on the clipboard. */
export function PasteEmailButton({
  copied,
  onPaste,
  size = "sm",
  disabled,
  className,
}: {
  copied: CopiedEmail | null;
  onPaste: (copied: CopiedEmail) => void;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  className?: string;
}) {
  if (!copied) return null;
  return (
    <button
      type="button"
      onClick={() => onPaste(copied)}
      disabled={disabled}
      title={`Поставя копирания имейл${copied.source ? ` (${copied.source})` : ""} — тема, текст, бутони, прикачен файл`}
      className={cn(
        BUTTON,
        SIZES[size],
        "max-w-full border-forest-500/40 bg-forest-50 text-forest-800 hover:bg-forest-100",
        className,
      )}
    >
      <ClipboardPaste className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">Постави „{copied.name}“</span>
    </button>
  );
}
