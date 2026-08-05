"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { MetaPixelPublicConfig } from "@/lib/meta/types";
import { trackMetaPageView } from "@/lib/meta/client";

/**
 * Meta Pixel loader. `fbq('init')` runs in the inline script; PageView is fired
 * from the effect below so client-side navigations are counted exactly once.
 */
export function MetaPixel({ config }: { config: MetaPixelPublicConfig }) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!config.enabled || !config.trackPageView) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    // The script may still be loading on first paint; retry briefly.
    let attempts = 0;
    const fire = () => {
      if (typeof window !== "undefined" && window.__metaPixelReady) {
        trackMetaPageView();
        return;
      }
      if (attempts++ < 20) window.setTimeout(fire, 250);
    };
    fire();
  }, [pathname, config.enabled, config.trackPageView]);

  if (!config.enabled || !config.pixelId) return null;

  // `fbq('track', …)` reaches every initialised pixel, so an extra `init` is all
  // a second ad account needs to receive the exact same events.
  const allPixelIds = [config.pixelId, ...(config.extraPixelIds ?? [])];
  const initCalls = allPixelIds
    .map((id) => `fbq('init', ${JSON.stringify(id)});`)
    .join("\n");

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${initCalls}
window.__metaPixelReady = true;
        `}
      </Script>
      <noscript>
        {allPixelIds.map((id) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={id}
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`}
          />
        ))}
      </noscript>
    </>
  );
}
