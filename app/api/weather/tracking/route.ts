import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { listTrackedWeatherEvents, saveTrackedWeatherEvent } from "@/lib/data/trackedWeatherEventRepository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getLimit(value: string | null) {
  const parsed = value ? Number(value) : 100;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100;
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const events = await listTrackedWeatherEvents({
      uid: user.uid,
      stationId: url.searchParams.get("stationId"),
      eventFamily: url.searchParams.get("eventFamily"),
      status: url.searchParams.get("status"),
      limit: getLimit(url.searchParams.get("limit")),
    });

    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), events });
  } catch (error) {
    console.error("Tracked weather events request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown tracking request error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const stationId = toStringOrNull(body.stationId)?.toUpperCase() ?? "";
    const eventDate = toStringOrNull(body.eventDate) ?? "";
    const eventFamily = body.eventFamily === "hourly_temperature" ? "hourly_temperature" : "daily_high";

    if (!stationId || !eventDate) {
      return NextResponse.json({ error: "stationId and eventDate are required." }, { status: 400 });
    }

    const id = await saveTrackedWeatherEvent(user.uid, {
      stationId,
      stationName: toStringOrNull(body.stationName),
      eventDate,
      eventFamily,
      eventHourLocal: toNumber(body.eventHourLocal),
      eventTicker: toStringOrNull(body.eventTicker),
      seriesTicker: toStringOrNull(body.seriesTicker),
      positionTicker: toStringOrNull(body.positionTicker),
      marketCode: toStringOrNull(body.marketCode),
      candidateBucket: toStringOrNull(body.candidateBucket),
      candidateBucketCode: toStringOrNull(body.candidateBucketCode),
      marketTicker: toStringOrNull(body.marketTicker),
      sourceType: "manual_tracking",
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("Tracked weather event save failed:", error);
    const message = error instanceof Error ? error.message : "Unknown tracking save error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
