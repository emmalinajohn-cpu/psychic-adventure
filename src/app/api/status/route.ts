import { lastCollection } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const at = await lastCollection();
  return Response.json({ lastCollection: at?.toISOString() ?? null });
}
