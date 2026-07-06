"use client";

import { useEffect, useState } from "react";
import { X, Gift } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { SubscribeForm } from "@/components/site/subscribe-form";

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
  const [done, setDone] = useState(false);

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

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-forest-900/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-fade-up relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-cream-50 shadow-2xl">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-forest-800/5 text-forest-800 transition-colors hover:bg-forest-800/10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-slate-800 px-7 py-6 text-white">
          <span className="eyebrow text-gold-400">
            <Gift className="h-4 w-4" /> {locale === "bg" ? "Подарък" : "Free gift"}
          </span>
          <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
            {data.title}
          </h3>
        </div>

        <div className="px-7 py-6">
          {done ? (
            <p className="py-6 text-center font-display text-xl text-forest-600">
              {data.success_message}
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink-soft">{data.message}</p>
              <div className="mt-5">
                <SubscribeForm
                  locale={locale}
                  source="popup"
                  baseTags={data.segment_tag ? [data.segment_tag] : []}
                  consent={
                    locale === "bg"
                      ? "Съгласявам се да получавам маркетингови имейли със съвети, оферти и полезно съдържание. Можеш да се отпишеш по всяко време."
                      : "I agree to receive marketing emails with tips, offers and helpful content. You can unsubscribe at any time."
                  }
                  success={data.success_message}
                  buttonLabel={data.cta_label}
                  onSuccess={() => {
                    setDone(true);
                    localStorage.setItem(storageKey, "subscribed");
                    setTimeout(() => setOpen(false), 2500);
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
