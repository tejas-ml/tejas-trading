import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { getInbox } from "@/lib/email";
import { COOKIE_PENDING } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const jar = await cookies();
  const email = jar.get(COOKIE_PENDING)?.value || "";
  const messages = email ? await getInbox(email) : [];

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-5 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <Link href="/login/check" className="text-sm text-mute hover:text-ink">
          Back
        </Link>
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-green">Tejas Mail preview</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">Inbox</h1>
      <p className="mt-2 max-w-xl text-sm text-mute">
        If SMTP or Resend is not configured, login emails land here so you can
        still confirm. Configure <code className="text-green">RESEND_API_KEY</code> or
        SMTP in <code className="text-green">.env.local</code> to send for real.
      </p>

      <div className="mt-8 space-y-4">
        {!email ? (
          <p className="text-mute">Request a login link first.</p>
        ) : messages.length === 0 ? (
          <p className="text-mute">No messages for {email} yet.</p>
        ) : (
          messages.map((mail) => (
            <article
              key={mail.id}
              className="overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
                <div>
                  <div className="text-white">{mail.subject}</div>
                  <div className="text-xs text-mute2">to {mail.to}</div>
                </div>
                <div className="text-xs text-mute2">
                  {mail.delivered ? "Delivered" : "Preview only"}
                </div>
              </div>
              <div className="px-5 py-4 text-sm leading-relaxed text-mute">
                <p className="text-ink">Your confirmation code is</p>
                <p className="mt-2 font-mono text-3xl tracking-[0.3em] text-green">
                  {mail.code}
                </p>
                {mail.verifyUrl ? (
                  <Link
                    href={mail.verifyUrl}
                    className="mt-4 inline-flex rounded-full bg-green px-5 py-2 text-sm font-semibold text-bg"
                  >
                    Confirm and log in
                  </Link>
                ) : null}
                {mail.error ? (
                  <p className="mt-3 text-xs text-mute2">{mail.error}</p>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
