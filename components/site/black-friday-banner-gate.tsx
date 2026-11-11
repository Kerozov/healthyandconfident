"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Hides the banner in the browser once the offers end. Statically cached pages
 * (home, blog) keep the layout HTML from before the deadline, so the server
 * check alone could leave the banner up after 30.11 23:59.
 */
export function BlackFridayBannerGate({
  deadline,
  children,
}: {
  deadline: string | null;
  children: ReactNode;
}) {
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    if (Number.isNaN(end)) return;
    const left = Math.max(0, end - Date.now());
    // setTimeout caps at ~24.8 days; longer waits are re-checked on next load.
    if (left > 2_147_000_000) return;
    const t = window.setTimeout(() => setEnded(true), left);
    return () => window.clearTimeout(t);
  }, [deadline]);
  return ended ? null : <>{children}</>;
}
