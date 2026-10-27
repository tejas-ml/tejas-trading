import { NextResponse } from "next/server";
import { requestLogin } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { COOKIE_MAGIC, COOKIE_PENDING } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string };
    const result = await requestLogin(body.email || "");
    const res = NextResponse.json({
      ok: true,
      email: result.email,
      delivered: result.delivered,
      code: result.delivered ? undefined : result.code,
    });
    const cookieBase = {
      httpOnly: true as const,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60,
    };
    res.cookies.set(COOKIE_PENDING, result.email, cookieBase);
    res.cookies.set(COOKIE_MAGIC, result.token, cookieBase);
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
