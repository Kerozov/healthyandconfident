"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import {
  fullNameFromParts,
  tagsFromHealthSelection,
  type HealthSelection,
} from "@/lib/site/health-tags";
import { mergeVisitorTags } from "@/lib/site/visitor-tags";

const COPY = {
  bg: {
    firstName: "Име",
    lastName: "Фамилия",
    email: "Имейл",
    facebook: "Facebook профил (линк)",
    facebookPh: "https://facebook.com/...",
    healthTitle: "Какво те вълнува?",
    healthHint: "Избери едно или повече — така получаваш подходящо съдържание.",
    ir: "Инсулинова резистентност",
    diabetes: "Диабет тип 2",
    general: "Нямам тези проблеми — общо отслабване / енергия",
    submit: "Изпрати",
    loading: "...",
    error: "Нещо се обърка. Опитай пак.",
  },
  en: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    facebook: "Facebook profile (link)",
    facebookPh: "https://facebook.com/...",
    healthTitle: "What are you interested in?",
    healthHint: "Pick one or more — we'll send relevant content.",
    ir: "Insulin resistance",
    diabetes: "Type 2 Diabetes",
    general: "None of these — general weight loss / energy",
    submit: "Submit",
    loading: "...",
    error: "Something went wrong. Try again.",
  },
} as const;

export type SubscribeFormPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string | null;
  facebook_url?: string | null;
  locale: Locale;
  source: string;
  tags: string[];
  consent: boolean;
};

export function SubscribeForm({
  locale,
  source,
  baseTags = [],
  consent,
  success,
  buttonLabel,
  variant = "default",
  compact = false,
  onSuccess,
}: {
  locale: Locale;
  source: string;
  baseTags?: string[];
  consent: string;
  success: string;
  buttonLabel?: string;
  variant?: "default" | "gradient" | "light";
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const t = COPY[locale];
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [facebook, setFacebook] = useState("");
  const [health, setHealth] = useState<HealthSelection>({
    insulinResistance: false,
    diabetes: false,
    general: false,
  });
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const inputClass = cn(
    "h-11 w-full rounded-lg border bg-white px-4 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-forest-200",
    variant === "gradient" ? "border-white/30" : "border-forest-100",
  );

  function toggleHealth(key: keyof HealthSelection) {
    setHealth((prev) => {
      if (key === "general") {
        return {
          insulinResistance: false,
          diabetes: false,
          general: !prev.general,
        };
      }
      return {
        ...prev,
        general: false,
        [key]: !prev[key],
      };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (!compact) {
      if (!firstName.trim() || !lastName.trim() || !facebook.trim()) return;
      const hasHealth =
        health.insulinResistance || health.diabetes || health.general;
      if (!hasHealth) return;
    }
    if (!marketingConsent) return;
    setState("loading");
    const healthTags = compact ? [] : tagsFromHealthSelection(health);
    const tags = Array.from(new Set([...baseTags, ...healthTags]));
    const payload: SubscribeFormPayload = {
      email: email.trim(),
      first_name: compact ? undefined : firstName.trim() || undefined,
      last_name: compact ? undefined : lastName.trim() || undefined,
      name: compact ? null : fullNameFromParts(firstName, lastName),
      facebook_url: compact ? null : facebook.trim() || null,
      locale,
      source,
      tags,
      consent: true,
    };

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      mergeVisitorTags(tags);
      setState("done");
      onSuccess?.();
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
            : "bg-cream text-forest-600",
        )}
      >
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <p className="font-medium">{success}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.email}
            className={cn(inputClass, "sm:flex-1")}
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={state === "loading" || !marketingConsent}
            className={cn(
              "inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all disabled:opacity-60 sm:h-11 sm:w-auto",
              "bg-forest-500 text-white hover:bg-forest-600",
            )}
          >
            {state === "loading" ? t.loading : buttonLabel ?? t.submit}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-ink-soft">
          <input
            type="checkbox"
            required
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-forest-300 text-forest-500 focus:ring-forest-300"
          />
          <span>{consent}</span>
        </label>
        {state === "error" && (
          <p className="text-sm text-coral-600">{t.error}</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t.firstName}
          className={inputClass}
          autoComplete="given-name"
        />
        <input
          type="text"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t.lastName}
          className={inputClass}
          autoComplete="family-name"
        />
      </div>

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.email}
        className={inputClass}
        autoComplete="email"
      />

      <input
        type="url"
        required
        value={facebook}
        onChange={(e) => setFacebook(e.target.value)}
        placeholder={t.facebookPh}
        className={inputClass}
        aria-label={t.facebook}
      />

      <fieldset className="rounded-xl border border-forest-100 bg-cream/50 p-4">
        <legend
          className={cn(
            "px-1 text-sm font-semibold",
            variant === "gradient" ? "text-white" : "text-slate-800",
          )}
        >
          {t.healthTitle}
        </legend>
        <p
          className={cn(
            "mb-3 text-xs",
            variant === "gradient" ? "text-slate-300" : "text-ink-soft",
          )}
        >
          {t.healthHint}
        </p>
        <div className="space-y-2.5">
          {(
            [
              ["insulinResistance", t.ir],
              ["diabetes", t.diabetes],
              ["general", t.general],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                health[key]
                  ? "border-forest-400 bg-forest-500/10 text-slate-800"
                  : "border-forest-100 bg-white text-slate-700 hover:border-forest-200",
              )}
            >
              <input
                type="checkbox"
                checked={health[key]}
                onChange={() => toggleHealth(key)}
                className="mt-0.5 h-4 w-4 rounded border-forest-300 text-forest-500 focus:ring-forest-300"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 text-sm transition-colors",
          marketingConsent
            ? "border-forest-400 bg-forest-500/10 text-slate-800"
            : variant === "gradient"
              ? "border-white/25 bg-white/10 text-white hover:border-white/40"
              : "border-forest-100 bg-white text-slate-700 hover:border-forest-200",
        )}
      >
        <input
          type="checkbox"
          required
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-forest-300 text-forest-500 focus:ring-forest-300"
        />
        <span>{consent}</span>
      </label>

      <button
        type="submit"
        disabled={state === "loading" || !marketingConsent}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg font-bold transition-all disabled:opacity-60",
          variant === "gradient"
            ? "bg-white text-slate-800 hover:bg-cream"
            : "bg-forest-500 text-white hover:bg-forest-600",
        )}
      >
        {state === "loading" ? t.loading : buttonLabel ?? t.submit}
        <ArrowRight className="h-4 w-4" />
      </button>

      {state === "error" && (
        <p className="text-center text-sm text-coral-600">{t.error}</p>
      )}
    </form>
  );
}
