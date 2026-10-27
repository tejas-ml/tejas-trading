# Tejas Trading

**GitHub:** [https://github.com/tejas-ml/tejas-trading](https://github.com/tejas-ml/tejas-trading)  
**Live:** [https://tejas-trading.vercel.app](https://tejas-trading.vercel.app)

A Kalshi-style paper prediction market. One daily yes-or-no question, a live order book, bot liquidity, and passwordless email login.

## How it works

- **Email sign-on only.** Enter an email. We send a login link and a 6-digit code. If the account does not exist, it is created when you confirm.
- **Everyone starts at $0.** Add paper funds from the desk — not real money.
- **One market per day:** *Will the Tejas Index close up today?*
- **YES and NO contracts** cost 1–99¢. The winning side pays **$1.00** at midnight Eastern. The losing side pays $0.
- **1% platform fee** on every fill.
- **Bots** (Atlas, Vega, Nova, Drift, Helix, Pulse) quote the book so it stays alive.

## Run it

```bash
npm install
npm run dev
```

If `npm install` fails under WSL/OneDrive TLS, install with [Bun](https://bun.sh) instead (`bun install`) and run `npm run dev`.

Open [http://localhost:3000](http://localhost:3000) for local dev.

1. Click **Start trading** and enter your email.
2. Open **Tejas Mail preview** (or your real inbox if Resend is configured) and confirm.
3. Add paper funds, then buy YES or NO.

## Real email delivery

Without extra config, login emails are stored in the in-app preview inbox so you can still confirm.

To actually send mail, copy `.env.example` to `.env.local` and set a [Resend](https://resend.com) API key:

```
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Tejas Trading <noreply@yourdomain.com>
APP_URL=http://localhost:3000
```

## Stack

Next.js App Router, TypeScript, Tailwind CSS, file-backed JSON store, custom matching engine.
