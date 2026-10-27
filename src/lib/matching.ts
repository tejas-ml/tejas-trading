import { feeOn, reservationFor } from "./money";
import { uid } from "./store";
import type { DB, Market, Order, Side, TimeInForce, User } from "./types";

export class TradeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function remaining(order: Order): number {
  return order.quantity - order.filled;
}

function getUser(db: DB, id: string): User {
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new TradeError("User not found.");
  return user;
}

function getPosition(db: DB, userId: string, marketId: string) {
  let pos = db.positions.find((p) => p.userId === userId && p.marketId === marketId);
  if (!pos) {
    pos = {
      userId,
      marketId,
      yesContracts: 0,
      noContracts: 0,
      yesSpentCents: 0,
      noSpentCents: 0,
    };
    db.positions.push(pos);
  }
  return pos;
}

function applyFill(
  db: DB,
  order: Order,
  qty: number,
  actualStake: number,
  actualFee: number,
) {
  const user = getUser(db, order.userId);
  const reservedBefore = order.reservedCents;
  order.filled += qty;
  const left = remaining(order);
  if (left <= 0) order.status = "filled";
  const reservedAfter = left <= 0 ? 0 : reservationFor(order.priceCents, left);
  const reservedDelta = reservedBefore - reservedAfter;
  user.reservedCents = Math.max(0, user.reservedCents - reservedDelta);
  const refund = reservedDelta - (actualStake + actualFee);
  if (refund > 0) user.balanceCents += refund;
  order.reservedCents = reservedAfter;
  db.meta.platformFeesCents += actualFee;
}

function executeTrade(
  db: DB,
  market: Market,
  yesOrder: Order,
  noOrder: Order,
  qty: number,
  yesPrice: number,
) {
  const noPrice = 100 - yesPrice;
  const yesStake = yesPrice * qty;
  const noStake = noPrice * qty;
  const yesFee = feeOn(yesStake);
  const noFee = feeOn(noStake);

  applyFill(db, yesOrder, qty, yesStake, yesFee);
  applyFill(db, noOrder, qty, noStake, noFee);

  const yesPos = getPosition(db, yesOrder.userId, market.id);
  const noPos = getPosition(db, noOrder.userId, market.id);
  yesPos.yesContracts += qty;
  yesPos.yesSpentCents += yesStake;
  noPos.noContracts += qty;
  noPos.noSpentCents += noStake;

  market.lastYesPrice = yesPrice;
  market.volumeContracts += qty;

  db.trades.push({
    id: uid("trd"),
    marketId: market.id,
    yesOrderId: yesOrder.id,
    noOrderId: noOrder.id,
    yesUserId: yesOrder.userId,
    noUserId: noOrder.userId,
    yesPriceCents: yesPrice,
    quantity: qty,
    yesFeeCents: yesFee,
    noFeeCents: noFee,
    createdAt: Date.now(),
  });

  db.ticks.push({
    t: Date.now(),
    yesPrice,
    index: market.index,
  });
  if (db.ticks.length > 600) {
    db.ticks = db.ticks.slice(-400);
  }
}

export function placeOrder(
  db: DB,
  user: User,
  market: Market,
  opts: {
    side: Side;
    priceCents: number;
    quantity: number;
    tif?: TimeInForce;
  },
): Order {
  if (market.status !== "open") throw new TradeError("Market is closed.");
  const priceCents = Math.round(opts.priceCents);
  const quantity = Math.round(opts.quantity);
  if (priceCents < 1 || priceCents > 99) {
    throw new TradeError("Price must be between 1¢ and 99¢.");
  }
  if (quantity < 1 || quantity > 500) {
    throw new TradeError("Quantity must be between 1 and 500 contracts.");
  }

  const reserve = reservationFor(priceCents, quantity);
  const available = Math.max(0, Math.trunc(Number(user.balanceCents) || 0));
  if (!Number.isFinite(available) || available <= 0 || available < reserve) {
    throw new TradeError("Not enough balance. Add paper funds to trade.");
  }

  user.balanceCents = available - reserve;
  user.reservedCents = Math.max(0, Math.trunc(Number(user.reservedCents) || 0)) + reserve;

  const order: Order = {
    id: uid("ord"),
    marketId: market.id,
    userId: user.id,
    side: opts.side,
    priceCents,
    quantity,
    filled: 0,
    reservedCents: reserve,
    status: "open",
    isBot: user.isBot,
    createdAt: Date.now(),
  };
  db.orders.push(order);

  const candidates = db.orders
    .filter(
      (o) =>
        o.marketId === market.id &&
        o.status === "open" &&
        o.side !== order.side &&
        o.userId !== order.userId &&
        remaining(o) > 0 &&
        o.priceCents + order.priceCents >= 100,
    )
    .sort((a, b) => {
      const priceDiff = b.priceCents - a.priceCents;
      if (priceDiff !== 0) return priceDiff;
      return a.createdAt - b.createdAt;
    });

  for (const maker of candidates) {
    const left = remaining(order);
    if (left <= 0) break;
    const fill = Math.min(left, remaining(maker));
    if (fill <= 0) continue;
    const yesOrder = order.side === "yes" ? order : maker;
    const noOrder = order.side === "no" ? order : maker;
    const yesPrice =
      order.side === "yes" ? 100 - maker.priceCents : maker.priceCents;
    executeTrade(db, market, yesOrder, noOrder, fill, yesPrice);
  }

  if (opts.tif === "ioc" && remaining(order) > 0) {
    cancelOrder(db, user, order.id);
  }

  return order;
}

export function cancelOrder(db: DB, user: User, orderId: string): Order {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new TradeError("Order not found.");
  if (order.userId !== user.id && !user.isBot) {
    throw new TradeError("You can only cancel your own orders.");
  }
  if (order.status !== "open") throw new TradeError("Order is no longer open.");
  const leftover = order.reservedCents;
  order.status = "cancelled";
  order.reservedCents = 0;
  const owner = getUser(db, order.userId);
  owner.reservedCents = Math.max(0, owner.reservedCents - leftover);
  owner.balanceCents += leftover;
  return order;
}

export function cancelOpenForMarket(db: DB, marketId: string) {
  const open = db.orders.filter((o) => o.marketId === marketId && o.status === "open");
  for (const order of open) {
    const owner = getUser(db, order.userId);
    owner.reservedCents = Math.max(0, owner.reservedCents - order.reservedCents);
    owner.balanceCents += order.reservedCents;
    order.reservedCents = 0;
    order.status = "cancelled";
  }
}
