import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getWeatherBiasSummary } from "@/lib/data/weatherHistoryRepository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getLimit(value: string | null) {
  const parsed = value ? Number(value) : 250;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 250;
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const eventFamilyParam = url.searchParams.get("eventFamily");
    const eventFamily =
      eventFamilyParam === "daily_high" || eventFamilyParam === "hourly_temperature"
        ? eventFamilyParam
        : null;

    const summary = await getWeatherBiasSummary({
      uid: user.uid,
      stationId: url.searchParams.get("stationId"),
      eventFamily,
      limit: getLimit(url.searchParams.get("limit")),
    });

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error("Weather bias summary request failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown weather bias error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
