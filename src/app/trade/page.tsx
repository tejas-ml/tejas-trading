import { redirect } from "next/navigation";
import { TradeDesk, type Snapshot } from "@/components/TradeDesk";
import { getCurrentUser } from "@/lib/auth";
import { snapshot } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function TradePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const initial = await snapshot(user);
  if (!initial.me) redirect("/login");
  return <TradeDesk initial={initial as Snapshot} />;
}
