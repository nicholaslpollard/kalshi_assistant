import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
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
