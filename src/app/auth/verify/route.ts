import { NextRequest, NextResponse } from "next/server";
import {
  consumeMagicToken,
  createSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { COOKIE_SESSION } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const user = token ? await consumeMagicToken(token) : null;
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }
  const session = await createSession(user);
  const res = NextResponse.redirect(new URL("/trade", req.url));
  res.cookies.set(COOKIE_SESSION, session, sessionCookieOptions());
  return res;
}
