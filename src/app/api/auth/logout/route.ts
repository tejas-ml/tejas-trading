import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth";
import { COOKIE_SESSION } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  await destroySession(jar.get(COOKIE_SESSION)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSION, "", { path: "/", maxAge: 0 });
  return res;
}
