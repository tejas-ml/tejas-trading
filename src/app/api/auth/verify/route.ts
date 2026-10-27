import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  consumeMagicCode,
  createSession,
  sessionCookieOptions,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { COOKIE_MAGIC, COOKIE_SESSION } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; code?: string };
    const jar = await cookies();
    const user = await consumeMagicCode(
      body.email || "",
      body.code || "",
      jar.get(COOKIE_MAGIC)?.value,
    );
    if (!user) {
      return Response.json(
        { error: "That code is invalid or expired." },
        { status: 400 },
      );
    }
    const token = await createSession(user);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_SESSION, token, sessionCookieOptions());
    return res;
  } catch (err) {
    return jsonError(err);
  }
}
