import type { NextConfig } from "next";

/** Required by Zoom Apps for Home URL (https://developers.zoom.us/docs/zoom-apps/security/owasp/) */
const zoomOwaspHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://appssdk.zoom.us https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://www.youtube-nocookie.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
      "form-action 'self' https:",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: zoomOwaspHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/bg",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
