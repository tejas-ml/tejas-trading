import { requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { submitCancel } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as { orderId?: string };
    if (!body.orderId) {
      return Response.json({ error: "Missing order." }, { status: 400 });
    }
    const result = await submitCancel(user.id, body.orderId);
    return Response.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
