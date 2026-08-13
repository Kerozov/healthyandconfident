"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackSitePageview } from "@/lib/analytics/client";

/** First-party pageviews for the public site. Mounted once in the locale layout. */
export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    trackSitePageview(pathname, window.location.search);
  }, [pathname]);

  return null;
}
