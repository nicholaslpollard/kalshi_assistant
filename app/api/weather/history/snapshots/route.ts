import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { listWeatherForecastSnapshots } from "@/lib/data/weatherHistoryRepository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getLimit(value: string | null) {
  const parsed = value ? Number(value) : 25;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 25;
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const stationId = url.searchParams.get("stationId");
    const eventDate = url.searchParams.get("eventDate");
    const eventFamilyParam = url.searchParams.get("eventFamily");
    const eventFamily =
      eventFamilyParam === "daily_high" || eventFamilyParam === "hourly_temperature"
        ? eventFamilyParam
        : null;

    const snapshots = await listWeatherForecastSnapshots({
      uid: user.uid,
      stationId,
      eventDate,
      eventFamily,
      limit: getLimit(url.searchParams.get("limit")),
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      snapshots,
    });
  } catch (error) {
    console.error("Weather snapshot history request failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown weather history error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
