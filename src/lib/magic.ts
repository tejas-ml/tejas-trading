import { createHmac, timingSafeEqual } from "crypto";
import { MAGIC_TTL_MS } from "./types";

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    "tejas-trading-dev-secret"
  );
}

function hmac(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type MagicPayload = { email: string; exp: number };

export function issueMagic(email: string) {
  const exp = Date.now() + MAGIC_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ email, exp } satisfies MagicPayload)).toString(
    "base64url",
  );
  const token = `${payload}.${hmac(payload)}`;
  const digest = createHmac("sha256", secret()).update(`${email}|${exp}`).digest("hex");
  const code = (parseInt(digest.slice(0, 8), 16) % 1_000_000).toString().padStart(6, "0");
  return { token, code, exp };
}

export function readMagic(token: string): MagicPayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(hmac(payload), sig)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as MagicPayload;
    if (!body?.email || typeof body.exp !== "number") return null;
    if (body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export function codeMatches(email: string, exp: number, code: string) {
  const digest = createHmac("sha256", secret()).update(`${email}|${exp}`).digest("hex");
  const expected = (parseInt(digest.slice(0, 8), 16) % 1_000_000).toString().padStart(6, "0");
  return safeEqual(expected, code.replace(/\s/g, ""));
}

export type SessionPayload = { userId: string; email: string; exp: number };

export function issueSession(userId: string, email: string, days = 30) {
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, email, exp } satisfies SessionPayload)).toString(
    "base64url",
  );
  return `${payload}.${hmac(payload)}`;
}

export function readSession(token: string): SessionPayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(hmac(payload), sig)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    if (!body?.email || !body.userId || body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

export function userIdForEmail(email: string) {
  return `usr_${createHmac("sha256", "tejas-user-id").update(email).digest("hex").slice(0, 16)}`;
}
