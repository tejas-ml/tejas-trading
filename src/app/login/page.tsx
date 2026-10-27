"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") === "invalid" ? "That login link is invalid or expired." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send email.");
      sessionStorage.setItem(
        "tt_login",
        JSON.stringify({
          email: data.email,
          delivered: Boolean(data.delivered),
          code: data.code || "",
        }),
      );
      router.push(`/login/check?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send email.");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="" className="h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-bg/80" />
      </div>
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <div className="glow-ring rounded-3xl border border-line bg-surface p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-green">Email sign on</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">Log in</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Sign up and log in are the same. Enter your email, we send a link,
            and we create the account if it does not exist yet.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm text-mute">
              Email
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink outline-none ring-green/40 placeholder:text-mute2 focus:ring-2"
              />
            </label>
            {error ? <p className="text-sm text-red">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-green py-3 text-sm font-semibold text-bg hover:bg-green2 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Email me a login link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
