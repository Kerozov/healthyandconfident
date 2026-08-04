"use client";

import { useEffect, useRef } from "react";
import { trackMeta } from "@/lib/meta/client";

/**
 * Fires Meta `ViewContent` once per mounted page. Drop it on any landing page
 * that represents a sellable thing (program, guide, offer).
 */
export function MetaViewContent({
  contentIds,
  contentName,
  contentCategory,
  value,
  currency,
}: {
  contentIds: string[];
  contentName: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
}) {
  const fired = useRef(false);
  const key = `${contentIds.join(",")}|${contentName}`;

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // The pixel script loads after hydration — wait for it before tracking.
    let attempts = 0;
    const fire = () => {
      if (typeof window !== "undefined" && window.__metaPixelReady) {
        trackMeta("ViewContent", {
          contentIds,
          contentName,
          contentCategory,
          contentType: "product",
          value,
          currency,
        });
        return;
      }
      if (attempts++ < 20) window.setTimeout(fire, 250);
    };
    fire();
    // Content identity is stable for a mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
