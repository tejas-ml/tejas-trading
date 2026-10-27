import { uid, withDb } from "./store";
import type { OutboxEmail } from "./types";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function loginEmailContent(opts: {
  to: string;
  code: string;
  verifyUrl: string;
}) {
  const subject = "Your Tejas Trading login link";
  const text = [
    "Tejas Trading",
    "",
    "Click this link to log in (or create your account):",
    opts.verifyUrl,
    "",
    `Or enter this code: ${opts.code}`,
    "",
    "This link expires in 15 minutes. If you didn't request it, ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#050d0a;color:#e8f5ef;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050d0a;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#0c1a14;border:1px solid #1c3d32;border-radius:16px;padding:32px;">
        <tr><td>
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#00dd94;font-weight:700;">Tejas Trading</div>
          <h1 style="margin:16px 0 8px;font-size:24px;color:#e8f5ef;">Log in to your desk</h1>
          <p style="margin:0 0 24px;color:#8aa89a;line-height:1.55;">
            Use the button or the 6-digit code. If you don't have an account yet, this email creates one automatically.
          </p>
          <a href="${escapeHtml(opts.verifyUrl)}"
             style="display:inline-block;background:#00dd94;color:#050d0a;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">
            Confirm and log in
          </a>
          <p style="margin:28px 0 8px;color:#8aa89a;font-size:13px;">Or enter this code</p>
          <div style="font-size:32px;letter-spacing:0.28em;font-weight:700;color:#00dd94;">${escapeHtml(opts.code)}</div>
          <p style="margin:28px 0 0;color:#5c7a6c;font-size:12px;line-height:1.5;">
            Expires in 15 minutes. Sent to ${escapeHtml(opts.to)}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function deliver(email: OutboxEmail) {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.EMAIL_FROM || "Tejas Trading <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
    return;
  }

  throw new Error(
    "No email provider configured — open Tejas Mail preview to confirm.",
  );
}

export async function sendLoginEmail(opts: {
  to: string;
  code: string;
  verifyUrl: string;
}): Promise<OutboxEmail> {
  const content = loginEmailContent(opts);
  const record: OutboxEmail = {
    id: uid("mail"),
    to: opts.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    createdAt: Date.now(),
    delivered: false,
    code: opts.code,
    verifyUrl: opts.verifyUrl,
  };

  try {
    await deliver(record);
    record.delivered = true;
  } catch (err) {
    record.delivered = false;
    record.error = err instanceof Error ? err.message : "Email not sent";
  }

  try {
    await withDb((db) => {
      db.outbox.unshift(record);
      db.outbox = db.outbox.slice(0, 100);
    });
  } catch (err) {
    console.error("outbox save failed", err);
  }

  return record;
}

export async function getInbox(email: string): Promise<OutboxEmail[]> {
  const normalized = email.trim().toLowerCase();
  return withDb((db) =>
    db.outbox.filter((m) => m.to === normalized).slice(0, 20),
  );
}
