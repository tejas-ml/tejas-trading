import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { BOTS, BOT_STARTING_BALANCE, type DB, type User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const BLOB_PATH = "tejas-trading/db.json";

function useBlob() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.VERCEL && process.env.BLOB_STORE_ID),
  );
}

function emptyDb(): DB {
  const now = Date.now();
  const users: User[] = BOTS.map((bot) => ({
    id: `bot_${bot.name.toLowerCase()}`,
    email: bot.email,
    name: bot.name,
    createdAt: now,
    balanceCents: BOT_STARTING_BALANCE,
    reservedCents: 0,
    isBot: true,
  }));
  return {
    users,
    magicLinks: [],
    sessions: [],
    markets: [],
    orders: [],
    trades: [],
    positions: [],
    ticks: [],
    ledger: [],
    outbox: [],
    meta: { lastBotTickAt: 0, platformFeesCents: 0 },
  };
}

let fileCache: DB | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function loadFromBlob(): Promise<{ db: DB; etag?: string } | null> {
  const { get } = await import("@vercel/blob");
  const result = await get(BLOB_PATH, { access: "private", useCache: false });
  if (!result?.stream) return null;
  const text = await new Response(result.stream).text();
  if (!text) return null;
  return {
    db: JSON.parse(text) as DB,
    etag: result.statusCode === 200 ? result.blob.etag : undefined,
  };
}

async function persistBlob(db: DB) {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, JSON.stringify(db), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    contentType: "application/json",
  });
}

function loadFromFile(): DB {
  if (fileCache) return fileCache;
  try {
    if (existsSync(DATA_FILE)) {
      fileCache = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DB;
      return fileCache;
    }
  } catch {
    // corrupt file — start clean
  }
  fileCache = emptyDb();
  persistFile(fileCache);
  return fileCache;
}

function persistFile(db: DB) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db), "utf8");
}

export function readDb<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    if (!useBlob()) return fn(loadFromFile());
    try {
      const loaded = (await loadFromBlob()) ?? { db: emptyDb() };
      return fn(loaded.db);
    } catch (err) {
      console.error("blob load failed", err);
      return fn(emptyDb());
    }
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function withDb<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    if (!useBlob()) {
      const db = loadFromFile();
      const result = await fn(db);
      persistFile(db);
      return result;
    }

    let loaded: { db: DB; etag?: string };
    try {
      loaded = (await loadFromBlob()) ?? { db: emptyDb() };
    } catch (err) {
      console.error("blob load failed", err);
      loaded = { db: emptyDb() };
    }
    const result = await fn(loaded.db);
    await persistBlob(loaded.db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
