import { clamp, pick, randInt } from "./money";
import { cancelOrder, placeOrder } from "./matching";
import { BOT_STARTING_BALANCE, type DB, type Market, type User } from "./types";

function fairValue(market: Market, closeAt: number): number {
  const now = Date.now();
  const tte = Math.max(0, closeAt - now);
  const day = 24 * 60 * 60 * 1000;
  const edge = (market.index - market.openIndex) / 12;
  let fv = 50 + edge;
  if (tte < day * 0.08) {
    fv = market.index >= market.openIndex ? 88 + randInt(0, 6) : 12 - randInt(0, 6);
  }
  return clamp(Math.round(fv), 8, 92);
}

function walkIndex(market: Market) {
  market.index = clamp(market.index + randInt(-10, 10), 9200, 10800);
}

export function tickBots(db: DB, market: Market, closeAt: number) {
  if (market.status !== "open") return;
  walkIndex(market);

  const fv = fairValue(market, closeAt);
  const bots = db.users.filter((u) => u.isBot);

  for (const bot of bots) {
    if (bot.balanceCents + bot.reservedCents < 100_000) {
      bot.balanceCents = BOT_STARTING_BALANCE;
      bot.reservedCents = 0;
    }
  }

  const acting = pick(bots);
  maybeCancel(db, acting, market.id);

  const spread = randInt(1, 4);
  const noise = randInt(-2, 2);

  tryPlace(db, acting, market, "yes", clamp(fv - spread + noise, 1, 99), randInt(5, 40));
  tryPlace(db, acting, market, "no", clamp(100 - fv - spread - noise, 1, 99), randInt(5, 40));

  if (Math.random() < 0.28) {
    const aggressor = pick(bots);
    const side = Math.random() < 0.5 ? "yes" : "no";
    const px =
      side === "yes"
        ? clamp(fv + randInt(1, 5), 1, 99)
        : clamp(100 - fv + randInt(1, 5), 1, 99);
    tryPlace(db, aggressor, market, side, px, randInt(2, 16), true);
  }

  if (Math.random() < 0.35) {
    db.ticks.push({
      t: Date.now(),
      yesPrice: market.lastYesPrice || fv,
      index: market.index,
    });
    if (db.ticks.length > 600) db.ticks = db.ticks.slice(-400);
  }
}

function maybeCancel(db: DB, bot: User, marketId: string) {
  const open = db.orders.filter(
    (o) => o.userId === bot.id && o.marketId === marketId && o.status === "open",
  );
  if (open.length <= 2) return;
  const extra = open.slice(0, open.length - 2);
  for (const order of extra) {
    if (Math.random() < 0.7) {
      try {
        cancelOrder(db, bot, order.id);
      } catch {
        // ignore
      }
    }
  }
}

function tryPlace(
  db: DB,
  bot: User,
  market: Market,
  side: "yes" | "no",
  priceCents: number,
  quantity: number,
  ioc = false,
) {
  try {
    placeOrder(db, bot, market, {
      side,
      priceCents,
      quantity,
      tif: ioc ? "ioc" : "gtc",
    });
  } catch {
    // bots skip failed quotes
  }
}

export function seedBook(db: DB, market: Market, closeAt: number) {
  for (let i = 0; i < 18; i++) tickBots(db, market, closeAt);
}
