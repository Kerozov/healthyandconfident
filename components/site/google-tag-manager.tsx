/**
 * Google Tag Manager container for the public site (admin is not tracked).
 *
 * Rendered as plain server-side tags, exactly as Google ships the snippet:
 * the loader sits at the top of <head> so GTM starts before hydration, and the
 * <noscript> iframe sits right after <body> opens. Tags configured in GTM listen
 * for History Change to count client-side navigations. Hosts the container
 * loads must be allowed by the CSP in next.config.ts.
 */
export const GTM_ID = "GTM-KN6MC6K4";

const loader = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

export function GoogleTagManagerHead() {
  return <script id="gtm-loader" dangerouslySetInnerHTML={{ __html: loader }} />;
}

export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
