import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, firstAllowedAdminPath, getAdminCookieName } from "@/lib/admin/auth";
import {
  getAdminSessionTtlSeconds,
  signAdminSessionToken,
} from "@/lib/admin/session-cookie";
import type { AdminSession } from "@/lib/admin/auth";

function setSessionCookie(response: NextResponse, session: AdminSession) {
  const token = session.id
    ? signAdminSessionToken(session.id)
    : process.env.ADMIN_SECRET?.trim();
  if (!token) return;

  response.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminSessionTtlSeconds(),
  });
}

/** One-click login link: /api/admin/login?secret=YOUR_ADMIN_SECRET */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret") ?? "";
  const response = NextResponse.redirect(new URL("/admin", request.url));

  const result = await authenticateAdmin({ username: "admin", password: secret });
  if (result.ok) {
    setSessionCookie(response, result.session);
  }

  return response;
}

/** Form login: POST { "username": "...", "password": "..." } */
export async function POST(request: NextRequest) {
  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = String(body.username || "");
    password = String(body.password || "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await authenticateAdmin({ username, password });
  if (!result.ok) {
    const status = result.message.includes("ADMIN_SECRET") ? 500 : 401;
    return NextResponse.json({ error: result.message }, { status });
  }

  const response = NextResponse.json({
    ok: true,
    redirect: firstAllowedAdminPath(result.session),
  });
  setSessionCookie(response, result.session);
  return response;
}
