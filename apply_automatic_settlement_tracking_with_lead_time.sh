#!/usr/bin/env bash
set -euo pipefail

mkdir -p types lib/data lib/weather app/api/weather/tracking/resolve-pending app/api/weather/tracking components/history

cat > 'types/trackedWeatherEvent.ts' <<'EOF_types_trackedWeatherEvent_ts'
import type { WeatherHistoryFamily } from "@/types/weatherHistory";

export type TrackedWeatherEventStatus = "tracking" | "resolved" | "needs_review" | "error";

export type TrackedWeatherEventInput = {
  sourceSnapshotId?: string | null;
  sourceType?: string | null;
  eventTicker?: string | null;
  seriesTicker?: string | null;
  positionTicker?: string | null;
  marketCode?: string | null;
  stationId: string;
  stationName?: string | null;
  eventDate: string;
  eventFamily?: WeatherHistoryFamily | null;
  eventHourLocal?: number | null;
  candidateBucket?: string | null;
  candidateBucketCode?: string | null;
  marketTicker?: string | null;
};

export type TrackedWeatherEventDocument = {
  id?: string;
  createdAt: unknown;
  updatedAt: unknown;
  lastCheckedAt: unknown | null;
  resolvedAt: unknown | null;
  sourceSnapshotIds: string[];
  sourceTypes: string[];
  eventTicker: string | null;
  seriesTicker: string | null;
  positionTicker: string | null;
  marketCode: string | null;
  stationId: string;
  stationName: string | null;
  eventDate: string;
  eventFamily: WeatherHistoryFamily;
  eventHourLocal: number | null;
  candidateBucket: string | null;
  candidateBucketCode: string | null;
  marketTicker: string | null;
  status: TrackedWeatherEventStatus;
  actualHighF: number | null;
  actualTemperatureF: number | null;
  resolvedBucket: string | null;
  resolvedBucketCode: string | null;
  observationCount: number;
  resolverNotes: string[];
  errorMessage: string | null;
};

export type TrackedWeatherResolveSummary = {
  checked: number;
  resolved: number;
  needsReview: number;
  errors: number;
  skipped: number;
  results: Array<{
    id: string;
    status: TrackedWeatherEventStatus;
    stationId: string;
    eventDate: string;
    eventFamily: WeatherHistoryFamily;
    resolvedBucket: string | null;
    actualHighF: number | null;
    actualTemperatureF: number | null;
    notes: string[];
    errorMessage?: string | null;
  }>;
};
EOF_types_trackedWeatherEvent_ts

cat > 'lib/data/trackedWeatherEventRepository.ts' <<'EOF_lib_data_trackedWeatherEventRepository_ts'
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { WeatherForecastSnapshotDocument, WeatherResolvedResultInput } from "@/types/weatherHistory";
import type {
  TrackedWeatherEventDocument,
  TrackedWeatherEventInput,
  TrackedWeatherEventStatus,
} from "@/types/trackedWeatherEvent";

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function cleanForFirestore<T>(value: T): T {
  if (value === undefined) return null as T;
  if (Array.isArray(value)) return value.map((item) => cleanForFirestore(item)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      cleaned[key] = item === undefined ? null : cleanForFirestore(item);
    }
    return cleaned as T;
  }
  return value;
}

function getTrackingEventId(input: Pick<TrackedWeatherEventInput, "stationId" | "eventDate" | "eventFamily" | "eventHourLocal">) {
  const family = input.eventFamily ?? "daily_high";
  const hour = input.eventHourLocal === null || input.eventHourLocal === undefined ? "day" : String(input.eventHourLocal).padStart(2, "0");
  return `${input.stationId}_${input.eventDate}_${family}_${hour}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

function collection(uid: string) {
  return adminDb.collection("users").doc(uid).collection("trackedWeatherEvents");
}

export async function saveTrackedWeatherEvent(uid: string, input: TrackedWeatherEventInput) {
  const stationId = input.stationId.trim().toUpperCase();
  const eventDate = input.eventDate.trim();
  const eventFamily = input.eventFamily ?? "daily_high";
  const eventHourLocal = normalizeNumber(input.eventHourLocal);

  if (!stationId || !eventDate) {
    return null;
  }

  const id = getTrackingEventId({ stationId, eventDate, eventFamily, eventHourLocal });
  const existing = await collection(uid).doc(id).get();
  const existingData = existing.exists ? (existing.data() as Partial<TrackedWeatherEventDocument>) : null;
  const sourceSnapshotId = normalizeString(input.sourceSnapshotId);
  const sourceType = normalizeString(input.sourceType);
  const existingSnapshotIds = Array.isArray(existingData?.sourceSnapshotIds) ? existingData.sourceSnapshotIds.filter((value): value is string => typeof value === "string") : [];
  const existingSourceTypes = Array.isArray(existingData?.sourceTypes) ? existingData.sourceTypes.filter((value): value is string => typeof value === "string") : [];

  const sourceSnapshotIds = sourceSnapshotId && !existingSnapshotIds.includes(sourceSnapshotId)
    ? [...existingSnapshotIds, sourceSnapshotId]
    : existingSnapshotIds;
  const sourceTypes = sourceType && !existingSourceTypes.includes(sourceType)
    ? [...existingSourceTypes, sourceType]
    : existingSourceTypes;

  const currentStatus = existingData?.status;
  const status: TrackedWeatherEventStatus = currentStatus === "resolved" ? "resolved" : "tracking";

  await collection(uid).doc(id).set(cleanForFirestore({
    createdAt: existingData?.createdAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastCheckedAt: existingData?.lastCheckedAt ?? null,
    resolvedAt: existingData?.resolvedAt ?? null,
    sourceSnapshotIds,
    sourceTypes,
    eventTicker: input.eventTicker ?? existingData?.eventTicker ?? null,
    seriesTicker: input.seriesTicker ?? existingData?.seriesTicker ?? null,
    positionTicker: input.positionTicker ?? existingData?.positionTicker ?? null,
    marketCode: input.marketCode ?? existingData?.marketCode ?? null,
    stationId,
    stationName: input.stationName ?? existingData?.stationName ?? null,
    eventDate,
    eventFamily,
    eventHourLocal,
    candidateBucket: input.candidateBucket ?? existingData?.candidateBucket ?? null,
    candidateBucketCode: input.candidateBucketCode ?? existingData?.candidateBucketCode ?? null,
    marketTicker: input.marketTicker ?? existingData?.marketTicker ?? null,
    status,
    actualHighF: existingData?.actualHighF ?? null,
    actualTemperatureF: existingData?.actualTemperatureF ?? null,
    resolvedBucket: existingData?.resolvedBucket ?? null,
    resolvedBucketCode: existingData?.resolvedBucketCode ?? null,
    observationCount: existingData?.observationCount ?? 0,
    resolverNotes: existingData?.resolverNotes ?? [],
    errorMessage: existingData?.errorMessage ?? null,
  }), { merge: true });

  return id;
}

export async function saveTrackedWeatherEventFromSnapshot(uid: string, input: {
  snapshotId: string;
  snapshot: Omit<WeatherForecastSnapshotDocument, "id">;
}) {
  const snapshot = input.snapshot;

  if (!snapshot.stationId || !snapshot.eventDate) {
    return null;
  }

  const topBucket = snapshot.bucketProbabilities?.[0]?.bucket ?? null;

  return saveTrackedWeatherEvent(uid, {
    sourceSnapshotId: input.snapshotId,
    sourceType: snapshot.sourceType,
    eventTicker: snapshot.eventTicker,
    seriesTicker: snapshot.seriesTicker,
    positionTicker: snapshot.positionTicker,
    marketCode: snapshot.marketCode,
    stationId: snapshot.stationId,
    stationName: snapshot.stationName,
    eventDate: snapshot.eventDate,
    eventFamily: snapshot.eventFamily ?? "daily_high",
    eventHourLocal: snapshot.eventHourLocal,
    candidateBucket: topBucket,
    candidateBucketCode: null,
    marketTicker: snapshot.positionTicker ?? snapshot.eventTicker,
  });
}

export async function listTrackedWeatherEvents(params: {
  uid: string;
  stationId?: string | null;
  eventFamily?: string | null;
  status?: string | null;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = collection(params.uid);

  if (params.stationId) query = query.where("stationId", "==", params.stationId.toUpperCase());
  if (params.eventFamily === "daily_high" || params.eventFamily === "hourly_temperature") query = query.where("eventFamily", "==", params.eventFamily);
  if (params.status === "tracking" || params.status === "resolved" || params.status === "needs_review" || params.status === "error") query = query.where("status", "==", params.status);

  const snapshot = await query.orderBy("eventDate", "desc").limit(Math.min(Math.max(params.limit ?? 100, 1), 500)).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<TrackedWeatherEventDocument, "id">) }));
}

export async function listPendingTrackedWeatherEvents(params: { uid: string; limit?: number }) {
  const snapshot = await collection(params.uid)
    .where("status", "in", ["tracking", "needs_review", "error"])
    .orderBy("eventDate", "asc")
    .limit(Math.min(Math.max(params.limit ?? 50, 1), 200))
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<TrackedWeatherEventDocument, "id">) }));
}

export async function updateTrackedWeatherEventResolution(uid: string, id: string, patch: Partial<TrackedWeatherEventDocument>) {
  await collection(uid).doc(id).set(cleanForFirestore({
    ...patch,
    updatedAt: FieldValue.serverTimestamp(),
    lastCheckedAt: FieldValue.serverTimestamp(),
    resolvedAt: patch.status === "resolved" ? FieldValue.serverTimestamp() : patch.resolvedAt ?? null,
  }), { merge: true });
}

export function resolvedResultInputFromTrackedEvent(event: TrackedWeatherEventDocument & { id?: string }): WeatherResolvedResultInput | null {
  if (!event.stationId || !event.eventDate || event.status !== "resolved") return null;

  return {
    stationId: event.stationId,
    stationName: event.stationName,
    eventDate: event.eventDate,
    eventFamily: event.eventFamily,
    eventHourLocal: event.eventHourLocal,
    resolvedHighF: event.actualHighF,
    resolvedTemperatureF: event.actualTemperatureF,
    resolvedBucket: event.resolvedBucket,
    notes: `Automatically resolved from NWS observations. ${event.resolverNotes.join(" ")}`.trim(),
  };
}
EOF_lib_data_trackedWeatherEventRepository_ts

cat > 'lib/weather/weatherSettlementResolver.ts' <<'EOF_lib_weather_weatherSettlementResolver_ts'
import { saveWeatherResolvedResult } from "@/lib/data/weatherHistoryRepository";
import {
  listPendingTrackedWeatherEvents,
  resolvedResultInputFromTrackedEvent,
  updateTrackedWeatherEventResolution,
} from "@/lib/data/trackedWeatherEventRepository";
import { dailyHighBucketCodeFromTemperatureF, dailyHighBucketFromTemperatureF } from "@/lib/weather/bucketUtils";
import { getNwsStationObservationsForRange } from "@/lib/weather/nwsClient";
import type { TrackedWeatherEventDocument, TrackedWeatherResolveSummary } from "@/types/trackedWeatherEvent";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function celsiusToFahrenheit(value: number) {
  return (value * 9) / 5 + 32;
}

function getLocalParts(timestamp: string, timezone: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hourText = get("hour");
  const minuteText = get("minute");

  if (!year || !month || !day || !hourText || !minuteText) return null;

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(hourText),
    minute: Number(minuteText),
  };
}

function eventDateRangeUtc(eventDate: string) {
  const start = new Date(`${eventDate}T00:00:00Z`);
  const end = new Date(`${eventDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  start.setUTCDate(start.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 2);

  return { start: start.toISOString(), end: end.toISOString() };
}

function getObservationTemperatureF(feature: Record<string, unknown>) {
  const properties = feature.properties as Record<string, unknown> | undefined;
  const temperature = properties?.temperature as Record<string, unknown> | undefined;
  const valueC = toNumber(temperature?.value);
  return valueC === null ? null : celsiusToFahrenheit(valueC);
}

function getObservationTimestamp(feature: Record<string, unknown>) {
  const properties = feature.properties as Record<string, unknown> | undefined;
  return typeof properties?.timestamp === "string" ? properties.timestamp : null;
}

function getTimezoneForStation(stationId: string) {
  if (stationId === "KORD" || stationId === "KAUS") return "America/Chicago";
  if (stationId === "KLAX") return "America/Los_Angeles";
  if (stationId === "KDEN") return "America/Denver";
  return "America/New_York";
}

async function fetchEventDateObservations(event: TrackedWeatherEventDocument & { id?: string }) {
  const range = eventDateRangeUtc(event.eventDate);
  if (!range) throw new Error(`Invalid event date: ${event.eventDate}`);

  const data = await getNwsStationObservationsForRange(event.stationId, range.start, range.end, 500);
  const features = Array.isArray(data.features) ? (data.features as Record<string, unknown>[]) : [];
  const timezone = getTimezoneForStation(event.stationId);

  return features
    .map((feature) => {
      const timestamp = getObservationTimestamp(feature);
      const tempF = getObservationTemperatureF(feature);
      const local = timestamp ? getLocalParts(timestamp, timezone) : null;
      return { timestamp, tempF, local };
    })
    .filter((reading): reading is { timestamp: string; tempF: number; local: { date: string; hour: number; minute: number } } =>
      Boolean(reading.timestamp && typeof reading.tempF === "number" && reading.local?.date === event.eventDate)
    );
}

async function resolveDailyHigh(event: TrackedWeatherEventDocument & { id?: string }) {
  const readings = await fetchEventDateObservations(event);
  const usable = readings.filter((reading) => Number.isFinite(reading.tempF));

  if (!usable.length) {
    return {
      status: "needs_review" as const,
      actualHighF: null,
      actualTemperatureF: null,
      resolvedBucket: null,
      resolvedBucketCode: null,
      observationCount: readings.length,
      resolverNotes: ["No same-local-date station temperature observations were available from NWS yet."],
    };
  }

  const high = usable.reduce((max, reading) => Math.max(max, reading.tempF), Number.NEGATIVE_INFINITY);
  const roundedHigh = Number(high.toFixed(1));

  return {
    status: "resolved" as const,
    actualHighF: roundedHigh,
    actualTemperatureF: null,
    resolvedBucket: dailyHighBucketFromTemperatureF(roundedHigh),
    resolvedBucketCode: dailyHighBucketCodeFromTemperatureF(roundedHigh),
    observationCount: usable.length,
    resolverNotes: [`Resolved from ${usable.length} NWS station observations for ${event.stationId} on ${event.eventDate}.`],
  };
}

async function resolveHourlyTemperature(event: TrackedWeatherEventDocument & { id?: string }) {
  const readings = await fetchEventDateObservations(event);

  if (typeof event.eventHourLocal !== "number") {
    return {
      status: "needs_review" as const,
      actualHighF: null,
      actualTemperatureF: null,
      resolvedBucket: null,
      resolvedBucketCode: null,
      observationCount: readings.length,
      resolverNotes: ["Hourly event is missing eventHourLocal, so the exact settlement hour could not be resolved automatically."],
    };
  }

  const hourReadings = readings.filter((reading) => reading.local.hour === event.eventHourLocal);

  if (!hourReadings.length) {
    return {
      status: "needs_review" as const,
      actualHighF: null,
      actualTemperatureF: null,
      resolvedBucket: null,
      resolvedBucketCode: null,
      observationCount: readings.length,
      resolverNotes: [`No NWS observations found inside the ${String(event.eventHourLocal).padStart(2, "0")}:00 local settlement hour.`],
    };
  }

  const value = hourReadings.reduce((max, reading) => Math.max(max, reading.tempF), Number.NEGATIVE_INFINITY);
  const rounded = Number(value.toFixed(1));

  return {
    status: "needs_review" as const,
    actualHighF: null,
    actualTemperatureF: rounded,
    resolvedBucket: `${Math.round(rounded)}° observed`,
    resolvedBucketCode: null,
    observationCount: hourReadings.length,
    resolverNotes: [
      `Found ${hourReadings.length} station observations in the target local hour. Hourly Kalshi settlement rules can vary, so this is saved as needs-review rather than fully resolved.`,
    ],
  };
}

function shouldAttemptResolution(event: TrackedWeatherEventDocument & { id?: string }) {
  const today = new Date();
  const eventDate = new Date(`${event.eventDate}T00:00:00Z`);

  if (Number.isNaN(eventDate.getTime())) return false;

  const oneDayAfterEvent = new Date(eventDate);
  oneDayAfterEvent.setUTCDate(oneDayAfterEvent.getUTCDate() + 1);

  return today.getTime() >= oneDayAfterEvent.getTime();
}

export async function resolveTrackedWeatherEvent(uid: string, event: TrackedWeatherEventDocument & { id?: string }) {
  if (!event.id) throw new Error("Tracked weather event is missing an id.");

  if (!shouldAttemptResolution(event)) {
    return {
      id: event.id,
      status: event.status,
      stationId: event.stationId,
      eventDate: event.eventDate,
      eventFamily: event.eventFamily,
      resolvedBucket: event.resolvedBucket,
      actualHighF: event.actualHighF,
      actualTemperatureF: event.actualTemperatureF,
      notes: ["Skipped because the event date has not fully passed yet."],
    };
  }

  try {
    const resolution = event.eventFamily === "hourly_temperature"
      ? await resolveHourlyTemperature(event)
      : await resolveDailyHigh(event);

    await updateTrackedWeatherEventResolution(uid, event.id, {
      status: resolution.status,
      actualHighF: resolution.actualHighF,
      actualTemperatureF: resolution.actualTemperatureF,
      resolvedBucket: resolution.resolvedBucket,
      resolvedBucketCode: resolution.resolvedBucketCode,
      observationCount: resolution.observationCount,
      resolverNotes: resolution.resolverNotes,
      errorMessage: null,
    });

    const updatedEvent: TrackedWeatherEventDocument & { id?: string } = {
      ...event,
      status: resolution.status,
      actualHighF: resolution.actualHighF,
      actualTemperatureF: resolution.actualTemperatureF,
      resolvedBucket: resolution.resolvedBucket,
      resolvedBucketCode: resolution.resolvedBucketCode,
      observationCount: resolution.observationCount,
      resolverNotes: resolution.resolverNotes,
      errorMessage: null,
    };

    const resolvedInput = resolvedResultInputFromTrackedEvent(updatedEvent);
    if (resolvedInput) {
      await saveWeatherResolvedResult(uid, resolvedInput);
    }

    return {
      id: event.id,
      status: resolution.status,
      stationId: event.stationId,
      eventDate: event.eventDate,
      eventFamily: event.eventFamily,
      resolvedBucket: resolution.resolvedBucket,
      actualHighF: resolution.actualHighF,
      actualTemperatureF: resolution.actualTemperatureF,
      notes: resolution.resolverNotes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settlement resolver error";
    await updateTrackedWeatherEventResolution(uid, event.id, {
      status: "error",
      errorMessage: message,
      resolverNotes: [message],
    });

    return {
      id: event.id,
      status: "error" as const,
      stationId: event.stationId,
      eventDate: event.eventDate,
      eventFamily: event.eventFamily,
      resolvedBucket: event.resolvedBucket,
      actualHighF: event.actualHighF,
      actualTemperatureF: event.actualTemperatureF,
      notes: [message],
      errorMessage: message,
    };
  }
}

export async function resolvePendingTrackedWeatherEvents(uid: string, limit = 25): Promise<TrackedWeatherResolveSummary> {
  const events = await listPendingTrackedWeatherEvents({ uid, limit });
  const summary: TrackedWeatherResolveSummary = {
    checked: 0,
    resolved: 0,
    needsReview: 0,
    errors: 0,
    skipped: 0,
    results: [],
  };

  for (const event of events) {
    if (!shouldAttemptResolution(event)) {
      summary.skipped += 1;
      summary.results.push({
        id: event.id ?? "unknown",
        status: event.status,
        stationId: event.stationId,
        eventDate: event.eventDate,
        eventFamily: event.eventFamily,
        resolvedBucket: event.resolvedBucket,
        actualHighF: event.actualHighF,
        actualTemperatureF: event.actualTemperatureF,
        notes: ["Skipped because the event date has not fully passed yet."],
      });
      continue;
    }

    summary.checked += 1;
    const result = await resolveTrackedWeatherEvent(uid, event);
    summary.results.push(result);

    if (result.status === "resolved") summary.resolved += 1;
    else if (result.status === "needs_review") summary.needsReview += 1;
    else if (result.status === "error") summary.errors += 1;
  }

  return summary;
}
EOF_lib_weather_weatherSettlementResolver_ts

cat > 'app/api/weather/tracking/route.ts' <<'EOF_app_api_weather_tracking_route_ts'
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
EOF_app_api_weather_tracking_route_ts

cat > 'app/api/weather/tracking/resolve-pending/route.ts' <<'EOF_app_api_weather_tracking_resolve-pending_route_ts'
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
EOF_app_api_weather_tracking_resolve-pending_route_ts

cat > 'lib/weather/nwsClient.ts' <<'EOF_lib_weather_nwsClient_ts'
const NWS_BASE_URL = "https://api.weather.gov";

const NWS_HEADERS = {
  Accept: "application/geo+json, application/json",
  "User-Agent": "kalshi-assistant-web/0.1 contact:nicholaslpollard@gmail.com",
};

async function nwsFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${NWS_BASE_URL}${path}`, {
    headers: NWS_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NWS request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function nwsFetchUrl(url: string, label: string) {
  const response = await fetch(url, {
    headers: NWS_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function getNwsPoint(latitude: number, longitude: number) {
  return nwsFetch<Record<string, unknown>>(
    `/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );
}

export async function getNwsForecastFromUrl(url: string) {
  return nwsFetchUrl(url, "NWS forecast");
}

export async function getNwsGridpointDataFromUrl(url: string) {
  return nwsFetchUrl(url, "NWS gridpoint data");
}

export async function getNwsHourlyForecastFromPoint(
  point: Record<string, unknown>
) {
  const properties = point.properties as Record<string, unknown> | undefined;
  const forecastHourlyUrl =
    typeof properties?.forecastHourly === "string"
      ? properties.forecastHourly
      : null;

  if (!forecastHourlyUrl) {
    return null;
  }

  return getNwsForecastFromUrl(forecastHourlyUrl);
}

export async function getNwsGridpointDataFromPoint(
  point: Record<string, unknown>
) {
  const properties = point.properties as Record<string, unknown> | undefined;
  const forecastGridDataUrl =
    typeof properties?.forecastGridData === "string"
      ? properties.forecastGridData
      : null;

  if (!forecastGridDataUrl) {
    return null;
  }

  return getNwsGridpointDataFromUrl(forecastGridDataUrl);
}

export async function getNwsStationObservations(stationId: string) {
  return nwsFetch<Record<string, unknown>>(
    `/stations/${encodeURIComponent(stationId)}/observations?limit=500`
  );
}

export async function getNwsStationObservationsForRange(
  stationId: string,
  start: string,
  end: string,
  limit = 500
) {
  const params = new URLSearchParams({
    start,
    end,
    limit: String(Math.min(Math.max(limit, 1), 500)),
  });

  return nwsFetch<Record<string, unknown>>(
    `/stations/${encodeURIComponent(stationId)}/observations?${params.toString()}`
  );
}

export async function getNwsAlerts(latitude: number, longitude: number) {
  return nwsFetch<Record<string, unknown>>(
    `/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );
}
EOF_lib_weather_nwsClient_ts

cat > 'lib/data/weatherHistoryRepository.ts' <<'EOF_lib_data_weatherHistoryRepository_ts'
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { saveTrackedWeatherEventFromSnapshot } from "@/lib/data/trackedWeatherEventRepository";
import type {
  WeatherBiasSummary,
  WeatherForecastSnapshotDocument,
  WeatherForecastSnapshotInput,
  WeatherHistoryFamily,
  WeatherModelBiasRow,
  WeatherResolvedResultDocument,
  WeatherResolvedResultInput,
} from "@/types/weatherHistory";
import type {
  AiBucketProbability,
  AiModelConsensusRow,
  AiObservationTrigger,
  AiSettlementClockRead,
} from "@/types/eventScanner";

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFamily(value: unknown): WeatherHistoryFamily | null {
  return value === "daily_high" || value === "hourly_temperature" ? value : null;
}

function cleanForFirestore<T>(value: T): T {
  if (value === undefined) {
    return null as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanForFirestore(item)) as T;
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      cleaned[key] = item === undefined ? null : cleanForFirestore(item);
    }

    return cleaned as T;
  }

  return value;
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function normalizeConsensusWeight(value: unknown): AiModelConsensusRow["weight"] {
  return value === "very_high" ||
    value === "high" ||
    value === "medium_high" ||
    value === "medium" ||
    value === "low" ||
    value === "context"
    ? value
    : "context";
}

function normalizeTriggerUrgency(value: unknown): AiObservationTrigger["urgency"] {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function getModelConsensusRows(value: unknown): AiModelConsensusRow[] {
  return getArray(value)
    .map((row) => ({
      source: normalizeString(row.source) ?? "Unknown source",
      forecastHighF: normalizeNumber(row.forecastHighF),
      bucket: normalizeString(row.bucket),
      weight: normalizeConsensusWeight(row.weight),
      notes: normalizeString(row.notes) ?? "",
    }))
    .filter((row) => row.source !== "Unknown source" || row.forecastHighF !== null || row.bucket !== null);
}

function getBucketProbabilityRows(value: unknown): AiBucketProbability[] {
  return getArray(value)
    .map((row) => ({
      bucket: normalizeString(row.bucket) ?? "Unknown bucket",
      probabilityPercent: normalizeNumber(row.probabilityPercent) ?? 0,
      fairValueEstimate: normalizeNumber(row.fairValueEstimate),
      reasoning: normalizeString(row.reasoning) ?? "",
    }))
    .filter((row) => row.bucket !== "Unknown bucket" || row.probabilityPercent > 0);
}

function getObservationTriggerRows(value: unknown): AiObservationTrigger[] {
  return getArray(value)
    .map((row) => ({
      trigger: normalizeString(row.trigger) ?? "",
      action: normalizeString(row.action) ?? "",
      urgency: normalizeTriggerUrgency(row.urgency),
    }))
    .filter((row) => row.trigger || row.action);
}

function getSettlementClockRead(value: unknown): AiSettlementClockRead | null {
  const object = getObject(value);

  if (!object) {
    return null;
  }

  const peakHeatingPassed =
    typeof object.peakHeatingPassed === "boolean" ? object.peakHeatingPassed : null;

  return {
    localTimeNow: normalizeString(object.localTimeNow),
    remainingHeatingWindow: normalizeString(object.remainingHeatingWindow) ?? "Unknown",
    peakHeatingPassed,
    settlementTimingRead: normalizeString(object.settlementTimingRead) ?? "",
  };
}

function getWeatherEvidenceDecisionSupport(weatherEvidence: Record<string, unknown> | null): {
  modelConsensus: AiModelConsensusRow[];
  bucketProbabilities: AiBucketProbability[];
  observationTriggers: AiObservationTrigger[];
  settlementClock: AiSettlementClockRead | null;
  forecastChangeRead: string | null;
} {
  const decisionSupport = getObject(weatherEvidence?.decisionSupport);

  return {
    modelConsensus: getModelConsensusRows(decisionSupport?.modelConsensus),
    bucketProbabilities: getBucketProbabilityRows(decisionSupport?.bucketProbabilities),
    observationTriggers: getObservationTriggerRows(decisionSupport?.observationTriggers),
    settlementClock: getSettlementClockRead(decisionSupport?.settlementClock),
    forecastChangeRead: normalizeString(decisionSupport?.forecastChangeRead),
  };
}

function getNestedString(root: Record<string, unknown> | null, path: string[]): string | null {
  let current: unknown = root;

  for (const segment of path) {
    const object = getObject(current);

    if (!object) {
      return null;
    }

    current = object[segment];
  }

  return normalizeString(current);
}

function inferSnapshotMetadata(input: WeatherForecastSnapshotInput) {
  const evidence = input.weatherEvidence;
  const station = getObject(evidence?.station);
  const event = getObject(evidence?.event);

  return {
    stationId: input.stationId ?? normalizeString(station?.id),
    stationName: input.stationName ?? normalizeString(station?.name),
    eventDate: input.eventDate ?? normalizeString(event?.date),
    eventFamily: input.eventFamily ?? normalizeFamily(event?.family),
    eventHourLocal: input.eventHourLocal ?? normalizeNumber(event?.eventHourLocal),
  };
}

function buildSnapshotDocument(input: WeatherForecastSnapshotInput): Omit<WeatherForecastSnapshotDocument, "id"> {
  const decisionSupport = getWeatherEvidenceDecisionSupport(input.weatherEvidence);
  const metadata = inferSnapshotMetadata(input);
  const aiReview = input.aiReview;

  const evidenceSummary = getNestedString(input.weatherEvidence, ["reasoning", "summary"]);

  return cleanForFirestore({
    createdAt: FieldValue.serverTimestamp(),
    sourceType: input.sourceType,
    eventTicker: input.eventTicker ?? null,
    seriesTicker: input.seriesTicker ?? null,
    positionTicker: input.positionTicker ?? null,
    marketCode: input.marketCode ?? null,
    stationId: metadata.stationId ?? null,
    stationName: metadata.stationName ?? null,
    eventDate: metadata.eventDate ?? null,
    eventFamily: metadata.eventFamily ?? null,
    eventHourLocal: metadata.eventHourLocal ?? null,
    modelConsensus: decisionSupport.modelConsensus,
    bucketProbabilities: decisionSupport.bucketProbabilities,
    observationTriggers: decisionSupport.observationTriggers,
    settlementClock: decisionSupport.settlementClock,
    forecastChangeRead: decisionSupport.forecastChangeRead,
    evidenceSummary,
    aiSummary: normalizeString(aiReview?.summary),
    aiAction: normalizeString(aiReview?.action),
    aiConfidence: normalizeString(aiReview?.confidence),
    aiIndependentForecast: getObject(aiReview?.independentForecast),
  });
}

export async function saveWeatherForecastSnapshot(uid: string, input: WeatherForecastSnapshotInput) {
  const document = buildSnapshotDocument(input);

  const ref = await adminDb
    .collection("users")
    .doc(uid)
    .collection("weatherForecastSnapshots")
    .add(document);

  try {
    await saveTrackedWeatherEventFromSnapshot(uid, {
      snapshotId: ref.id,
      snapshot: document,
    });
  } catch (trackingError) {
    console.error("Failed to create tracked weather event from snapshot:", trackingError);
  }

  return ref.id;
}

export async function listWeatherForecastSnapshots(params: {
  uid: string;
  stationId?: string | null;
  eventDate?: string | null;
  eventFamily?: WeatherHistoryFamily | null;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = adminDb
    .collection("users")
    .doc(params.uid)
    .collection("weatherForecastSnapshots");

  if (params.stationId) {
    query = query.where("stationId", "==", params.stationId);
  }

  if (params.eventDate) {
    query = query.where("eventDate", "==", params.eventDate);
  }

  if (params.eventFamily) {
    query = query.where("eventFamily", "==", params.eventFamily);
  }

  const snapshot = await query
    .orderBy("createdAt", "desc")
    .limit(Math.min(Math.max(params.limit ?? 25, 1), 100))
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<WeatherForecastSnapshotDocument, "id">),
  }));
}

function getResolvedResultId(input: WeatherResolvedResultInput) {
  const family = input.eventFamily ?? "daily_high";
  const hour = input.eventHourLocal === null || input.eventHourLocal === undefined ? "day" : String(input.eventHourLocal).padStart(2, "0");

  return `${input.stationId}_${input.eventDate}_${family}_${hour}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

function bucketFromTemperatureF(value: number | null) {
  if (value === null) {
    return null;
  }

  const lower = Math.floor(value);
  return `${lower}° to ${lower + 1}°`;
}

export async function saveWeatherResolvedResult(uid: string, input: WeatherResolvedResultInput) {
  const resolvedHighF = normalizeNumber(input.resolvedHighF);
  const resolvedTemperatureF = normalizeNumber(input.resolvedTemperatureF);
  const resolvedBucket = input.resolvedBucket ?? bucketFromTemperatureF(resolvedHighF ?? resolvedTemperatureF);
  const id = getResolvedResultId(input);

  const document: Omit<WeatherResolvedResultDocument, "id"> = cleanForFirestore({
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    stationId: input.stationId,
    stationName: input.stationName ?? null,
    eventDate: input.eventDate,
    eventFamily: input.eventFamily ?? "daily_high",
    eventHourLocal: input.eventHourLocal ?? null,
    resolvedHighF,
    resolvedTemperatureF,
    resolvedBucket,
    notes: input.notes ?? null,
  });

  await adminDb
    .collection("users")
    .doc(uid)
    .collection("weatherResolvedResults")
    .doc(id)
    .set(document, { merge: true });

  return id;
}

export async function listWeatherResolvedResults(params: {
  uid: string;
  stationId?: string | null;
  eventFamily?: WeatherHistoryFamily | null;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = adminDb
    .collection("users")
    .doc(params.uid)
    .collection("weatherResolvedResults");

  if (params.stationId) {
    query = query.where("stationId", "==", params.stationId);
  }

  if (params.eventFamily) {
    query = query.where("eventFamily", "==", params.eventFamily);
  }

  const snapshot = await query
    .orderBy("eventDate", "desc")
    .limit(Math.min(Math.max(params.limit ?? 50, 1), 250))
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<WeatherResolvedResultDocument, "id">),
  }));
}

function bucketLower(bucket: string | null) {
  if (!bucket) {
    return null;
  }

  const match = bucket.match(/(-?\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function summarizeSourceBias(params: {
  source: string;
  errors: number[];
  exactBucketCount: number;
  withinOneBucketCount: number;
}) : WeatherModelBiasRow {
  const sampleCount = params.errors.length;
  const meanErrorF = sampleCount
    ? params.errors.reduce((sum, value) => sum + value, 0) / sampleCount
    : null;
  const meanAbsoluteErrorF = sampleCount
    ? params.errors.reduce((sum, value) => sum + Math.abs(value), 0) / sampleCount
    : null;
  const warmMissCount = params.errors.filter((value) => value > 0.5).length;
  const coolMissCount = params.errors.filter((value) => value < -0.5).length;

  const roundedMeanError = meanErrorF === null ? null : Number(meanErrorF.toFixed(2));
  const roundedMae = meanAbsoluteErrorF === null ? null : Number(meanAbsoluteErrorF.toFixed(2));

  let notes = "No usable samples yet.";

  if (sampleCount > 0) {
    if (roundedMeanError !== null && roundedMeanError > 0.5) {
      notes = `${params.source} has run warm by about ${roundedMeanError.toFixed(1)}°F on stored samples.`;
    } else if (roundedMeanError !== null && roundedMeanError < -0.5) {
      notes = `${params.source} has run cool by about ${Math.abs(roundedMeanError).toFixed(1)}°F on stored samples.`;
    } else {
      notes = `${params.source} has been near-neutral on stored samples.`;
    }
  }

  return {
    source: params.source,
    sampleCount,
    meanErrorF: roundedMeanError,
    meanAbsoluteErrorF: roundedMae,
    warmMissCount,
    coolMissCount,
    exactBucketCount: params.exactBucketCount,
    withinOneBucketCount: params.withinOneBucketCount,
    notes,
  };
}

export async function getWeatherBiasSummary(params: {
  uid: string;
  stationId?: string | null;
  eventFamily?: WeatherHistoryFamily | null;
  limit?: number;
}): Promise<WeatherBiasSummary> {
  const [snapshots, resolvedResults] = await Promise.all([
    listWeatherForecastSnapshots({
      uid: params.uid,
      stationId: params.stationId,
      eventFamily: params.eventFamily,
      limit: params.limit ?? 250,
    }),
    listWeatherResolvedResults({
      uid: params.uid,
      stationId: params.stationId,
      eventFamily: params.eventFamily,
      limit: params.limit ?? 250,
    }),
  ]);

  const resolvedByKey = new Map<string, WeatherResolvedResultDocument & { id?: string }>();

  for (const result of resolvedResults) {
    resolvedByKey.set(
      `${result.stationId}_${result.eventDate}_${result.eventFamily ?? "daily_high"}_${result.eventHourLocal ?? "day"}`,
      result
    );
  }

  const sourceStats = new Map<
    string,
    { errors: number[]; exactBucketCount: number; withinOneBucketCount: number }
  >();

  for (const snapshot of snapshots) {
    if (!snapshot.stationId || !snapshot.eventDate) {
      continue;
    }

    const key = `${snapshot.stationId}_${snapshot.eventDate}_${snapshot.eventFamily ?? "daily_high"}_${snapshot.eventHourLocal ?? "day"}`;
    const resolved = resolvedByKey.get(key);
    const actualF = normalizeNumber(resolved?.resolvedHighF ?? resolved?.resolvedTemperatureF);

    if (!resolved || actualF === null) {
      continue;
    }

    const actualBucketLower = bucketLower(resolved.resolvedBucket ?? bucketFromTemperatureF(actualF));

    for (const row of snapshot.modelConsensus ?? []) {
      const source = normalizeString(row.source);
      const forecastHighF = normalizeNumber(row.forecastHighF);

      if (!source || forecastHighF === null) {
        continue;
      }

      const forecastBucketLower = bucketLower(normalizeString(row.bucket) ?? bucketFromTemperatureF(forecastHighF));
      const stats = sourceStats.get(source) ?? {
        errors: [],
        exactBucketCount: 0,
        withinOneBucketCount: 0,
      };

      stats.errors.push(forecastHighF - actualF);

      if (
        forecastBucketLower !== null &&
        actualBucketLower !== null &&
        forecastBucketLower === actualBucketLower
      ) {
        stats.exactBucketCount += 1;
      }

      if (
        forecastBucketLower !== null &&
        actualBucketLower !== null &&
        Math.abs(forecastBucketLower - actualBucketLower) <= 1
      ) {
        stats.withinOneBucketCount += 1;
      }

      sourceStats.set(source, stats);
    }
  }

  const rows = Array.from(sourceStats.entries())
    .map(([source, stats]) => summarizeSourceBias({ source, ...stats }))
    .sort((a, b) => b.sampleCount - a.sampleCount || a.source.localeCompare(b.source));

  const stationName =
    snapshots.find((snapshot) => snapshot.stationName)?.stationName ??
    resolvedResults.find((result) => result.stationName)?.stationName ??
    null;

  const notes = [
    "Bias calculations compare stored forecast snapshots against manually saved resolved results.",
    "Positive mean error means the source forecast ran warmer than the resolved temperature; negative means it ran cooler.",
    "This becomes more useful after several resolved markets have been entered for the same station.",
  ];

  return {
    stationId: params.stationId ?? null,
    stationName,
    eventFamily: params.eventFamily ?? null,
    sampleCount: snapshots.length,
    resolvedResultCount: resolvedResults.length,
    generatedAt: new Date().toISOString(),
    rows,
    notes,
  };
}

EOF_lib_data_weatherHistoryRepository_ts

cat > 'components/history/WeatherHistoryClient.tsx' <<'EOF_components_history_WeatherHistoryClient_tsx'
"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import {
  dailyHighBucketCodeFromTemperatureF,
  dailyHighBucketFromTemperatureF,
  inferResolvedBucket,
  parseDailyHighBucketCode,
  parseHourlyThresholdCode,
} from "@/lib/weather/bucketUtils";
import type {
  WeatherBiasSummary,
  WeatherForecastSnapshotDocument,
  WeatherHistoryFamily,
  WeatherModelBiasRow,
  WeatherResolvedResultDocument,
} from "@/types/weatherHistory";
import type { TrackedWeatherEventDocument, TrackedWeatherResolveSummary } from "@/types/trackedWeatherEvent";
import { useMemo, useState } from "react";

type SnapshotResponse = {
  ok: boolean;
  generatedAt?: string;
  snapshots?: WeatherForecastSnapshotDocument[];
  error?: string;
};

type ResolvedResponse = {
  ok: boolean;
  generatedAt?: string;
  results?: WeatherResolvedResultDocument[];
  id?: string;
  error?: string;
};

type BiasResponse = {
  ok: boolean;
  summary?: WeatherBiasSummary;
  error?: string;
};

type TrackingResponse = {
  ok: boolean;
  generatedAt?: string;
  events?: TrackedWeatherEventDocument[];
  error?: string;
};

type ResolvePendingResponse = {
  ok: boolean;
  generatedAt?: string;
  summary?: TrackedWeatherResolveSummary;
  error?: string;
};

type HistoryTab = "bias" | "trends" | "snapshots" | "tracking" | "resolved" | "add_result" | "settlement_tools";

const EVENT_FAMILIES: Array<{ value: "" | WeatherHistoryFamily; label: string }> = [
  { value: "", label: "All market families" },
  { value: "daily_high", label: "Daily high" },
  { value: "hourly_temperature", label: "Hourly temperature" },
];

function formatDateTime(value: unknown) {
  if (!value) {
    return "—";
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }

  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toLocaleString();
    }
  }

  return "—";
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatSignedNumber(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  const formatted = formatNumber(Math.abs(value), digits);
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatted}`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value)}%`;
}

function bucketFromTempF(value: number | null | undefined) {
  return dailyHighBucketFromTemperatureF(value);
}

function bucketCodeFromTempF(value: number | null | undefined) {
  return dailyHighBucketCodeFromTemperatureF(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function getIdToken() {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("You must be signed in to load weather history.");
  }

  return user.getIdToken();
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-4 shadow-xl shadow-black/20 sm:rounded-3xl sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[#a8b3ad]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-3 py-2 text-sm text-[#f4f7f5] outline-none transition placeholder:text-[#526059] focus:border-[#22c55e]"
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-3 py-2 text-sm text-[#f4f7f5] outline-none transition focus:border-[#22c55e]"
    />
  );
}

function Button({ variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const className =
    variant === "primary"
      ? "min-h-11 w-full rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      : "min-h-11 w-full rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

  return <button {...props} className={className} />;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full break-words rounded-full border border-[#1f2a24] bg-[#050807] px-2.5 py-1 text-xs font-semibold text-[#a8b3ad]">
      {children}
    </span>
  );
}

function getExactBucketRate(row: WeatherModelBiasRow) {
  return row.sampleCount > 0 ? Math.round((row.exactBucketCount / row.sampleCount) * 100) : null;
}

function getWithinOneBucketRate(row: WeatherModelBiasRow) {
  return row.sampleCount > 0 ? Math.round((row.withinOneBucketCount / row.sampleCount) * 100) : null;
}

function getBiasDirection(row: WeatherModelBiasRow) {
  if (typeof row.meanErrorF !== "number" || !Number.isFinite(row.meanErrorF)) {
    return "insufficient" as const;
  }

  if (row.meanErrorF > 0.5) {
    return "warm" as const;
  }

  if (row.meanErrorF < -0.5) {
    return "cool" as const;
  }

  return "neutral" as const;
}

function getBiasBadgeLabel(row: WeatherModelBiasRow) {
  const direction = getBiasDirection(row);

  if (direction === "warm") {
    return `Runs warm ${formatSignedNumber(row.meanErrorF)}°F`;
  }

  if (direction === "cool") {
    return `Runs cool ${formatSignedNumber(row.meanErrorF)}°F`;
  }

  if (direction === "neutral") {
    return "Near neutral";
  }

  return "Needs samples";
}

function getBestAccuracyRow(rows: WeatherModelBiasRow[]) {
  return rows
    .filter((row) => row.sampleCount > 0 && typeof row.meanAbsoluteErrorF === "number")
    .sort((a, b) => {
      const maeA = a.meanAbsoluteErrorF ?? Number.POSITIVE_INFINITY;
      const maeB = b.meanAbsoluteErrorF ?? Number.POSITIVE_INFINITY;
      const exactA = getExactBucketRate(a) ?? -1;
      const exactB = getExactBucketRate(b) ?? -1;
      return maeA - maeB || exactB - exactA || b.sampleCount - a.sampleCount;
    })[0] ?? null;
}

function getWarmestBiasRow(rows: WeatherModelBiasRow[]) {
  return rows
    .filter((row) => row.sampleCount > 0 && typeof row.meanErrorF === "number")
    .sort((a, b) => (b.meanErrorF ?? -999) - (a.meanErrorF ?? -999))[0] ?? null;
}

function getCoolestBiasRow(rows: WeatherModelBiasRow[]) {
  return rows
    .filter((row) => row.sampleCount > 0 && typeof row.meanErrorF === "number")
    .sort((a, b) => (a.meanErrorF ?? 999) - (b.meanErrorF ?? 999))[0] ?? null;
}

function getHighestExactBucketRow(rows: WeatherModelBiasRow[]) {
  return rows
    .filter((row) => row.sampleCount > 0)
    .sort((a, b) => {
      const exactA = getExactBucketRate(a) ?? -1;
      const exactB = getExactBucketRate(b) ?? -1;
      return exactB - exactA || (a.meanAbsoluteErrorF ?? 999) - (b.meanAbsoluteErrorF ?? 999);
    })[0] ?? null;
}

function buildStationBiasRead(summary: WeatherBiasSummary) {
  const best = getBestAccuracyRow(summary.rows);
  const warmest = getWarmestBiasRow(summary.rows);
  const coolest = getCoolestBiasRow(summary.rows);
  const exact = getHighestExactBucketRow(summary.rows);
  const usableRows = summary.rows.filter((row) => row.sampleCount > 0).length;

  if (!usableRows) {
    return "No matched forecast/resolved samples yet. Add resolved results for saved snapshots to start building station-specific bias.";
  }

  const parts: string[] = [];

  if (best) {
    parts.push(`${best.source} currently has the lowest average miss at ${formatNumber(best.meanAbsoluteErrorF)}°F MAE.`);
  }

  if (exact) {
    parts.push(`${exact.source} has the best exact-bucket rate at ${getExactBucketRate(exact) ?? 0}%.`);
  }

  if (warmest && getBiasDirection(warmest) === "warm") {
    parts.push(`${warmest.source} is the warmest-biased source at ${formatSignedNumber(warmest.meanErrorF)}°F.`);
  }

  if (coolest && getBiasDirection(coolest) === "cool") {
    parts.push(`${coolest.source} is the coolest-biased source at ${formatSignedNumber(coolest.meanErrorF)}°F.`);
  }

  return parts.join(" ");
}

type SnapshotTrendPoint = {
  snapshot: WeatherForecastSnapshotDocument;
  createdAtMs: number;
  createdAtLabel: string;
  forecastHighF: number | null;
  bucket: string | null;
  topSource: string | null;
};

type SnapshotTrendGroup = {
  key: string;
  title: string;
  subtitle: string;
  stationId: string | null;
  eventDate: string | null;
  eventFamily: WeatherHistoryFamily | null;
  points: SnapshotTrendPoint[];
  firstHighF: number | null;
  latestHighF: number | null;
  changeF: number | null;
  direction: "warming" | "cooling" | "stable" | "insufficient";
  latestBucket: string | null;
  modelSpreadF: number | null;
  convergenceRead: string;
};

function timestampToMs(value: unknown) {
  if (!value) return 0;

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }

  return 0;
}

function consensusWeightScore(weight: string) {
  if (weight === "very_high") return 5;
  if (weight === "high") return 4;
  if (weight === "medium_high") return 3;
  if (weight === "medium") return 2;
  if (weight === "low") return 1;
  return 0.5;
}

function getSnapshotForecastHigh(snapshot: WeatherForecastSnapshotDocument) {
  const rows = snapshot.modelConsensus.filter(
    (row) => typeof row.forecastHighF === "number" && Number.isFinite(row.forecastHighF),
  );

  if (!rows.length) return null;

  let weightedTotal = 0;
  let weightTotal = 0;

  for (const row of rows) {
    const weight = consensusWeightScore(row.weight);
    weightedTotal += (row.forecastHighF ?? 0) * weight;
    weightTotal += weight;
  }

  return weightTotal > 0 ? weightedTotal / weightTotal : null;
}

function getSnapshotTopSource(snapshot: WeatherForecastSnapshotDocument) {
  return [...snapshot.modelConsensus]
    .filter((row) => typeof row.forecastHighF === "number" && Number.isFinite(row.forecastHighF))
    .sort((a, b) => consensusWeightScore(b.weight) - consensusWeightScore(a.weight))[0]?.source ?? null;
}

function getModelSpread(snapshot: WeatherForecastSnapshotDocument) {
  const highs = snapshot.modelConsensus
    .map((row) => row.forecastHighF)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (highs.length < 2) return null;

  return Math.max(...highs) - Math.min(...highs);
}

function buildSnapshotTrendGroups(snapshots: WeatherForecastSnapshotDocument[]) {
  const groups = new Map<string, WeatherForecastSnapshotDocument[]>();

  for (const snapshot of snapshots) {
    const station = snapshot.stationId ?? "unknown-station";
    const date = snapshot.eventDate ?? "unknown-date";
    const family = snapshot.eventFamily ?? "unknown-family";
    const eventKey = snapshot.eventTicker ?? snapshot.positionTicker ?? snapshot.seriesTicker ?? "unknown-market";
    const key = `${station}|${date}|${family}|${eventKey}`;

    const existing = groups.get(key) ?? [];
    existing.push(snapshot);
    groups.set(key, existing);
  }

  return Array.from(groups.entries())
    .map(([key, groupSnapshots]) => {
      const sorted = [...groupSnapshots].sort((a, b) => timestampToMs(a.createdAt) - timestampToMs(b.createdAt));
      const points = sorted.map((snapshot) => {
        const createdAtMs = timestampToMs(snapshot.createdAt);
        const forecastHighF = getSnapshotForecastHigh(snapshot);
        return {
          snapshot,
          createdAtMs,
          createdAtLabel: formatDateTime(snapshot.createdAt),
          forecastHighF,
          bucket: bucketFromTempF(forecastHighF),
          topSource: getSnapshotTopSource(snapshot),
        };
      });

      const validPoints = points.filter((point) => typeof point.forecastHighF === "number");
      const firstHighF = validPoints[0]?.forecastHighF ?? null;
      const latestHighF = validPoints.at(-1)?.forecastHighF ?? null;
      const changeF = firstHighF !== null && latestHighF !== null ? latestHighF - firstHighF : null;
      const latest = sorted.at(-1);
      const modelSpreadF = latest ? getModelSpread(latest) : null;

      let direction: SnapshotTrendGroup["direction"] = "insufficient";
      if (typeof changeF === "number" && Number.isFinite(changeF)) {
        if (changeF >= 0.75) direction = "warming";
        else if (changeF <= -0.75) direction = "cooling";
        else direction = "stable";
      }

      let convergenceRead = "Not enough model spread data yet.";
      if (typeof modelSpreadF === "number" && Number.isFinite(modelSpreadF)) {
        if (modelSpreadF <= 1.25) convergenceRead = "Models are tightly clustered.";
        else if (modelSpreadF <= 2.5) convergenceRead = "Models show moderate spread.";
        else convergenceRead = "Models are meaningfully spread out.";
      }

      return {
        key,
        title: latest?.eventTicker ?? latest?.positionTicker ?? latest?.seriesTicker ?? "Weather market",
        subtitle: `${latest?.stationId ?? "Unknown station"} · ${latest?.eventDate ?? "No date"} · ${(latest?.eventFamily ?? "unknown").replaceAll("_", " ")}`,
        stationId: latest?.stationId ?? null,
        eventDate: latest?.eventDate ?? null,
        eventFamily: latest?.eventFamily ?? null,
        points,
        firstHighF,
        latestHighF,
        changeF,
        direction,
        latestBucket: bucketFromTempF(latestHighF),
        modelSpreadF,
        convergenceRead,
      } satisfies SnapshotTrendGroup;
    })
    .sort((a, b) => {
      const latestA = a.points.at(-1)?.createdAtMs ?? 0;
      const latestB = b.points.at(-1)?.createdAtMs ?? 0;
      return latestB - latestA;
    });
}

function getTrendDirectionLabel(direction: SnapshotTrendGroup["direction"]) {
  if (direction === "warming") return "Warming";
  if (direction === "cooling") return "Cooling";
  if (direction === "stable") return "Stable";
  return "Needs snapshots";
}

export function WeatherHistoryClient() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("bias");
  const [stationId, setStationId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventFamily, setEventFamily] = useState<"" | WeatherHistoryFamily>("daily_high");
  const [limit, setLimit] = useState("100");

  const [snapshots, setSnapshots] = useState<WeatherForecastSnapshotDocument[]>([]);
  const [trackedEvents, setTrackedEvents] = useState<TrackedWeatherEventDocument[]>([]);
  const [resolvedResults, setResolvedResults] = useState<WeatherResolvedResultDocument[]>([]);
  const [biasSummary, setBiasSummary] = useState<WeatherBiasSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [resultForm, setResultForm] = useState({
    stationId: "",
    stationName: "",
    eventDate: "",
    eventFamily: "daily_high" as WeatherHistoryFamily,
    eventHourLocal: "",
    resolvedHighF: "",
    resolvedTemperatureF: "",
    resolvedBucket: "",
    marketTicker: "",
    notes: "",
  });

  const [settlementTool, setSettlementTool] = useState({
    temperatureF: "",
    dailyBucketCode: "B93.5",
    hourlyThresholdCode: "T69.99",
  });

  const inferredResultBucket = useMemo(() => {
    return inferResolvedBucket({
      eventFamily: resultForm.eventFamily,
      resolvedBucket: resultForm.resolvedBucket,
      resolvedHighF: resultForm.resolvedHighF,
      resolvedTemperatureF: resultForm.resolvedTemperatureF,
      marketTicker: resultForm.marketTicker,
    });
  }, [
    resultForm.eventFamily,
    resultForm.resolvedBucket,
    resultForm.resolvedHighF,
    resultForm.resolvedTemperatureF,
    resultForm.marketTicker,
  ]);

  const settlementToolTemperature = Number(settlementTool.temperatureF);
  const settlementToolBucket = Number.isFinite(settlementToolTemperature)
    ? bucketFromTempF(settlementToolTemperature)
    : null;
  const settlementToolCode = Number.isFinite(settlementToolTemperature)
    ? bucketCodeFromTempF(settlementToolTemperature)
    : null;
  const parsedDailyToolBucket = parseDailyHighBucketCode(settlementTool.dailyBucketCode);
  const parsedHourlyToolThreshold = parseHourlyThresholdCode(settlementTool.hourlyThresholdCode);

  const trendGroups = useMemo(() => buildSnapshotTrendGroups(snapshots), [snapshots]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (stationId.trim()) params.set("stationId", stationId.trim().toUpperCase());
    if (eventDate.trim()) params.set("eventDate", eventDate.trim());
    if (eventFamily) params.set("eventFamily", eventFamily);
    if (limit.trim()) params.set("limit", limit.trim());
    return params.toString();
  }, [stationId, eventDate, eventFamily, limit]);

  async function loadSnapshots() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/weather/history/snapshots?${queryString}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as SnapshotResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load forecast snapshots.");
      }

      setSnapshots(body.snapshots ?? []);
      setStatus(`Loaded ${(body.snapshots ?? []).length} forecast snapshots.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadResolvedResults() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/weather/history/resolved?${queryString}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as ResolvedResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load resolved results.");
      }

      setResolvedResults(body.results ?? []);
      setStatus(`Loaded ${(body.results ?? []).length} resolved results.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadTrackedEvents() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch(`/api/weather/tracking?${queryString}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as TrackingResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load tracked weather events.");
      }

      setTrackedEvents(body.events ?? []);
      setStatus(`Loaded ${(body.events ?? []).length} tracked weather events.`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resolvePendingTrackedEvents() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/weather/tracking/resolve-pending", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limit: Number(limit) || 25 }),
      });
      const body = (await response.json()) as ResolvePendingResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to resolve pending tracked events.");
      }

      const summary = body.summary;
      setStatus(
        summary
          ? `Checked ${summary.checked}, resolved ${summary.resolved}, needs review ${summary.needsReview}, skipped ${summary.skipped}.`
          : "Pending tracker check completed."
      );
      await Promise.all([loadTrackedEvents(), loadResolvedResults(), loadBiasSummary()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadBiasSummary() {
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const idToken = await getIdToken();
      const params = new URLSearchParams();
      if (stationId.trim()) params.set("stationId", stationId.trim().toUpperCase());
      if (eventFamily) params.set("eventFamily", eventFamily);
      if (limit.trim()) params.set("limit", limit.trim());

      const response = await fetch(`/api/weather/history/bias?${params.toString()}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as BiasResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to load bias summary.");
      }

      setBiasSummary(body.summary ?? null);
      setStatus("Loaded model/source bias summary.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveResolvedResult(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const idToken = await getIdToken();
      const response = await fetch("/api/weather/history/resolved", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stationId: resultForm.stationId.trim().toUpperCase(),
          stationName: resultForm.stationName.trim() || null,
          eventDate: resultForm.eventDate,
          eventFamily: resultForm.eventFamily,
          eventHourLocal: resultForm.eventHourLocal || null,
          resolvedHighF: resultForm.resolvedHighF || null,
          resolvedTemperatureF: resultForm.resolvedTemperatureF || null,
          resolvedBucket: inferredResultBucket,
          marketTicker: resultForm.marketTicker.trim() || null,
          notes: resultForm.notes.trim() || null,
        }),
      });
      const body = (await response.json()) as ResolvedResponse;

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? "Failed to save resolved result.");
      }

      setStatus("Resolved result saved. Bias calculations can now include it.");
      setResultForm({
        stationId: "",
        stationName: "",
        eventDate: "",
        eventFamily: "daily_high",
        eventHourLocal: "",
        resolvedHighF: "",
        resolvedTemperatureF: "",
        resolvedBucket: "",
        marketTicker: "",
        notes: "",
      });
      await loadResolvedResults();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function runActiveLoad() {
    if (activeTab === "bias") void loadBiasSummary();
    if (activeTab === "trends") void loadSnapshots();
    if (activeTab === "snapshots") void loadSnapshots();
    if (activeTab === "tracking") void loadTrackedEvents();
    if (activeTab === "resolved") void loadResolvedResults();
  }

  function startResolvedResultFromSnapshot(snapshot: WeatherForecastSnapshotDocument) {
    setResultForm((prev) => ({
      ...prev,
      stationId: snapshot.stationId ?? prev.stationId,
      stationName: snapshot.stationName ?? prev.stationName,
      eventDate: snapshot.eventDate ?? prev.eventDate,
      eventFamily: snapshot.eventFamily ?? prev.eventFamily,
      eventHourLocal:
        typeof snapshot.eventHourLocal === "number" ? String(snapshot.eventHourLocal) : prev.eventHourLocal,
      marketTicker: snapshot.marketCode ?? snapshot.positionTicker ?? snapshot.eventTicker ?? prev.marketTicker,
      notes: `Resolved result for ${snapshot.eventTicker ?? snapshot.positionTicker ?? snapshot.seriesTicker ?? "weather market"}`,
    }));
    setActiveTab("add_result");
    setStatus("Snapshot details copied into the resolved-result form. Enter the final official result and save.");
    setError(null);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-4 shadow-xl shadow-black/20 sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#22c55e] sm:text-sm sm:tracking-[0.3em]">
              Weather history
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Model Bias & Forecast History</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a8b3ad]">
              Review saved AI forecast snapshots, automatically resolve station results, review fallback entries, and measure which sources have recently run warm or cool by station and market family.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 min-[700px]:flex min-[700px]:flex-wrap">
            {([
              ["bias", "Model bias"],
              ["trends", "Trends"],
              ["snapshots", "Snapshots"],
              ["tracking", "Tracking"],
              ["resolved", "Resolved"],
              ["add_result", "Add result"],
              ["settlement_tools", "Settlement tools"],
            ] as Array<[HistoryTab, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={
                  activeTab === value
                    ? "min-h-11 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008]"
                    : "min-h-11 rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Panel title="Filters" description="Use station IDs like KDEN, KDCA, KNYC, KORD, KLAX, KMIA, KBOS, KPHL, KATL, KAUS.">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-4">
          <Field label="Station ID">
            <TextInput
              value={stationId}
              onChange={(event) => setStationId(event.target.value)}
              placeholder="KDEN"
            />
          </Field>
          <Field label="Event date">
            <TextInput
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
            />
          </Field>
          <Field label="Market family">
            <Select
              value={eventFamily}
              onChange={(event) => setEventFamily(event.target.value as "" | WeatherHistoryFamily)}
            >
              {EVENT_FAMILIES.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Limit">
            <TextInput
              type="number"
              min="1"
              max="500"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 min-[520px]:flex min-[520px]:flex-wrap">
          {activeTab !== "add_result" ? (
            <Button type="button" onClick={runActiveLoad} disabled={loading}>
              {loading ? "Loading..." : "Load current tab"}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => void loadBiasSummary()} disabled={loading}>
            Refresh bias
          </Button>
          <Button type="button" variant="secondary" onClick={() => void loadSnapshots()} disabled={loading}>
            Refresh snapshots
          </Button>
          <Button type="button" variant="secondary" onClick={() => void loadResolvedResults()} disabled={loading}>
            Refresh resolved
          </Button>
          <Button type="button" variant="secondary" onClick={() => void loadTrackedEvents()} disabled={loading}>
            Refresh tracking
          </Button>
          <Button type="button" variant="secondary" onClick={() => void resolvePendingTrackedEvents()} disabled={loading}>
            Resolve pending
          </Button>
        </div>

        {status ? <p className="mt-4 text-sm text-[#22c55e]">{status}</p> : null}
        {error ? <p className="mt-4 text-sm text-[#fecaca]">{error}</p> : null}
      </Panel>

      {activeTab === "bias" ? (
        <Panel
          title="Model/source bias"
          description="Bias compares saved model forecast rows against saved resolved results for the same station/date/family. Positive mean error means the source ran warm; negative means it ran cool."
        >
          {biasSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryCard label="Station" value={biasSummary.stationId ?? "All"} />
                <SummaryCard label="Snapshots" value={String(biasSummary.sampleCount)} />
                <SummaryCard label="Resolved results" value={String(biasSummary.resolvedResultCount)} />
                <SummaryCard label="Generated" value={formatDateTime(biasSummary.generatedAt)} />
              </div>

              <BiasInsightPanel summary={biasSummary} />

              <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-[#1f2a24]">
                <table className="min-w-[720px] w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0b120f] text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
                    <tr>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Samples</th>
                      <th className="px-4 py-3">Mean error</th>
                      <th className="px-4 py-3">MAE</th>
                      <th className="px-4 py-3">Warm misses</th>
                      <th className="px-4 py-3">Cool misses</th>
                      <th className="px-4 py-3">Exact bucket</th>
                      <th className="px-4 py-3">Within 1 bucket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2a24]">
                    {biasSummary.rows.map((row) => (
                      <tr key={row.source} className="text-[#d8dfdb]">
                        <td className="px-4 py-3 font-semibold text-white">{row.source}</td>
                        <td className="px-4 py-3">{row.sampleCount}</td>
                        <td className="px-4 py-3">{formatSignedNumber(row.meanErrorF)}°F</td>
                        <td className="px-4 py-3">{formatNumber(row.meanAbsoluteErrorF)}°F</td>
                        <td className="px-4 py-3">{row.warmMissCount}</td>
                        <td className="px-4 py-3">{row.coolMissCount}</td>
                        <td className="px-4 py-3">{row.exactBucketCount}</td>
                        <td className="px-4 py-3">{row.withinOneBucketCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {biasSummary.notes.length ? (
                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <h3 className="font-semibold text-white">Notes</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#a8b3ad]">
                    {biasSummary.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState message="Load bias after you have at least one saved forecast snapshot and one matching resolved result." />
          )}
        </Panel>
      ) : null}

      {activeTab === "trends" ? (
        <Panel
          title="Forecast snapshot trends"
          description="Track whether saved forecast snapshots are warming, cooling, stabilizing, or showing model disagreement for the same station/event."
        >
          {snapshots.length ? (
            trendGroups.length ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <SummaryCard label="Trend groups" value={String(trendGroups.length)} />
                  <SummaryCard
                    label="Warming"
                    value={String(trendGroups.filter((group) => group.direction === "warming").length)}
                  />
                  <SummaryCard
                    label="Cooling"
                    value={String(trendGroups.filter((group) => group.direction === "cooling").length)}
                  />
                  <SummaryCard
                    label="Latest snapshots"
                    value={String(snapshots.length)}
                  />
                </div>

                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 text-sm leading-6 text-[#a8b3ad]">
                  Use this page to catch forecast movement. A warming trend can support higher buckets before the market fully reprices; a cooling trend can weaken hot buckets. Model spread tells you whether the move is broadly supported or still noisy.
                </div>

                {trendGroups.map((group) => (
                  <TrendGroupCard key={group.key} group={group} />
                ))}
              </div>
            ) : (
              <EmptyState message="No trend groups are available yet. Load snapshots after running multiple AI reviews for the same event." />
            )
          ) : (
            <EmptyState message="Load snapshots first. Trends appear after more than one snapshot is saved for the same station/date/family/event." />
          )}
        </Panel>
      ) : null}

      {activeTab === "snapshots" ? (
        <Panel title="Forecast snapshots" description="These are saved when event or position AI reviews run.">
          {snapshots.length ? (
            <div className="space-y-4">
              {snapshots.map((snapshot) => (
                <SnapshotCard
                  key={snapshot.id ?? `${snapshot.eventTicker}-${snapshot.createdAt}`}
                  snapshot={snapshot}
                  onUseForResolvedResult={startResolvedResultFromSnapshot}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No snapshots loaded yet. Run an AI review, then load snapshots here." />
          )}
        </Panel>
      ) : null}

      {activeTab === "resolved" ? (
        <Panel title="Resolved results" description="Resolved station results used for later model-bias calculations. These may be saved automatically from tracked NWS observations or entered manually as a fallback.">
          {resolvedResults.length ? (
            <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-[#1f2a24]">
              <table className="min-w-[680px] w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#0b120f] text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Station</th>
                    <th className="px-4 py-3">Family</th>
                    <th className="px-4 py-3">Hour</th>
                    <th className="px-4 py-3">High</th>
                    <th className="px-4 py-3">Temp</th>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2a24]">
                  {resolvedResults.map((result) => (
                    <tr key={result.id ?? `${result.stationId}-${result.eventDate}`} className="text-[#d8dfdb]">
                      <td className="px-4 py-3">{result.eventDate}</td>
                      <td className="px-4 py-3 font-semibold text-white">{result.stationId}</td>
                      <td className="px-4 py-3">{result.eventFamily ?? "—"}</td>
                      <td className="px-4 py-3">{result.eventHourLocal ?? "—"}</td>
                      <td className="px-4 py-3">{formatNumber(result.resolvedHighF)}°F</td>
                      <td className="px-4 py-3">{formatNumber(result.resolvedTemperatureF)}°F</td>
                      <td className="px-4 py-3">{result.resolvedBucket ?? bucketFromTempF(result.resolvedHighF) ?? "—"}</td>
                      <td className="px-4 py-3 text-[#a8b3ad]">{result.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No resolved results loaded yet. Add one or refresh resolved results." />
          )}
        </Panel>
      ) : null}

      {activeTab === "settlement_tools" ? (
        <Panel
          title="Bucket settlement tools"
          description="Use these helpers to verify how temperatures and Kalshi codes map before saving resolved results."
        >
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
              <Field label="Official temperature °F">
                <TextInput
                  type="number"
                  step="0.1"
                  value={settlementTool.temperatureF}
                  onChange={(event) =>
                    setSettlementTool((prev) => ({ ...prev, temperatureF: event.target.value }))
                  }
                  placeholder="93.8"
                />
              </Field>
              <div className="mt-4 space-y-2 text-sm text-[#d8dfdb]">
                <p>Daily bucket: <span className="font-semibold text-white">{settlementToolBucket ?? "—"}</span></p>
                <p>Kalshi code: <span className="font-semibold text-white">{settlementToolCode ?? "—"}</span></p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
              <Field label="Daily high bucket code">
                <TextInput
                  value={settlementTool.dailyBucketCode}
                  onChange={(event) =>
                    setSettlementTool((prev) => ({ ...prev, dailyBucketCode: event.target.value }))
                  }
                  placeholder="B93.5"
                />
              </Field>
              <div className="mt-4 space-y-2 text-sm text-[#d8dfdb]">
                <p>Range: <span className="font-semibold text-white">{parsedDailyToolBucket?.label ?? "—"}</span></p>
                <p>Lower/upper: <span className="font-semibold text-white">{parsedDailyToolBucket ? `${parsedDailyToolBucket.lowerF} / ${parsedDailyToolBucket.upperF}` : "—"}</span></p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
              <Field label="Hourly threshold code">
                <TextInput
                  value={settlementTool.hourlyThresholdCode}
                  onChange={(event) =>
                    setSettlementTool((prev) => ({ ...prev, hourlyThresholdCode: event.target.value }))
                  }
                  placeholder="T69.99"
                />
              </Field>
              <div className="mt-4 space-y-2 text-sm text-[#d8dfdb]">
                <p>Threshold: <span className="font-semibold text-white">{parsedHourlyToolThreshold?.label ?? "—"}</span></p>
                <p>Code: <span className="font-semibold text-white">{parsedHourlyToolThreshold?.kalshiCode ?? "—"}</span></p>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {activeTab === "add_result" ? (
        <Panel
          title="Add resolved result"
          description="Enter the actual station result after settlement. For daily highs, the bucket is automatically inferred if you leave it blank."
        >
          <form onSubmit={saveResolvedResult} className="space-y-4">
            <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
              <Field label="Station ID *">
                <TextInput
                  required
                  value={resultForm.stationId}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, stationId: event.target.value }))}
                  placeholder="KDEN"
                />
              </Field>
              <Field label="Station name">
                <TextInput
                  value={resultForm.stationName}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, stationName: event.target.value }))}
                  placeholder="Denver International Airport"
                />
              </Field>
              <Field label="Event date *">
                <TextInput
                  required
                  type="date"
                  value={resultForm.eventDate}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, eventDate: event.target.value }))}
                />
              </Field>
              <Field label="Market family">
                <Select
                  value={resultForm.eventFamily}
                  onChange={(event) =>
                    setResultForm((prev) => ({
                      ...prev,
                      eventFamily: event.target.value as WeatherHistoryFamily,
                    }))
                  }
                >
                  <option value="daily_high">Daily high</option>
                  <option value="hourly_temperature">Hourly temperature</option>
                </Select>
              </Field>
              <Field label="Event hour local">
                <TextInput
                  type="number"
                  min="0"
                  max="23"
                  value={resultForm.eventHourLocal}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, eventHourLocal: event.target.value }))}
                  placeholder="14"
                />
              </Field>
              <Field label="Resolved high °F">
                <TextInput
                  type="number"
                  step="0.1"
                  value={resultForm.resolvedHighF}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, resolvedHighF: event.target.value }))}
                  placeholder="91"
                />
              </Field>
              <Field label="Resolved hourly temp °F">
                <TextInput
                  type="number"
                  step="0.1"
                  value={resultForm.resolvedTemperatureF}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, resolvedTemperatureF: event.target.value }))}
                  placeholder="70"
                />
              </Field>
              <Field label="Resolved bucket override">
                <TextInput
                  value={resultForm.resolvedBucket}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, resolvedBucket: event.target.value }))}
                  placeholder="Leave blank to infer"
                />
              </Field>
              <Field label="Market ticker / bucket code">
                <TextInput
                  value={resultForm.marketTicker}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, marketTicker: event.target.value }))}
                  placeholder="KXHIGHDEN-...-B93.5"
                />
              </Field>
              <Field label="Notes">
                <TextInput
                  value={resultForm.notes}
                  onChange={(event) => setResultForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Official daily high settlement"
                />
              </Field>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 text-sm text-[#a8b3ad]">
                <p className="font-semibold text-white">Resolved bucket preview</p>
                <p className="mt-2">
                  The result will save as:{" "}
                  <span className="font-semibold text-[#22c55e]">{inferredResultBucket ?? "enter result data"}</span>
                </p>
              </div>
              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 text-sm text-[#a8b3ad]">
                Bucket reminder: a Kalshi daily high bucket shown as <span className="font-semibold text-white">B93.5</span> means <span className="font-semibold text-white">93° to 94°</span>. A 93.8°F high maps to 93° to 94°; a 94.0°F high maps to 94° to 95°.
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save resolved result"}
            </Button>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7b74]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#f4f7f5]">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#1f2a24] bg-[#0b120f] p-6 text-sm text-[#a8b3ad]">
      {message}
    </div>
  );
}

function BiasInsightPanel({ summary }: { summary: WeatherBiasSummary }) {
  const best = getBestAccuracyRow(summary.rows);
  const warmest = getWarmestBiasRow(summary.rows);
  const coolest = getCoolestBiasRow(summary.rows);
  const exact = getHighestExactBucketRow(summary.rows);
  const stationLabel = summary.stationId ?? "selected stations";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">
              Station read
            </p>
            <h3 className="mt-1 text-lg font-bold text-white">
              {stationLabel} model-bias interpretation
            </h3>
          </div>
          <Badge>{summary.eventFamily ? summary.eventFamily.replaceAll("_", " ") : "all families"}</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#d8dfdb]">{buildStationBiasRead(summary)}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <BiasMetricCard
          title="Closest source"
          row={best}
          value={best ? `${formatNumber(best.meanAbsoluteErrorF)}°F MAE` : "—"}
          detail={best ? `${best.sampleCount} matched sample${best.sampleCount === 1 ? "" : "s"}` : "Add resolved results to calculate."}
        />
        <BiasMetricCard
          title="Best bucket hit rate"
          row={exact}
          value={exact ? `${getExactBucketRate(exact) ?? 0}% exact` : "—"}
          detail={exact ? `${getWithinOneBucketRate(exact) ?? 0}% within one bucket` : "No bucket matches yet."}
        />
        <BiasMetricCard
          title="Warmest bias"
          row={warmest}
          value={warmest ? `${formatSignedNumber(warmest.meanErrorF)}°F` : "—"}
          detail={warmest ? getBiasBadgeLabel(warmest) : "No usable samples yet."}
        />
        <BiasMetricCard
          title="Coolest bias"
          row={coolest}
          value={coolest ? `${formatSignedNumber(coolest.meanErrorF)}°F` : "—"}
          detail={coolest ? getBiasBadgeLabel(coolest) : "No usable samples yet."}
        />
      </div>

      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">
          How to use this
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#a8b3ad]">
          <li>Prefer sources with low MAE and high exact-bucket rate when they agree with the current setup.</li>
          <li>If a source is consistently warm, discount its hot-bucket calls unless live observations support them.</li>
          <li>If a source is consistently cool, be careful fading warmer buckets when observations and short-term guidance are rising.</li>
          <li>Do not overfit one or two samples; this panel becomes more reliable after several resolved markets per station.</li>
        </ul>
      </div>
    </div>
  );
}

function BiasMetricCard({
  title,
  row,
  value,
  detail,
}: {
  title: string;
  row: WeatherModelBiasRow | null;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7b74]">{title}</p>
      <p className="mt-2 text-lg font-bold text-white">{row?.source ?? "—"}</p>
      <p className="mt-1 text-sm font-semibold text-[#22c55e]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#a8b3ad]">{detail}</p>
    </div>
  );
}

function TrendGroupCard({ group }: { group: SnapshotTrendGroup }) {
  const validPoints = group.points.filter((point) => typeof point.forecastHighF === "number");
  const lows = validPoints.map((point) => point.forecastHighF as number);
  const minHigh = lows.length ? Math.floor(Math.min(...lows) - 1) : null;
  const maxHigh = lows.length ? Math.ceil(Math.max(...lows) + 1) : null;
  const range = minHigh !== null && maxHigh !== null ? Math.max(1, maxHigh - minHigh) : 1;

  return (
    <article className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{getTrendDirectionLabel(group.direction)}</Badge>
            {group.stationId ? <Badge>{group.stationId}</Badge> : null}
            {group.eventFamily ? <Badge>{group.eventFamily.replaceAll("_", " ")}</Badge> : null}
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{group.title}</h3>
          <p className="mt-1 text-sm text-[#a8b3ad]">{group.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm min-[520px]:grid-cols-4 lg:min-w-[520px]">
          <SummaryCard label="First high" value={`${formatNumber(group.firstHighF)}°F`} />
          <SummaryCard label="Latest high" value={`${formatNumber(group.latestHighF)}°F`} />
          <SummaryCard label="Change" value={`${formatSignedNumber(group.changeF)}°F`} />
          <SummaryCard label="Latest bucket" value={group.latestBucket ?? "—"} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-xl border border-[#1f2a24] bg-[#050807] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">Forecast path</p>
            <p className="text-xs text-[#a8b3ad]">{validPoints.length} usable snapshot{validPoints.length === 1 ? "" : "s"}</p>
          </div>

          {validPoints.length ? (
            <div className="mt-4 flex h-44 items-end gap-2 overflow-x-auto overscroll-x-contain border-b border-[#1f2a24] pb-2">
              {validPoints.map((point, index) => {
                const high = point.forecastHighF as number;
                const heightPercent = ((high - (minHigh ?? high - 1)) / range) * 100;
                return (
                  <div key={`${point.snapshot.id ?? point.createdAtLabel}-${index}`} className="flex min-w-[74px] flex-col items-center gap-2">
                    <div className="text-center text-xs text-[#d8dfdb]">
                      <p className="font-semibold text-white">{formatNumber(high)}°</p>
                      <p>{point.bucket ?? "—"}</p>
                    </div>
                    <div className="flex h-24 w-full items-end justify-center rounded-lg bg-[#0b120f] px-2">
                      <div
                        className="w-5 rounded-t-md bg-[#22c55e]"
                        style={{ height: `${Math.max(12, Math.min(100, heightPercent))}%` }}
                        title={`${formatNumber(high)}°F · ${point.createdAtLabel}`}
                      />
                    </div>
                    <p className="line-clamp-2 text-center text-[10px] leading-4 text-[#6f7b74]">
                      {point.createdAtLabel}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="This group has no numeric forecast-high rows yet." />
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[#1f2a24] bg-[#050807] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">Trend read</p>
            <p className="mt-2 text-sm leading-6 text-[#d8dfdb]">
              {group.direction === "warming"
                ? `Forecasts have warmed ${formatSignedNumber(group.changeF)}°F from first to latest snapshot.`
                : group.direction === "cooling"
                  ? `Forecasts have cooled ${formatSignedNumber(group.changeF)}°F from first to latest snapshot.`
                  : group.direction === "stable"
                    ? "Forecasts are broadly stable across saved snapshots."
                    : "More snapshots are needed for a trend read."}
            </p>
          </div>
          <div className="rounded-xl border border-[#1f2a24] bg-[#050807] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">Model spread</p>
            <p className="mt-2 text-sm font-semibold text-white">{formatNumber(group.modelSpreadF)}°F latest spread</p>
            <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">{group.convergenceRead}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function SnapshotCard({
  snapshot,
  onUseForResolvedResult,
}: {
  snapshot: WeatherForecastSnapshotDocument;
  onUseForResolvedResult?: (snapshot: WeatherForecastSnapshotDocument) => void;
}) {
  return (
    <article className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{snapshot.sourceType.replaceAll("_", " ")}</Badge>
            {snapshot.eventFamily ? <Badge>{snapshot.eventFamily.replaceAll("_", " ")}</Badge> : null}
            {snapshot.stationId ? <Badge>{snapshot.stationId}</Badge> : null}
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">
            {snapshot.eventTicker ?? snapshot.positionTicker ?? snapshot.seriesTicker ?? "Weather snapshot"}
          </h3>
          <p className="mt-1 text-sm text-[#a8b3ad]">
            {snapshot.eventDate ?? "No event date"} · {formatDateTime(snapshot.createdAt)}
          </p>
        </div>
        <div className="text-left text-sm lg:text-right">
          <p className="font-semibold text-white">{snapshot.aiAction ?? "No action recorded"}</p>
          <p className="mt-1 text-[#a8b3ad]">Confidence: {snapshot.aiConfidence ?? "—"}</p>
          {onUseForResolvedResult ? (
            <button
              type="button"
              onClick={() => onUseForResolvedResult(snapshot)}
              className="mt-3 rounded-xl border border-[#1f2a24] px-3 py-2 text-xs font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              Use for resolved result
            </button>
          ) : null}
        </div>
      </div>

      {snapshot.evidenceSummary || snapshot.aiSummary ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {snapshot.evidenceSummary ? (
            <div className="rounded-xl border border-[#1f2a24] bg-[#050807] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">Evidence</p>
              <p className="mt-2 text-sm leading-6 text-[#d8dfdb]">{snapshot.evidenceSummary}</p>
            </div>
          ) : null}
          {snapshot.aiSummary ? (
            <div className="rounded-xl border border-[#1f2a24] bg-[#050807] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">AI summary</p>
              <p className="mt-2 text-sm leading-6 text-[#d8dfdb]">{snapshot.aiSummary}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {snapshot.modelConsensus.length ? (
        <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-xl border border-[#1f2a24]">
          <table className="min-w-[640px] w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#050807] text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">High</th>
                <th className="px-3 py-2">Bucket</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2a24]">
              {snapshot.modelConsensus.map((row, index) => (
                <tr key={`${row.source}-${index}`}>
                  <td className="px-3 py-2 font-semibold text-white">{row.source}</td>
                  <td className="px-3 py-2 text-[#d8dfdb]">{formatNumber(row.forecastHighF)}°F</td>
                  <td className="px-3 py-2 text-[#d8dfdb]">{row.bucket ?? bucketFromTempF(row.forecastHighF) ?? "—"}</td>
                  <td className="px-3 py-2 text-[#d8dfdb]">{row.weight.replaceAll("_", " ")}</td>
                  <td className="px-3 py-2 text-[#a8b3ad]">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {snapshot.bucketProbabilities.length ? (
        <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {snapshot.bucketProbabilities.map((bucket) => (
            <div key={bucket.bucket} className="rounded-xl border border-[#1f2a24] bg-[#050807] p-3">
              <p className="font-semibold text-white">{bucket.bucket}</p>
              <p className="mt-1 text-sm text-[#22c55e]">{formatPercent(bucket.probabilityPercent)}</p>
              <p className="mt-1 text-xs text-[#a8b3ad]">{bucket.reasoning}</p>
            </div>
          ))}
        </div>
      ) : null}

      {snapshot.observationTriggers.length ? (
        <div className="mt-4 rounded-xl border border-[#1f2a24] bg-[#050807] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b74]">Triggers</p>
          <ul className="mt-2 space-y-2 text-sm text-[#d8dfdb]">
            {snapshot.observationTriggers.map((trigger, index) => (
              <li key={`${trigger.trigger}-${index}`}>
                <span className="font-semibold text-white">{trigger.urgency.toUpperCase()}:</span> {trigger.trigger} → {trigger.action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
EOF_components_history_WeatherHistoryClient_tsx

echo "Automatic settlement tracking files applied."

# Add lead-time conditioned bias tracking.
python - <<'PY'
from pathlib import Path

# Patch types/weatherHistory.ts
p = Path('types/weatherHistory.ts')
if p.exists():
    text = p.read_text()
    if 'WeatherLeadTimeBucket' not in text:
        text = text.replace(
            'export type WeatherHistoryFamily = "daily_high" | "hourly_temperature";\n',
            'export type WeatherHistoryFamily = "daily_high" | "hourly_temperature";\n\n'
            'export type WeatherLeadTimeBucket =\n'
            '  | "post_peak"\n'
            '  | "0_3h_to_peak"\n'
            '  | "3_6h_to_peak"\n'
            '  | "6_12h_to_peak"\n'
            '  | "12_18h_to_peak"\n'
            '  | "18_30h_to_peak"\n'
            '  | "30_48h_to_peak"\n'
            '  | "2_5d_to_peak"\n'
            '  | "5d_plus_to_peak"\n'
            '  | "unknown";\n'
        )
    if 'leadTimeHours?: number | null;' not in text:
        text = text.replace(
            '  aiReview?: Record<string, unknown> | null;\n};',
            '  aiReview?: Record<string, unknown> | null;\n'
            '  leadTimeHours?: number | null;\n'
            '  leadTimeBucket?: WeatherLeadTimeBucket | null;\n'
            '  targetPeakHourLocal?: number | null;\n'
            '  temporalContextLabel?: string | null;\n'
            '};'
        )
    if '  leadTimeHours: number | null;' not in text:
        text = text.replace(
            '  eventHourLocal: number | null;\n  modelConsensus: AiModelConsensusRow[];',
            '  eventHourLocal: number | null;\n'
            '  leadTimeHours: number | null;\n'
            '  leadTimeBucket: WeatherLeadTimeBucket | null;\n'
            '  targetPeakHourLocal: number | null;\n'
            '  temporalContextLabel: string | null;\n'
            '  modelConsensus: AiModelConsensusRow[];'
        )
    if 'export type WeatherLeadTimeBiasRow' not in text:
        text = text.replace(
            'export type WeatherModelBiasRow = {\n',
            'export type WeatherLeadTimeBiasRow = {\n'
            '  source: string;\n'
            '  leadTimeBucket: WeatherLeadTimeBucket;\n'
            '  leadTimeLabel: string;\n'
            '  sampleCount: number;\n'
            '  meanErrorF: number | null;\n'
            '  meanAbsoluteErrorF: number | null;\n'
            '  exactBucketCount: number;\n'
            '  withinOneBucketCount: number;\n'
            '  notes: string;\n'
            '};\n\n'
            'export type WeatherModelBiasRow = {\n'
        )
    if '  leadTimeRows: WeatherLeadTimeBiasRow[];' not in text:
        text = text.replace(
            '  rows: WeatherModelBiasRow[];\n  notes: string[];',
            '  rows: WeatherModelBiasRow[];\n  leadTimeRows: WeatherLeadTimeBiasRow[];\n  notes: string[];'
        )
    p.write_text(text)

# Patch tracked weather event types
p = Path('types/trackedWeatherEvent.ts')
if p.exists():
    text = p.read_text()
    if 'WeatherLeadTimeBucket' not in text:
        text = text.replace('import type { WeatherHistoryFamily } from "@/types/weatherHistory";', 'import type { WeatherHistoryFamily, WeatherLeadTimeBucket } from "@/types/weatherHistory";')
    if 'leadTimeHours?: number | null;' not in text:
        text = text.replace(
            '  marketTicker?: string | null;\n};',
            '  marketTicker?: string | null;\n'
            '  leadTimeHours?: number | null;\n'
            '  leadTimeBucket?: WeatherLeadTimeBucket | null;\n'
            '  targetPeakHourLocal?: number | null;\n'
            '  temporalContextLabel?: string | null;\n'
            '};'
        )
    if '  latestLeadTimeHours: number | null;' not in text:
        text = text.replace(
            '  candidateBucketCode: string | null;\n  status: TrackedWeatherEventStatus;',
            '  candidateBucketCode: string | null;\n'
            '  latestLeadTimeHours: number | null;\n'
            '  latestLeadTimeBucket: WeatherLeadTimeBucket | null;\n'
            '  targetPeakHourLocal: number | null;\n'
            '  temporalContextLabel: string | null;\n'
            '  status: TrackedWeatherEventStatus;'
        )
    p.write_text(text)

# Patch weather history repository
p = Path('lib/data/weatherHistoryRepository.ts')
if p.exists():
    text = p.read_text()
    if 'WeatherLeadTimeBiasRow' not in text:
        text = text.replace('  WeatherHistoryFamily,\n', '  WeatherHistoryFamily,\n  WeatherLeadTimeBiasRow,\n  WeatherLeadTimeBucket,\n')
    if 'function classifyLeadTimeBucket' not in text:
        helper = '''
function normalizeDateOnly(value: unknown): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;
  const match = raw.match(/^(\\d{4}-\\d{2}-\\d{2})/);
  return match ? match[1] : null;
}

function classifyLeadTimeBucket(hours: number | null): WeatherLeadTimeBucket {
  if (hours === null || !Number.isFinite(hours)) return "unknown";
  if (hours < 0) return "post_peak";
  if (hours <= 3) return "0_3h_to_peak";
  if (hours <= 6) return "3_6h_to_peak";
  if (hours <= 12) return "6_12h_to_peak";
  if (hours <= 18) return "12_18h_to_peak";
  if (hours <= 30) return "18_30h_to_peak";
  if (hours <= 48) return "30_48h_to_peak";
  if (hours <= 120) return "2_5d_to_peak";
  return "5d_plus_to_peak";
}

function labelLeadTimeBucket(bucket: WeatherLeadTimeBucket) {
  switch (bucket) {
    case "post_peak": return "after normal peak window";
    case "0_3h_to_peak": return "0–3h before peak";
    case "3_6h_to_peak": return "3–6h before peak";
    case "6_12h_to_peak": return "6–12h before peak";
    case "12_18h_to_peak": return "12–18h before peak";
    case "18_30h_to_peak": return "18–30h before peak";
    case "30_48h_to_peak": return "30–48h before peak";
    case "2_5d_to_peak": return "2–5d before peak";
    case "5d_plus_to_peak": return "5d+ before peak";
    default: return "unknown lead time";
  }
}

function computeSnapshotLeadTime(input: WeatherForecastSnapshotInput, metadata: ReturnType<typeof inferSnapshotMetadata>) {
  const evidence = input.weatherEvidence;
  const event = getObject(evidence?.event);
  const settlementClock = getObject(getObject(evidence?.decisionSupport)?.settlementClock);
  const eventDate = normalizeDateOnly(metadata.eventDate);
  const localNowRaw = normalizeString(event?.localNow);
  const family = metadata.eventFamily ?? "daily_high";
  const targetPeakHourLocal =
    input.targetPeakHourLocal ??
    normalizeNumber(settlementClock?.normalPeakHourLocal) ??
    (family === "hourly_temperature" && typeof metadata.eventHourLocal === "number" ? metadata.eventHourLocal : 16);

  let leadTimeHours = normalizeNumber(input.leadTimeHours);

  if (leadTimeHours === null && eventDate && localNowRaw) {
    const now = new Date(localNowRaw);
    const target = new Date(`${eventDate}T${String(Math.trunc(targetPeakHourLocal)).padStart(2, "0")}:00:00`);
    if (!Number.isNaN(now.getTime()) && !Number.isNaN(target.getTime())) {
      leadTimeHours = (target.getTime() - now.getTime()) / 36e5;
    }
  }

  if (leadTimeHours === null) {
    leadTimeHours = normalizeNumber(event?.remainingHeatingHours);
  }

  const roundedLeadTime = leadTimeHours === null ? null : Number(leadTimeHours.toFixed(2));
  const leadTimeBucket = input.leadTimeBucket ?? classifyLeadTimeBucket(roundedLeadTime);
  const temporalContextLabel =
    input.temporalContextLabel ??
    (roundedLeadTime === null
      ? labelLeadTimeBucket(leadTimeBucket)
      : `${labelLeadTimeBucket(leadTimeBucket)} (${roundedLeadTime.toFixed(1)}h to ${family === "hourly_temperature" ? "event hour" : "normal peak"})`);

  return { leadTimeHours: roundedLeadTime, leadTimeBucket, targetPeakHourLocal, temporalContextLabel };
}
'''
        text = text.replace('function buildSnapshotDocument(input: WeatherForecastSnapshotInput): Omit<WeatherForecastSnapshotDocument, "id"> {', helper + '\nfunction buildSnapshotDocument(input: WeatherForecastSnapshotInput): Omit<WeatherForecastSnapshotDocument, "id"> {')
    if 'const leadTime = computeSnapshotLeadTime(input, metadata);' not in text:
        text = text.replace('  const aiReview = input.aiReview;\n\n  const evidenceSummary', '  const aiReview = input.aiReview;\n  const leadTime = computeSnapshotLeadTime(input, metadata);\n\n  const evidenceSummary')
    if '    leadTimeHours: leadTime.leadTimeHours,' not in text:
        text = text.replace(
            '    eventHourLocal: metadata.eventHourLocal ?? null,\n    modelConsensus:',
            '    eventHourLocal: metadata.eventHourLocal ?? null,\n'
            '    leadTimeHours: leadTime.leadTimeHours,\n'
            '    leadTimeBucket: leadTime.leadTimeBucket,\n'
            '    targetPeakHourLocal: leadTime.targetPeakHourLocal,\n'
            '    temporalContextLabel: leadTime.temporalContextLabel,\n'
            '    modelConsensus:'
        )
    if 'function summarizeLeadTimeBias' not in text:
        helper = '''
function summarizeLeadTimeBias(params: {
  source: string;
  leadTimeBucket: WeatherLeadTimeBucket;
  errors: number[];
  exactBucketCount: number;
  withinOneBucketCount: number;
}) : WeatherLeadTimeBiasRow {
  const sampleCount = params.errors.length;
  const meanErrorF = sampleCount ? params.errors.reduce((sum, value) => sum + value, 0) / sampleCount : null;
  const meanAbsoluteErrorF = sampleCount ? params.errors.reduce((sum, value) => sum + Math.abs(value), 0) / sampleCount : null;
  const roundedMeanError = meanErrorF === null ? null : Number(meanErrorF.toFixed(2));
  const roundedMae = meanAbsoluteErrorF === null ? null : Number(meanAbsoluteErrorF.toFixed(2));
  const leadTimeLabel = labelLeadTimeBucket(params.leadTimeBucket);

  let notes = "No usable samples yet.";
  if (sampleCount > 0 && roundedMeanError !== null) {
    if (roundedMeanError > 0.5) notes = `${params.source} has run warm by about ${roundedMeanError.toFixed(1)}°F when scanned ${leadTimeLabel}.`;
    else if (roundedMeanError < -0.5) notes = `${params.source} has run cool by about ${Math.abs(roundedMeanError).toFixed(1)}°F when scanned ${leadTimeLabel}.`;
    else notes = `${params.source} has been near-neutral when scanned ${leadTimeLabel}.`;
  }

  return { source: params.source, leadTimeBucket: params.leadTimeBucket, leadTimeLabel, sampleCount, meanErrorF: roundedMeanError, meanAbsoluteErrorF: roundedMae, exactBucketCount: params.exactBucketCount, withinOneBucketCount: params.withinOneBucketCount, notes };
}
'''
        text = text.replace('export async function getWeatherBiasSummary(params: {', helper + '\nexport async function getWeatherBiasSummary(params: {')
    if 'const leadTimeStats = new Map<' not in text:
        text = text.replace(
            '  const sourceStats = new Map<\n    string,\n    { errors: number[]; exactBucketCount: number; withinOneBucketCount: number }\n  >();',
            '  const sourceStats = new Map<\n    string,\n    { errors: number[]; exactBucketCount: number; withinOneBucketCount: number }\n  >();\n\n'
            '  const leadTimeStats = new Map<\n'
            '    string,\n'
            '    { source: string; leadTimeBucket: WeatherLeadTimeBucket; errors: number[]; exactBucketCount: number; withinOneBucketCount: number }\n'
            '  >();'
        )
    if 'const leadTimeBucket = snapshot.leadTimeBucket ?? "unknown";' not in text:
        text = text.replace(
            '      sourceStats.set(source, stats);\n    }\n  }',
            '      sourceStats.set(source, stats);\n\n'
            '      const leadTimeBucket = snapshot.leadTimeBucket ?? "unknown";\n'
            '      const leadTimeKey = `${source}|${leadTimeBucket}`;\n'
            '      const leadStats = leadTimeStats.get(leadTimeKey) ?? { source, leadTimeBucket, errors: [], exactBucketCount: 0, withinOneBucketCount: 0 };\n'
            '      leadStats.errors.push(forecastHighF - actualF);\n'
            '      if (forecastBucketLower !== null && actualBucketLower !== null && forecastBucketLower === actualBucketLower) leadStats.exactBucketCount += 1;\n'
            '      if (forecastBucketLower !== null && actualBucketLower !== null && Math.abs(forecastBucketLower - actualBucketLower) <= 1) leadStats.withinOneBucketCount += 1;\n'
            '      leadTimeStats.set(leadTimeKey, leadStats);\n'
            '    }\n  }'
        )
    if 'const leadTimeRows = Array.from(leadTimeStats.values())' not in text:
        text = text.replace(
            '  const rows = Array.from(sourceStats.entries())\n    .map(([source, stats]) => summarizeSourceBias({ source, ...stats }))\n    .sort((a, b) => b.sampleCount - a.sampleCount || a.source.localeCompare(b.source));',
            '  const rows = Array.from(sourceStats.entries())\n    .map(([source, stats]) => summarizeSourceBias({ source, ...stats }))\n    .sort((a, b) => b.sampleCount - a.sampleCount || a.source.localeCompare(b.source));\n\n'
            '  const leadTimeRows = Array.from(leadTimeStats.values())\n'
            '    .map((stats) => summarizeLeadTimeBias(stats))\n'
            '    .sort((a, b) => b.sampleCount - a.sampleCount || a.source.localeCompare(b.source) || a.leadTimeLabel.localeCompare(b.leadTimeLabel));'
        )
    if 'Lead-time rows show' not in text:
        text = text.replace(
            '    "Bias calculations compare stored forecast snapshots against manually saved resolved results.",',
            '    "Bias calculations compare stored forecast snapshots against resolved station results, including automatically resolved observations when available.",\n'
            '    "Lead-time rows show whether a source runs warm or cool depending on when the scan or AI review was captured relative to the normal peak-heating window.",'
        )
    if '    leadTimeRows,' not in text:
        text = text.replace('    rows,\n    notes,', '    rows,\n    leadTimeRows,\n    notes,')
    p.write_text(text)

# Patch tracked weather event repository
p = Path('lib/data/trackedWeatherEventRepository.ts')
if p.exists():
    text = p.read_text()
    if 'latestLeadTimeHours' not in text:
        text = text.replace(
            '    candidateBucketCode: input.candidateBucketCode ?? existingData?.candidateBucketCode ?? null,\n    status,',
            '    candidateBucketCode: input.candidateBucketCode ?? existingData?.candidateBucketCode ?? null,\n'
            '    latestLeadTimeHours: input.leadTimeHours ?? existingData?.latestLeadTimeHours ?? null,\n'
            '    latestLeadTimeBucket: input.leadTimeBucket ?? existingData?.latestLeadTimeBucket ?? null,\n'
            '    targetPeakHourLocal: input.targetPeakHourLocal ?? existingData?.targetPeakHourLocal ?? null,\n'
            '    temporalContextLabel: input.temporalContextLabel ?? existingData?.temporalContextLabel ?? null,\n'
            '    status,'
        )
    if 'leadTimeHours: input.snapshot.leadTimeHours' not in text:
        text = text.replace(
            '    marketTicker: input.snapshot.marketCode,\n  });',
            '    marketTicker: input.snapshot.marketCode,\n'
            '    leadTimeHours: input.snapshot.leadTimeHours,\n'
            '    leadTimeBucket: input.snapshot.leadTimeBucket,\n'
            '    targetPeakHourLocal: input.snapshot.targetPeakHourLocal,\n'
            '    temporalContextLabel: input.snapshot.temporalContextLabel,\n'
            '  });'
        )
    p.write_text(text)

# Patch history UI to show lead-time bias table.
p = Path('components/history/WeatherHistoryClient.tsx')
if p.exists():
    text = p.read_text()
    if 'Lead-time bias' not in text:
        table = '''
              {biasSummary.leadTimeRows?.length ? (
                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <h3 className="font-semibold text-white">Lead-time bias</h3>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    This separates source performance by when the snapshot was captured relative to the normal peak-heating window. It helps answer whether a source runs warm or cool at 18 hours out, 9 hours out, 5 hours out, and similar scan windows.
                  </p>
                  <div className="mt-4 overflow-x-auto overscroll-x-contain rounded-2xl border border-[#1f2a24]">
                    <table className="min-w-[760px] w-full text-left text-xs sm:text-sm">
                      <thead className="bg-[#101714] text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
                        <tr>
                          <th className="px-4 py-3">Source</th>
                          <th className="px-4 py-3">Lead time</th>
                          <th className="px-4 py-3">Samples</th>
                          <th className="px-4 py-3">Mean error</th>
                          <th className="px-4 py-3">MAE</th>
                          <th className="px-4 py-3">Exact bucket</th>
                          <th className="px-4 py-3">Within 1 bucket</th>
                          <th className="px-4 py-3">Read</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f2a24]">
                        {biasSummary.leadTimeRows.map((row) => (
                          <tr key={`${row.source}-${row.leadTimeBucket}`} className="text-[#d8dfdb]">
                            <td className="px-4 py-3 font-semibold text-white">{row.source}</td>
                            <td className="px-4 py-3">{row.leadTimeLabel}</td>
                            <td className="px-4 py-3">{row.sampleCount}</td>
                            <td className="px-4 py-3">{formatSignedNumber(row.meanErrorF)}°F</td>
                            <td className="px-4 py-3">{formatNumber(row.meanAbsoluteErrorF)}°F</td>
                            <td className="px-4 py-3">{row.exactBucketCount}</td>
                            <td className="px-4 py-3">{row.withinOneBucketCount}</td>
                            <td className="px-4 py-3 text-[#a8b3ad]">{row.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
'''
        text = text.replace('              {biasSummary.notes.length ? (', table + '\n              {biasSummary.notes.length ? (')
    p.write_text(text)

print('Applied lead-time conditioned bias tracking patch.')
PY

echo "Automatic settlement tracking with lead-time conditioned bias applied."
