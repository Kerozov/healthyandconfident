import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, firstAllowedAdminPath, getAdminCookieName } from "@/lib/admin/auth";
import {
  getAdminSessionTtlSeconds,
  signAdminSessionToken,
  VIRTUAL_OWNER_SESSION_ID,
} from "@/lib/admin/session-cookie";
import type { AdminSession } from "@/lib/admin/auth";
import { createRateLimiter, requestIp } from "@/lib/util/rate-limit";

/** Brute-force brake: 10 attempts per address per 15 minutes. */
const rateLimited = createRateLimiter(10, 15 * 60_000);

function setSessionCookie(response: NextResponse, session: AdminSession) {
  const token = signAdminSessionToken(session.id ?? VIRTUAL_OWNER_SESSION_ID);
  if (!token) return;

  response.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getAdminSessionTtlSeconds(),
  });
}

/** Form login: POST { "username": "...", "password": "..." } */
export async function POST(request: NextRequest) {
  if (rateLimited(requestIp(request))) {
    return NextResponse.json(
      { error: "Твърде много опити. Изчакай 15 минути и опитай отново." },
      { status: 429 },
    );
  }

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
