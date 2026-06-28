"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

export function LeadForm({
  locale,
  placeholder,
  button,
  consent,
  success,
  error,
  segmentTag = "all",
  source = "lead-magnet",
  variant = "default",
}: {
  locale: Locale;
  placeholder: string;
  button: string;
  consent: string;
  success: string;
  error: string;
  segmentTag?: string;
  source?: string;
  variant?: "default" | "gradient";
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, source, tags: [segmentTag] }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl px-6 py-5",
          variant === "gradient"
            ? "bg-white/15 text-white"
            : "bg-sage-50 text-sage-600",
        )}
      >
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <p className="font-medium">{success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="h-14 flex-1 rounded-full bg-white px-5 py-3 text-sm text-warm-800 outline-none focus:ring-2 focus:ring-white/50"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-warm-900 px-6 py-3 font-medium text-white transition-colors hover:bg-warm-800 disabled:opacity-60"
        >
          {state === "loading" ? "..." : button}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      <p
        className={cn(
          "mt-3 text-xs",
          variant === "gradient" ? "text-white/70" : "text-[#8B6A5A]",
        )}
      >
        {consent}
      </p>
      {state === "error" && (
        <p className="mt-2 text-sm text-rose-100">{error}</p>
      )}
    </form>
  );
}
