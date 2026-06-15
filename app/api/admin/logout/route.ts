import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/admin/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getAdminCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
