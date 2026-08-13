"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackSitePageview } from "@/lib/analytics/client";

/** First-party pageviews for the public site. Mounted once in the locale layout. */
export function SiteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackSitePageview(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  return null;
}
