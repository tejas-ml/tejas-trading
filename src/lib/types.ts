export type Side = "yes" | "no";
export type OrderStatus = "open" | "filled" | "cancelled";
export type MarketStatus = "open" | "resolved";
export type TimeInForce = "gtc" | "ioc";

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  balanceCents: number;
  reservedCents: number;
  isBot: boolean;
}

export interface MagicLink {
  id: string;
  email: string;
  tokenHash: string;
  code: string;
  expiresAt: number;
  usedAt?: number;
  createdAt: number;
}

export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}

export interface Market {
  id: string;
  date: string;
  question: string;
  status: MarketStatus;
  resolution?: Side;
  openIndex: number;
  index: number;
  lastYesPrice: number;
  volumeContracts: number;
  createdAt: number;
  resolvedAt?: number;
}

export interface Order {
  id: string;
  marketId: string;
  userId: string;
  side: Side;
  priceCents: number;
  quantity: number;
  filled: number;
  reservedCents: number;
  status: OrderStatus;
  isBot: boolean;
  createdAt: number;
}

export interface Trade {
  id: string;
  marketId: string;
  yesOrderId: string;
  noOrderId: string;
  yesUserId: string;
  noUserId: string;
  yesPriceCents: number;
  quantity: number;
  yesFeeCents: number;
  noFeeCents: number;
  createdAt: number;
}

export interface Position {
  userId: string;
  marketId: string;
  yesContracts: number;
  noContracts: number;
  yesSpentCents: number;
  noSpentCents: number;
}

export interface Tick {
  t: number;
  yesPrice: number;
  index: number;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  type: "deposit" | "reserve" | "release" | "trade" | "fee" | "settlement" | "refund";
  amountCents: number;
  note: string;
  createdAt: number;
}

export interface OutboxEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  createdAt: number;
  delivered: boolean;
  error?: string;
  code?: string;
  verifyUrl?: string;
}

export interface DB {
  users: User[];
  magicLinks: MagicLink[];
  sessions: Session[];
  markets: Market[];
  orders: Order[];
  trades: Trade[];
  positions: Position[];
  ticks: Tick[];
  ledger: LedgerEntry[];
  outbox: OutboxEmail[];
  meta: {
    lastBotTickAt: number;
    platformFeesCents: number;
  };
}

export const BOTS: { name: string; email: string }[] = [
  { name: "Atlas", email: "atlas@bots.local" },
  { name: "Vega", email: "vega@bots.local" },
  { name: "Nova", email: "nova@bots.local" },
  { name: "Drift", email: "drift@bots.local" },
  { name: "Helix", email: "helix@bots.local" },
  { name: "Pulse", email: "pulse@bots.local" },
];

export const MARKET_QUESTION = "Will the Tejas Index close up today?";
export const BOT_STARTING_BALANCE = 10_000_000;
export const SESSION_DAYS = 30;
export const MAGIC_TTL_MS = 15 * 60 * 1000;
export const FEE_RATE = 0.01;
export const COOKIE_SESSION = "tt_session";
export const COOKIE_PENDING = "tt_pending_email";
export const COOKIE_MAGIC = "tt_magic";
