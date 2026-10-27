import { seedBook, tickBots } from "./bots";
import { clamp, formatUsd, randInt } from "./money";
import { cancelOpenForMarket, cancelOrder, placeOrder, TradeError } from "./matching";
import { uid, withDb } from "./store";
import { marketWindow, todayStamp } from "./time";
import {
  BOT_STARTING_BALANCE,
  MARKET_QUESTION,
  type DB,
  type Market,
  type Side,
  type TimeInForce,
  type User,
} from "./types";

function currentMarket(db: DB): Market | undefined {
  return db.markets
    .filter((m) => m.status === "open")
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

function seedHistory(market: Market, db: DB) {
  const { openAt } = marketWindow(market.date);
  const now = Date.now();
  let price = 50;
  let index = market.openIndex;
  const step = 4 * 60 * 1000;
  for (let t = openAt; t < now; t += step) {
    price = clamp(price + randInt(-2, 2), 12, 88);
    index = clamp(index + randInt(-8, 8), 9400, 10600);
    db.ticks.push({ t, yesPrice: price, index });
  }
  market.index = index;
  market.lastYesPrice = price;
  if (db.ticks.length > 600) db.ticks = db.ticks.slice(-400);
}

function resolveMarket(db: DB, market: Market) {
  if (market.status !== "open") return;
  const yesWins = market.index >= market.openIndex;
  const resolution: Side = yesWins ? "yes" : "no";
  market.status = "resolved";
  market.resolution = resolution;
  market.resolvedAt = Date.now();
  cancelOpenForMarket(db, market.id);

  for (const pos of db.positions.filter((p) => p.marketId === market.id)) {
    const contracts = yesWins ? pos.yesContracts : pos.noContracts;
    const payout = contracts * 100;
    if (payout <= 0) continue;
    const user = db.users.find((u) => u.id === pos.userId);
    if (!user) continue;
    user.balanceCents += payout;
    db.ledger.push({
      id: uid("led"),
      userId: user.id,
      type: "settlement",
      amountCents: payout,
      note: `Market ${market.date} resolved ${resolution.toUpperCase()}`,
      createdAt: Date.now(),
    });
  }

  for (const bot of db.users.filter((u) => u.isBot)) {
    bot.balanceCents = BOT_STARTING_BALANCE;
    bot.reservedCents = 0;
  }
}

function createMarket(db: DB, date: string): Market {
  const market: Market = {
    id: uid("mkt"),
    date,
    question: MARKET_QUESTION,
    status: "open",
    openIndex: 10000,
    index: 10000,
    lastYesPrice: 50,
    volumeContracts: 0,
    createdAt: Date.now(),
  };
  db.markets.push(market);
  db.ticks = [];
  seedHistory(market, db);
  const { closeAt } = marketWindow(date);
  seedBook(db, market, closeAt);
  return market;
}

export function ensureMarketState(db: DB): Market {
  const date = todayStamp();
  const { closeAt } = marketWindow(date);
  let market = currentMarket(db);

  if (market && market.date !== date) {
    resolveMarket(db, market);
    market = undefined;
  }

  if (market && Date.now() >= closeAt) {
    resolveMarket(db, market);
    market = undefined;
  }

  if (!market) {
    market = db.markets.find((m) => m.date === date);
    if (!market || market.status === "resolved") {
      market = createMarket(db, date);
    }
  }

  const now = Date.now();
  if (now - db.meta.lastBotTickAt > 1400 && market.status === "open") {
    tickBots(db, market, closeAt);
    db.meta.lastBotTickAt = now;
  }

  return market;
}

export async function snapshot(user: User | null) {
  return withDb((db) => {
    const market = ensureMarketState(db);
    const { openAt, closeAt } = marketWindow(market.date);
    const openOrders = db.orders.filter(
      (o) => o.marketId === market.id && o.status === "open",
    );

    const levels = (side: Side) => {
      const map = new Map<number, number>();
      for (const o of openOrders.filter((x) => x.side === side)) {
        map.set(o.priceCents, (map.get(o.priceCents) || 0) + (o.quantity - o.filled));
      }
      return [...map.entries()]
        .map(([price, size]) => ({ price, size }))
        .sort((a, b) => b.price - a.price)
        .slice(0, 10);
    };

    const yes = levels("yes");
    const no = levels("no");
    const bestYes = yes[0]?.price ?? null;
    const bestNo = no[0]?.price ?? null;
    const impliedAsk = bestNo != null ? 100 - bestNo : null;

    const trades = db.trades
      .filter((t) => t.marketId === market.id)
      .slice(-24)
      .reverse()
      .map((t) => ({
        id: t.id,
        yesPriceCents: t.yesPriceCents,
        quantity: t.quantity,
        createdAt: t.createdAt,
      }));

    const ticks = db.ticks.slice(-240);
    const pos = user
      ? db.positions.find((p) => p.userId === user.id && p.marketId === market.id)
      : null;
    const myOrders = user
      ? db.orders
          .filter((o) => o.userId === user.id && o.marketId === market.id)
          .slice(-30)
          .reverse()
          .map((o) => ({
            id: o.id,
            side: o.side,
            priceCents: o.priceCents,
            quantity: o.quantity,
            filled: o.filled,
            status: o.status,
            createdAt: o.createdAt,
          }))
      : [];

    const liveUser = user ? db.users.find((u) => u.id === user.id) : null;

    return {
      market: {
        id: market.id,
        date: market.date,
        question: market.question,
        status: market.status,
        resolution: market.resolution ?? null,
        index: market.index / 100,
        openIndex: market.openIndex / 100,
        lastYesPrice: market.lastYesPrice,
        volumeContracts: market.volumeContracts,
        openAt,
        closeAt,
        now: Date.now(),
      },
      book: { yes, no, bestYes, bestNo, impliedAsk },
      trades,
      ticks,
      platform: {
        feeRate: 0.01,
        feesCollected: db.meta.platformFeesCents,
      },
      me: liveUser
        ? {
            id: liveUser.id,
            email: liveUser.email,
            name: liveUser.name,
            balanceCents: liveUser.balanceCents,
            reservedCents: liveUser.reservedCents,
            position: pos
              ? {
                  yesContracts: pos.yesContracts,
                  noContracts: pos.noContracts,
                  yesSpentCents: pos.yesSpentCents,
                  noSpentCents: pos.noSpentCents,
                }
              : {
                  yesContracts: 0,
                  noContracts: 0,
                  yesSpentCents: 0,
                  noSpentCents: 0,
                },
            orders: myOrders,
          }
        : null,
    };
  });
}

export async function submitOrder(
  actor: { id: string; email: string; isBot?: boolean },
  body: {
    side: Side;
    priceCents: number;
    quantity: number;
    tif?: TimeInForce;
  },
) {
  if (actor.isBot) throw new TradeError("Account not found.");
  return withDb((db) => {
    const market = ensureMarketState(db);
    const user = db.users.find(
      (u) => !u.isBot && (u.id === actor.id || u.email === actor.email),
    );
    if (!user) throw new TradeError("Account not found.");
    const order = placeOrder(db, user, market, body);
    return {
      orderId: order.id,
      filled: order.filled,
      status: order.status,
      balanceCents: user.balanceCents,
    };
  });
}

export async function submitCancel(userId: string, orderId: string) {
  return withDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new TradeError("Account not found.");
    ensureMarketState(db);
    cancelOrder(db, user, orderId);
    return { ok: true, balanceCents: user.balanceCents };
  });
}

const DEPOSITS = new Set([1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1_000_000]);

export async function deposit(userId: string, amountCents: number) {
  const amount = Math.round(amountCents);
  if (amount < 100 || amount > 1_000_000) {
    throw new TradeError("Choose between $1 and $10,000 in paper funds.");
  }
  if (!DEPOSITS.has(amount) && (amount < 100 || amount % 100 !== 0)) {
    throw new TradeError("Use a whole-dollar amount.");
  }
  return withDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new TradeError("Account not found.");
    user.balanceCents += amount;
    db.ledger.push({
      id: uid("led"),
      userId,
      type: "deposit",
      amountCents: amount,
      note: `Paper deposit ${formatUsd(amount)}`,
      createdAt: Date.now(),
    });
    return { balanceCents: user.balanceCents };
  });
}
