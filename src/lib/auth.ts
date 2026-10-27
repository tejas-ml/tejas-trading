import { cookies } from "next/headers";
import { COOKIE_SESSION, SESSION_DAYS, type User } from "./types";
import { readDb, withDb } from "./store";
import { sendLoginEmail } from "./email";
import {
  codeMatches,
  issueMagic,
  issueSession,
  readMagic,
  readSession,
  userIdForEmail,
} from "./magic";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function publicAppUrl(): string {
  const explicit = process.env.APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(
    /^https?:\/\//,
    "",
  );
  if (production) return `https://${production}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function requestLogin(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) throw new AuthError("Enter a valid email address.");
  if (email.endsWith("@bots.local")) {
    throw new AuthError("That address is reserved.");
  }

  const { token, code } = issueMagic(email);
  const verifyUrl = `${publicAppUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  const mail = await sendLoginEmail({ to: email, code, verifyUrl });
  return {
    email,
    token,
    code,
    delivered: mail.delivered,
    previewId: mail.id,
  };
}

function guestUser(email: string): User {
  return {
    id: userIdForEmail(email),
    email,
    name: email.split("@")[0] || "Trader",
    createdAt: Date.now(),
    balanceCents: 0,
    reservedCents: 0,
    isBot: false,
  };
}

function upsertUser(db: import("./types").DB, email: string): User {
  let user = db.users.find((u) => u.email === email && !u.isBot);
  if (!user) {
    user = guestUser(email);
    db.users.push(user);
  }
  return user;
}

async function ensureUser(email: string): Promise<User> {
  try {
    return await withDb((db) => upsertUser(db, email));
  } catch (err) {
    console.error("ensureUser failed", err);
    return guestUser(email);
  }
}

export async function consumeMagicToken(token: string): Promise<User | null> {
  const magic = readMagic(token);
  if (!magic) return null;
  return ensureUser(magic.email);
}

export async function consumeMagicCode(
  emailRaw: string,
  codeRaw: string,
  magicToken?: string,
): Promise<User | null> {
  const email = normalizeEmail(emailRaw);
  const token = magicToken || "";
  const magic = token ? readMagic(token) : null;
  if (!magic || magic.email !== email) return null;
  if (!codeMatches(email, magic.exp, codeRaw)) return null;
  return ensureUser(email);
}

export async function createSession(user: User): Promise<string> {
  return issueSession(user.id, user.email, SESSION_DAYS);
}

export async function getUserBySessionToken(
  token: string | undefined,
): Promise<User | null> {
  if (!token) return null;
  const session = readSession(token);
  if (!session) return null;
  try {
    const existing = await readDb((db) =>
      db.users.find((u) => u.email === session.email && !u.isBot),
    );
    if (existing) return existing;
  } catch (err) {
    console.error("session lookup failed", err);
  }
  return ensureUser(session.email);
}

export async function destroySession(_token: string | undefined) {
  // JWT sessions are cleared by deleting the cookie.
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  return getUserBySessionToken(jar.get(COOKIE_SESSION)?.value);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Sign in to continue.", 401);
  return user;
}
