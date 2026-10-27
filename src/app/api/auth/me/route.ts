import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null });
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      balanceCents: user.balanceCents,
      reservedCents: user.reservedCents,
    },
  });
}
