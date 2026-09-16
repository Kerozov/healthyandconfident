"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackSitePageview } from "@/lib/analytics/client";
import { isCtaPreviewPage } from "@/lib/site/cta-preview";

/** First-party pageviews for the public site. Mounted once in the locale layout. */
export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    // The admin looking at a button in the preview frame is not a visitor.
    if (isCtaPreviewPage()) return;
    trackSitePageview(pathname, window.location.search);
  }, [pathname]);

  return null;
}
