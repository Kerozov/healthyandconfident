import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/admin/auth";

function setSessionCookie(response: NextResponse, secret: string) {
  response.cookies.set(getAdminCookieName(), secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/** One-click login link: /api/admin/login?secret=YOUR_ADMIN_SECRET */
export async function GET(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const secret = request.nextUrl.searchParams.get("secret");
  const response = NextResponse.redirect(new URL("/admin", request.url));

  if (adminSecret && secret === adminSecret) {
    setSessionCookie(response, adminSecret);
  }

  return response;
}

/** Form login: POST { "password": "..." } */
export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET is not configured" },
      { status: 500 },
    );
  }

  let password = "";
  try {
    const body = await request.json();
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (password !== adminSecret) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, adminSecret);
  return response;
}
