import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { submitOrder } from "@/lib/market";
import type { Side, TimeInForce } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.isBot) {
      return Response.json({ error: "Account not found." }, { status: 401 });
    }
    const body = (await req.json()) as {
      side?: Side;
      priceCents?: number;
      quantity?: number;
      tif?: TimeInForce;
    };
    if (body.side !== "yes" && body.side !== "no") {
      return Response.json({ error: "Choose YES or NO." }, { status: 400 });
    }
    const result = await submitOrder(user, {
      side: body.side,
      priceCents: Number(body.priceCents),
      quantity: Number(body.quantity),
      tif: body.tif === "ioc" ? "ioc" : "gtc",
    });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
