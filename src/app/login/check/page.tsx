"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";

function CheckForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [delivered, setDelivered] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tt_login");
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        email?: string;
        delivered?: boolean;
        code?: string;
      };
      if (saved.email && saved.email !== email) return;
      setDelivered(Boolean(saved.delivered));
      if (saved.code) setCode(saved.code);
    } catch {
      // ignore
    }
  }, [email]);

  const masked = useMemo(() => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 2)}•••@${domain}`;
  }, [email]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify.");
      sessionStorage.removeItem("tt_login");
      router.push("/trade");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify.");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-bg" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="glow-ring rounded-3xl border border-line bg-surface p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-green">Confirm email</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            {delivered ? "Check your inbox" : "Confirm your login"}
          </h1>
          {delivered ? (
            <p className="mt-2 text-sm leading-relaxed text-mute">
              We sent a login link to <span className="text-ink">{masked}</span>.
              Click it, or type the 6-digit code here.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-mute">
              No mail provider is configured, so nothing was sent to{" "}
              <span className="text-ink">{masked}</span>. Use the code below to
              get in — this also creates your account.
            </p>
          )}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm text-mute">
              Confirmation code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 font-mono text-2xl tracking-[0.4em] text-green outline-none ring-green/40 focus:ring-2"
              />
            </label>
            {error ? <p className="text-sm text-red">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-full bg-green py-3 text-sm font-semibold text-bg hover:bg-green2 disabled:opacity-60"
            >
              {busy ? "Confirming…" : "Confirm and log in"}
            </button>
          </form>
          <Link
            href="/login/inbox"
            className="mt-5 block text-center text-sm text-green hover:underline"
          >
            Open Tejas Mail preview
          </Link>
          <Link href="/login" className="mt-2 block text-center text-xs text-mute2">
            Use a different email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckPage() {
  return (
    <Suspense>
      <CheckForm />
    </Suspense>
  );
}
