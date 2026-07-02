import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { resolvePendingTrackedWeatherEvents } from "@/lib/weather/weatherSettlementResolver";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getLimit(value: unknown) {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : 25;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 25;
}

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const summary = await resolvePendingTrackedWeatherEvents(user.uid, getLimit(body.limit));
    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), summary });
  } catch (error) {
    console.error("Resolve pending tracked weather events failed:", error);
    const message = error instanceof Error ? error.message : "Unknown resolve-pending error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
