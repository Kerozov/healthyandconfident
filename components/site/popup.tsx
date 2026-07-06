"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/config";
import { useMenuPopup } from "@/components/site/menu-popup";

/** Auto-opens the menu signup popup after delay (admin config). */
export function Popup({ locale }: { locale: Locale }) {
  const { openMenuPopup } = useMenuPopup();
  const storageKey = `hc_popup_${locale}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;

    let timer: ReturnType<typeof setTimeout>;
    fetch(`/api/popup?locale=${locale}`)
      .then((r) => r.json())
      .then((d: { enabled?: boolean; delay_seconds?: number }) => {
        if (!d?.enabled) return;
        timer = setTimeout(
          () => openMenuPopup("auto-popup"),
          (d.delay_seconds || 6) * 1000,
        );
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, [locale, storageKey, openMenuPopup]);

  return null;
}
