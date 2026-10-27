import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { snapshot } from "@/lib/market";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const user = await getCurrentUser();
    const data = await snapshot(user);
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
