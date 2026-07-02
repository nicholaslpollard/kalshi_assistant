import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import {
  listWeatherResolvedResults,
  saveWeatherResolvedResult,
} from "@/lib/data/weatherHistoryRepository";
import { inferResolvedBucket } from "@/lib/weather/bucketUtils";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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
    const stationId = toStringOrNull(body.stationId)?.toUpperCase() ?? "";
    const eventDate = toStringOrNull(body.eventDate) ?? "";

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

    const resolvedHighF = toNumber(body.resolvedHighF);
    const resolvedTemperatureF = toNumber(body.resolvedTemperatureF);
    const resolvedBucket = inferResolvedBucket({
      eventFamily,
      resolvedBucket: body.resolvedBucket,
      resolvedHighF,
      resolvedTemperatureF,
      marketTicker: body.marketTicker,
    });

    if (eventFamily === "daily_high" && resolvedHighF === null && !resolvedBucket) {
      return NextResponse.json(
        { error: "For daily-high results, enter either resolvedHighF or resolvedBucket." },
        { status: 400 }
      );
    }

    if (
      eventFamily === "hourly_temperature" &&
      resolvedTemperatureF === null &&
      resolvedHighF === null &&
      !resolvedBucket
    ) {
      return NextResponse.json(
        {
          error:
            "For hourly-temperature results, enter resolvedTemperatureF, resolvedHighF, or resolvedBucket.",
        },
        { status: 400 }
      );
    }

    const id = await saveWeatherResolvedResult(user.uid, {
      stationId,
      stationName: toStringOrNull(body.stationName),
      eventDate,
      eventFamily,
      eventHourLocal: toNumber(body.eventHourLocal),
      resolvedHighF,
      resolvedTemperatureF,
      resolvedBucket,
      notes: toStringOrNull(body.notes),
    });

    return NextResponse.json({
      ok: true,
      id,
      resolvedBucket,
    });
  } catch (error) {
    console.error("Weather resolved-result save failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown resolved-result save error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

