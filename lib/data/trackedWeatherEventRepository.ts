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
