import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { deposit } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { amountCents?: number };
    const result = await deposit(user.id, Number(body.amountCents || 0));
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
