import { AuthError } from "./auth";
import { TradeError } from "./matching";

export function jsonError(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof TradeError) {
    return Response.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
