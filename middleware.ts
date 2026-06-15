import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "@/i18n/config";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const PUBLIC_FILE = /\.(.*)$/;
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function hasLocale(pathname: string) {
  return locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
}

function shouldSkip(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/sign-in") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    PUBLIC_FILE.test(pathname)
  );
}

function localeRedirect(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (shouldSkip(pathname)) return NextResponse.next();
  if (!hasLocale(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// When Clerk keys are present, protect /admin and run locale routing.
// Otherwise (e.g. before Clerk is configured), just run locale routing so the
// public site still works in development.
const handler = clerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      if (isAdminRoute(req)) {
        await auth.protect();
        return NextResponse.next();
      }
      return localeRedirect(req);
    })
  : (req: NextRequest) => localeRedirect(req);

export default handler;

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/", "/(api|trpc)(.*)"],
};
