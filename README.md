# Tejas Trading

**Live demo:** [https://tejas-trading.vercel.app](https://tejas-trading.vercel.app)

A Kalshi-style paper prediction market: one daily yes-or-no question, a live limit order book, complementary YES/NO matching, market-making bots, and passwordless email login. No real money.

## Problem

Public prediction markets (Kalshi, Polymarket) settle binary contracts against an order book, but most tutorials stop at a static price chart. This app is a working paper-trading desk: it has to match orders, reserve cash plus fees, keep a book alive when no humans are quoting, and settle the day in a fixed timezone.

## Approach

- **One market per calendar day** in `America/New_York` (override with `MARKET_TZ`): *Will the Tejas Index close up today?* The index is a simulated random walk around 100.00. At midnight Eastern the market resolves YES if the index is at or above its open, otherwise NO (`src/lib/market.ts`, `src/lib/time.ts`).
- **Binary contracts.** YES and NO prices are integers from 1¢ to 99¢. A fill pairs a YES order and a NO order whose prices sum to at least 100¢. The YES trade price is taken from the resting order; the complementary side is `100 - that price`. The winning side pays **$1.00** at settlement; the losing side pays $0. Open orders are cancelled and reserved cash is released at resolve (`src/lib/matching.ts`).
- **Fees and risk controls.** A **1%** platform fee (`FEE_RATE = 0.01`) is charged on each side’s stake, with a 1¢ minimum. Cash equal to stake plus fee is reserved when an order is posted; leftover reserve is refunded after partial fills. Quantity is capped at 500 contracts. Time-in-force is GTC or IOC.
- **Bots.** Atlas, Vega, Nova, Drift, Helix, and Pulse quote around a fair value derived from how far the index has moved and how close the close is. They seed the book on market open, refresh about every 1.4 seconds, and can take liquidity with IOC orders (`src/lib/bots.ts`).
- **Accounts.** Passwordless email login: a magic link and a 6-digit code, valid for 15 minutes. New accounts are created on confirmation. Everyone starts at $0 and adds paper funds from the desk ($1–$10,000). Without extra config, login mail is stored in an in-app preview inbox. Optional [Resend](https://resend.com) delivery is configured via `.env.local`.
- **Persistence.** Local dev writes JSON under `data/`. On Vercel, state is stored in a private Blob (`src/lib/store.ts`). Region: `iad1` (`vercel.json`).

## Results

This repo is a product demo, not a backtest. There are no recorded fill-quality, latency, or PnL metrics in the tree, so none are reported here. The live site at the URL above is the intended demonstration.

## Stack

Next.js 16 (App Router, `next dev --webpack`), React 19, TypeScript, Tailwind CSS, a custom matching engine, file-backed JSON locally, and `@vercel/blob` in production.

## Run locally

Node 20+ is recommended.

```bash
npm install
npm run dev
```

If `npm install` fails (for example under WSL/OneDrive TLS), install with [Bun](https://bun.sh) instead (`bun install`) and still run `npm run dev`.

Open [http://localhost:3000](http://localhost:3000).

1. Click **Start trading** and enter your email.
2. Open **Tejas Mail preview** (or your real inbox if Resend is configured) and confirm.
3. Add paper funds, then buy YES or NO.

To send real login email, copy `.env.example` to `.env.local`:

```
APP_URL=http://localhost:3000
MARKET_TZ=America/New_York
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Tejas Trading <noreply@yourdomain.com>
```

`BLOB_READ_WRITE_TOKEN` is only needed when running against Vercel Blob; local dev uses the file store.

## License

MIT. See [LICENSE](./LICENSE).
