"use client";

import { useEffect, useState } from "react";
import { X, Gift } from "lucide-react";
import { mergeVisitorTags } from "@/lib/site/visitor-tags";
import type { Locale } from "@/i18n/config";

type PopupData = {
  enabled: boolean;
  title: string;
  message: string;
  cta_label: string;
  success_message: string;
  image_url: string | null;
  segment_tag: string;
  delay_seconds: number;
};

export function Popup({ locale }: { locale: Locale }) {
  const [data, setData] = useState<PopupData | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const storageKey = `hc_popup_${locale}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;

    let timer: ReturnType<typeof setTimeout>;
    fetch(`/api/popup?locale=${locale}`)
      .then((r) => r.json())
      .then((d: PopupData) => {
        if (!d?.enabled) return;
        setData(d);
        timer = setTimeout(() => setOpen(true), (d.delay_seconds || 6) * 1000);
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, [locale, storageKey]);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(storageKey, "dismissed");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          locale,
          source: "popup",
          tags: data?.segment_tag ? [data.segment_tag] : [],
        }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      localStorage.setItem(storageKey, "subscribed");
      if (data?.segment_tag) {
        mergeVisitorTags([data.segment_tag]);
      }
      setTimeout(() => setOpen(false), 2500);
    } catch {
      setState("error");
    }
  }

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-forest-900/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-fade-up relative w-full max-w-lg overflow-hidden rounded-3xl bg-cream-50 shadow-2xl">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-forest-800/5 text-forest-800 transition-colors hover:bg-forest-800/10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-green-700 px-7 py-6 text-white">
          <span className="eyebrow text-gold-400">
            <Gift className="h-4 w-4" /> {locale === "bg" ? "Подарък" : "Free gift"}
          </span>
          <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
            {data.title}
          </h3>
        </div>

        <div className="px-7 py-6">
          {state === "done" ? (
            <p className="py-6 text-center font-display text-xl text-green-700">
              {data.success_message}
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-green-800">{data.message}</p>
              <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={locale === "bg" ? "Твоят имейл" : "Your best email"}
                  className="h-12 rounded-full border border-green-100 bg-white px-5 text-sm text-forest-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-gold-400/50"
                />
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="h-12 rounded-full bg-gold-400 font-bold text-forest-900 transition-colors hover:bg-gold-500 disabled:opacity-60"
                >
                  {state === "loading"
                    ? "..."
                    : data.cta_label}
                </button>
                {state === "error" && (
                  <p className="text-center text-sm text-green-600">
                    {locale === "bg" ? "Нещо се обърка. Опитай пак." : "Something went wrong. Try again."}
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
