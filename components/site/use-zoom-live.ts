"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { ZoomLivePublicState } from "@/lib/zoom/live-types";

const POLL_MS = 45_000;

export function useZoomLive(locale: Locale) {
  const [state, setState] = useState<ZoomLivePublicState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/zoom/live?locale=${locale}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ZoomLivePublicState;
      setState(data);
    } catch {
      // ignore network errors
    }
  }, [locale]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return state;
}
