import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <nav className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            href="/trade"
            className="hidden text-sm text-mute hover:text-ink sm:inline"
          >
            Markets
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-green/40"
          >
            Log in
          </Link>
        </div>
      </nav>

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero.jpg"
            alt=""
            className="h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/75 to-bg" />
          <div className="grid-overlay absolute inset-0 opacity-70" />
        </div>

        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col justify-center px-5 pb-24 pt-10">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green/25 bg-green/10 px-3 py-1 text-xs font-medium text-green">
              <span className="h-1.5 w-1.5 rounded-full bg-green shadow-[0_0_12px_#00dd94]" />
              Daily yes / no market · 1% fee · paper funds
            </div>
            <h1 className="font-display text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
              Tejas Trading
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mute">
              One question a day. Buy YES or NO. The book is live, bots keep it
              moving, and the market settles at midnight — one side pays $1.00,
              the other pays nothing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-green px-6 py-3 text-sm font-semibold text-bg hover:bg-green2"
              >
                Start trading
              </Link>
              <a
                href="#how"
                className="rounded-full border border-line px-6 py-3 text-sm font-medium text-ink hover:border-green/40"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { k: "Today's market", v: "Tejas Index close up?" },
              { k: "Settlement", v: "End of day · YES or NO" },
              { k: "Starting balance", v: "$0.00 paper cash" },
            ].map((card) => (
              <div
                key={card.k}
                className="glow-ring rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-mute2">
                  {card.k}
                </div>
                <div className="mt-2 font-display text-xl text-white">{card.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Email in, account on",
              d: "No passwords. We email a login link. If you’re new, that same email creates your account.",
            },
            {
              t: "A real order book",
              d: "Bid YES or NO in cents. Complementary orders match, bots quote around the index, and you see every level.",
            },
            {
              t: "Midnight resolution",
              d: "If the Tejas Index finishes at or above the open, YES pays $1. Otherwise NO does. Platform keeps 1%.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <h3 className="font-display text-xl text-white">{f.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mute">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="relative overflow-hidden py-20">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/texture.jpg" alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/80 to-bg" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5">
          <p className="text-xs uppercase tracking-[0.22em] text-green">The desk</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-white">
            Do you want to make a bet?
          </h2>
          <p className="mt-4 max-w-2xl text-mute">
            Each contract is a $1 claim on today. You pick a price in cents,
            size it, and rest on the book — or lift the other side. Winners are
            paid at the close. This is paper trading, not real money.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              "Email a login link",
              "Add paper funds",
              "Buy YES or NO",
              "Collect at midnight",
            ].map((step, i) => (
              <li
                key={step}
                className="rounded-2xl border border-line bg-bg/70 p-5"
              >
                <div className="font-mono text-sm text-green">0{i + 1}</div>
                <div className="mt-2 text-white">{step}</div>
              </li>
            ))}
          </ol>
          <Link
            href="/login"
            className="mt-10 inline-flex rounded-full bg-green px-6 py-3 text-sm font-semibold text-bg hover:bg-green2"
          >
            Open an account
          </Link>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8 text-center text-xs text-mute2">
        Tejas Trading is a paper prediction market. Not affiliated with Kalshi.
        No real-money wagers.
      </footer>
    </div>
  );
}
