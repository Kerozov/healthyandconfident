import { NextResponse, type NextRequest } from "next/server";

// Locale redirect only — Edge-safe, no external imports.
const LOCALES = ["bg", "en"];
const DEFAULT_LOCALE = "bg";

function hasLocale(pathname: string) {
  return LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip admin, API, Next internals, static files, SEO routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (!hasLocale(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
