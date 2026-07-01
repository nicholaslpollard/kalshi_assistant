import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import {
  listWeatherResolvedResults,
  saveWeatherResolvedResult,
} from "@/lib/data/weatherHistoryRepository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getLimit(value: string | null) {
  const parsed = value ? Number(value) : 50;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 250) : 50;
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const stationId = url.searchParams.get("stationId");
    const eventFamilyParam = url.searchParams.get("eventFamily");
    const eventFamily =
      eventFamilyParam === "daily_high" || eventFamilyParam === "hourly_temperature"
        ? eventFamilyParam
        : null;

    const results = await listWeatherResolvedResults({
      uid: user.uid,
      stationId,
      eventFamily,
      limit: getLimit(url.searchParams.get("limit")),
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("Weather resolved-result list request failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown resolved-result history error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const stationId = typeof body.stationId === "string" ? body.stationId.trim() : "";
    const eventDate = typeof body.eventDate === "string" ? body.eventDate.trim() : "";

    if (!stationId || !eventDate) {
      return NextResponse.json(
        { error: "stationId and eventDate are required." },
        { status: 400 }
      );
    }

    const eventFamilyParam = body.eventFamily;
    const eventFamily =
      eventFamilyParam === "daily_high" || eventFamilyParam === "hourly_temperature"
        ? eventFamilyParam
        : "daily_high";

    const id = await saveWeatherResolvedResult(user.uid, {
      stationId,
      stationName: typeof body.stationName === "string" ? body.stationName : null,
      eventDate,
      eventFamily,
      eventHourLocal: toNumber(body.eventHourLocal),
      resolvedHighF: toNumber(body.resolvedHighF),
      resolvedTemperatureF: toNumber(body.resolvedTemperatureF),
      resolvedBucket: typeof body.resolvedBucket === "string" ? body.resolvedBucket : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return NextResponse.json({
      ok: true,
      id,
    });
  } catch (error) {
    console.error("Weather resolved-result save failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown resolved-result save error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
