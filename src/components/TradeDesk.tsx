"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { PriceChart } from "@/components/PriceChart";
import { feeOn, formatCents, formatUsd } from "@/lib/money";
import { formatClock } from "@/lib/time";
import type { Side } from "@/lib/types";

export type Snapshot = {
  market: {
    id: string;
    date: string;
    question: string;
    status: "open" | "resolved";
    resolution: Side | null;
    index: number;
    openIndex: number;
    lastYesPrice: number;
    volumeContracts: number;
    closeAt: number;
    now: number;
  };
  book: {
    yes: { price: number; size: number }[];
    no: { price: number; size: number }[];
    bestYes: number | null;
    bestNo: number | null;
  };
  trades: { id: string; yesPriceCents: number; quantity: number; createdAt: number }[];
  ticks: { t: number; yesPrice: number; index: number }[];
  me: {
    email: string;
    balanceCents: number;
    reservedCents: number;
    position: {
      yesContracts: number;
      noContracts: number;
      yesSpentCents: number;
      noSpentCents: number;
    };
    orders: {
      id: string;
      side: Side;
      priceCents: number;
      quantity: number;
      filled: number;
      status: string;
      createdAt: number;
    }[];
  };
};

const PRESETS = [10, 25, 50, 100, 250, 500, 1000];

export function TradeDesk({ initial }: { initial?: Snapshot }) {
  const router = useRouter();
  const [data, setData] = useState<Snapshot | null>(initial ?? null);
  const [error, setError] = useState("");
  const [side, setSide] = useState<Side>("yes");
  const [price, setPrice] = useState(50);
  const [qty, setQty] = useState(10);
  const [ioc, setIoc] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fundsOpen, setFundsOpen] = useState(false);
  const [custom, setCustom] = useState("100");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const res = await fetch("/api/market", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not load market.");
    if (!json.me) {
      router.push("/login");
      return;
    }
    setData(json);
    setNow(json.market.now);
  }, [router]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
    const poll = setInterval(() => load().catch(() => undefined), 1800);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    if (!data) return;
    if (side === "yes" && data.book.bestYes) setPrice(data.book.bestYes);
    if (side === "no" && data.book.bestNo) setPrice(data.book.bestNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.market.id, side]);

  const stake = price * qty;
  const fee = feeOn(stake);
  const total = stake + fee;
  const remain = data ? Math.max(0, data.market.closeAt - now) : 0;

  const maxDepth = useMemo(() => {
    if (!data) return 1;
    return Math.max(
      1,
      ...data.book.yes.map((l) => l.size),
      ...data.book.no.map((l) => l.size),
    );
  }, [data]);

  async function place() {
    if (data && total > data.me.balanceCents) {
      setError("Not enough balance. Add paper funds to trade.");
      setFundsOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/market/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          side,
          priceCents: price,
          quantity: qty,
          tif: ioc ? "ioc" : "gtc",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Order failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(orderId: string) {
    await fetch("/api/market/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    await load();
  }

  async function addFunds(amount: number) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: amount * 100 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Deposit failed.");
      setFundsOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-mute">
        Opening the desk…
      </div>
    );
  }

  const last = data.market.lastYesPrice;
  const pos = data.me.position;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-[11px] uppercase tracking-[0.16em] text-mute2">
                {data.me.email}
              </div>
              <div className="font-mono text-sm text-green">
                {formatUsd(data.me.balanceCents)}
              </div>
            </div>
            <div className="font-mono text-green sm:hidden">
              {formatUsd(data.me.balanceCents)}
            </div>
            <button
              onClick={() => setFundsOpen(true)}
              className="rounded-full bg-green px-3 py-1.5 text-xs font-semibold text-bg hover:bg-green2"
            >
              Add funds
            </button>
            <button
              onClick={logout}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:text-ink"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-green">
              Daily market · {data.market.date}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
              {data.market.question}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-mute">
              The Tejas Index opened at {data.market.openIndex.toFixed(2)}. YES
              wins if it finishes at or above the open. NO wins otherwise. Each
              contract pays $1.00 to the winning side at the end of the day. A
              1% platform fee is taken on every fill.
            </p>
          </div>
          <div className="flex gap-3">
            <Stat label="YES" value={`${last}¢`} accent />
            <Stat label="Index" value={data.market.index.toFixed(2)} />
            <Stat
              label="Closes in"
              value={data.market.status === "open" ? formatClock(remain) : "Settled"}
            />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-green/25 bg-green/10 px-5 py-4">
          <div className="font-display text-xl text-white">
            Do you want to make a bet?
          </div>
          <p className="mt-1 text-sm text-mute">
            Pick YES or NO, choose a price in cents, and size the order. Resting
            bids sit on the book until they match a complementary order from
            another trader or a bot. This market closes at midnight Eastern.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-mute2">
              <span>YES price</span>
              <span>{last}¢ implied probability</span>
            </div>
            <div className="h-[280px]">
              <PriceChart points={data.ticks} last={last} />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide("yes")}
                className={`rounded-xl py-3 text-sm font-semibold ${
                  side === "yes" ? "bg-green text-bg" : "border border-line text-mute"
                }`}
              >
                Buy YES
              </button>
              <button
                onClick={() => setSide("no")}
                className={`rounded-xl py-3 text-sm font-semibold ${
                  side === "no" ? "bg-red text-white" : "border border-line text-mute"
                }`}
              >
                Buy NO
              </button>
            </div>

            <label className="mt-5 block text-xs uppercase tracking-[0.16em] text-mute2">
              Limit price
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl border border-line text-ink"
                  onClick={() => setPrice((p) => Math.max(1, p - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={price}
                  onChange={(e) => setPrice(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-3 text-center font-mono text-2xl text-white outline-none"
                />
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl border border-line text-ink"
                  onClick={() => setPrice((p) => Math.min(99, p + 1))}
                >
                  +
                </button>
              </div>
              <div className="mt-1 text-center font-mono text-green">{formatCents(price)}</div>
            </label>

            <label className="mt-4 block text-xs uppercase tracking-[0.16em] text-mute2">
              Contracts
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl border border-line text-ink"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={qty}
                  onChange={(e) => setQty(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-full rounded-xl border border-line bg-bg px-3 py-3 text-center font-mono text-2xl text-white outline-none"
                />
                <button
                  type="button"
                  className="h-10 w-10 rounded-xl border border-line text-ink"
                  onClick={() => setQty((q) => Math.min(500, q + 1))}
                >
                  +
                </button>
              </div>
            </label>

            <label className="mt-4 flex items-center gap-2 text-sm text-mute">
              <input
                type="checkbox"
                checked={ioc}
                onChange={(e) => setIoc(e.target.checked)}
                className="accent-green"
              />
              Fill immediately, cancel the rest
            </label>

            <div className="mt-4 space-y-1 rounded-xl bg-bg px-4 py-3 text-sm">
              <Row k="Cost" v={formatUsd(stake)} />
              <Row k="Platform fee 1%" v={formatUsd(fee)} />
              <Row k="Total" v={formatUsd(total)} strong />
              <Row
                k="If you win"
                v={formatUsd(qty * 100)}
              />
            </div>

            <button
              disabled={
                busy ||
                data.market.status !== "open" ||
                total > data.me.balanceCents
              }
              onClick={place}
              className={`mt-4 w-full rounded-full py-3 text-sm font-semibold disabled:opacity-50 ${
                side === "yes" ? "bg-green text-bg hover:bg-green2" : "bg-red text-white"
              }`}
            >
              {busy
                ? "Submitting…"
                : total > data.me.balanceCents
                  ? "Add funds to trade"
                  : `Place ${side.toUpperCase()} order`}
            </button>
            {data.me.reservedCents > 0 ? (
              <p className="mt-2 text-center text-xs text-mute2">
                {formatUsd(data.me.reservedCents)} reserved in open orders
              </p>
            ) : null}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Order book</h2>
            <span className="text-xs text-mute2">
              {data.market.volumeContracts.toLocaleString()} contracts traded · bots quoting live
            </span>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <BookColumn
              title="YES bids"
              rows={data.book.yes}
              max={maxDepth}
              tone="yes"
            />
            <BookColumn
              title="NO bids"
              rows={data.book.no}
              max={maxDepth}
              tone="no"
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl text-white">Your position</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PosCard label="YES contracts" value={pos.yesContracts} spent={pos.yesSpentCents} />
              <PosCard label="NO contracts" value={pos.noContracts} spent={pos.noSpentCents} />
            </div>
            <p className="mt-3 text-xs text-mute2">
              At close, the winning side is credited $1.00 per contract. Losing
              contracts expire worthless.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-xl text-white">Your orders</h2>
            <div className="mt-3 max-h-64 overflow-auto">
              {data.me.orders.length === 0 ? (
                <p className="text-sm text-mute">No orders yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-mute2">
                    <tr>
                      <th className="py-1">Side</th>
                      <th>Px</th>
                      <th>Qty</th>
                      <th>Fill</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.me.orders.map((o) => (
                      <tr key={o.id} className="border-t border-line/70">
                        <td className={`py-2 font-semibold ${o.side === "yes" ? "text-green" : "text-red"}`}>
                          {o.side.toUpperCase()}
                        </td>
                        <td className="font-mono">{o.priceCents}¢</td>
                        <td className="font-mono">{o.quantity}</td>
                        <td className="font-mono text-mute">
                          {o.filled}/{o.quantity} · {o.status}
                        </td>
                        <td className="text-right">
                          {o.status === "open" ? (
                            <button
                              onClick={() => cancel(o.id)}
                              className="text-xs text-mute hover:text-red"
                            >
                              Cancel
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {fundsOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6">
            <h2 className="font-display text-2xl text-white">Add paper funds</h2>
            <p className="mt-2 text-sm text-mute">
              Not real money. Pick an amount and it hits your balance instantly.
              Everyone starts at $0.00.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => addFunds(n)}
                  className="rounded-xl border border-line py-2 text-sm hover:border-green hover:text-green"
                >
                  ${n}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none"
                placeholder="Custom $"
              />
              <button
                onClick={() => addFunds(Number(custom || 0))}
                className="rounded-full bg-green px-4 text-sm font-semibold text-bg"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setFundsOpen(false)}
              className="mt-4 w-full text-sm text-mute hover:text-ink"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-[104px] rounded-xl border border-line bg-surface px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-mute2">{label}</div>
      <div className={`mt-1 font-mono text-lg ${accent ? "text-green" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-mute">{k}</span>
      <span className={strong ? "font-semibold text-white" : "font-mono"}>{v}</span>
    </div>
  );
}

function BookColumn({
  title,
  rows,
  max,
  tone,
}: {
  title: string;
  rows: { price: number; size: number }[];
  max: number;
  tone: "yes" | "no";
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs uppercase tracking-[0.16em] text-mute2">
        <span>{title}</span>
        <span>Size</span>
      </div>
      <div className="space-y-1">
        {rows.length === 0 ? (
          <div className="text-sm text-mute">Empty</div>
        ) : (
          rows.map((row) => (
            <div key={`${tone}-${row.price}`} className="relative overflow-hidden rounded-md">
              <div
                className={tone === "yes" ? "depth-bar absolute inset-y-0 left-0" : "depth-bar-no absolute inset-y-0 right-0"}
                style={{ width: `${(row.size / max) * 100}%` }}
              />
              <div className="relative flex justify-between px-3 py-1.5 font-mono text-sm">
                <span className={tone === "yes" ? "text-green" : "text-red"}>
                  {row.price}¢
                </span>
                <span className="text-ink">{row.size}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PosCard({
  label,
  value,
  spent,
}: {
  label: string;
  value: number;
  spent: number;
}) {
  return (
    <div className="rounded-xl bg-bg px-4 py-3">
      <div className="text-xs text-mute2">{label}</div>
      <div className="mt-1 font-mono text-2xl text-white">{value}</div>
      <div className="text-xs text-mute">spent {formatUsd(spent)}</div>
    </div>
  );
}
