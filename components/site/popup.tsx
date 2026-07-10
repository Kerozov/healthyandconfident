"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/i18n/config";
import { useMenuPopup } from "@/components/site/menu-popup";

/** Auto-opens the menu signup popup after delay (admin config). */
export function Popup({ locale }: { locale: Locale }) {
  const { openMenuPopup } = useMenuPopup();
  const storageKey = `hc_popup_${locale}`;
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    if (scheduledRef.current) return;

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    fetch(`/api/popup?locale=${locale}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { enabled?: boolean; delay_seconds?: number }) => {
        if (!d?.enabled || localStorage.getItem(storageKey)) return;
        scheduledRef.current = true;
        timer = setTimeout(() => {
          if (localStorage.getItem(storageKey)) return;
          openMenuPopup("auto-popup");
        }, (d.delay_seconds || 6) * 1000);
      })
      .catch(() => {});

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [locale, storageKey, openMenuPopup]);

  return null;
}
