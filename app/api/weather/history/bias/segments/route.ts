import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseDoc = Record<string, unknown> & { id?: string };

type SegmentAccumulator = {
  stationId: string | null;
  stationName: string | null;
  eventFamily: string | null;
  leadTimeBucket: string;
  source: string;
  errors: number[];
  exactBucketCount: number;
  withinOneBucketCount: number;
  leadTimeHours: number[];
};

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

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function parseLimit(value: string | null, fallback: number, min: number, max: number) {
  const parsed = value ? Number(value) : fallback;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

function bucketLower(bucket: string | null) {
  if (!bucket) return null;
  const match = bucket.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function bucketFromTemperatureF(value: number | null) {
  if (value === null) return null;
  const lower = Math.floor(value);
  return `${lower}° to ${lower + 1}°`;
}

function resultKey(value: LooseDoc) {
  const stationId = normalizeString(value.stationId);
  const eventDate = normalizeString(value.eventDate);
  const eventFamily = normalizeString(value.eventFamily) ?? "daily_high";
  const eventHourLocal = normalizeNumber(value.eventHourLocal);

  if (!stationId || !eventDate) return null;
  return `${stationId}_${eventDate}_${eventFamily}_${eventHourLocal ?? "day"}`;
}

function snapshotLeadTimeBucket(snapshot: LooseDoc) {
  const direct = normalizeString(snapshot.leadTimeBucket);
  if (direct) return direct;

  const settlementClock = getObject(snapshot.settlementClock);
  const fromClock =
    normalizeString(settlementClock?.leadTimeBucket) ??
    normalizeString(settlementClock?.temporalContext) ??
    normalizeString(settlementClock?.leadTimeLabel);

  if (fromClock) return fromClock;

  const leadTimeHours = normalizeNumber(snapshot.leadTimeHours ?? settlementClock?.leadTimeHours);
  if (leadTimeHours === null) return "unknown lead time";
  if (leadTimeHours < 0) return "after peak window";
  if (leadTimeHours <= 3) return "0–3h before peak";
  if (leadTimeHours <= 6) return "3–6h before peak";
  if (leadTimeHours <= 12) return "6–12h before peak";
  if (leadTimeHours <= 18) return "12–18h before peak";
  if (leadTimeHours <= 30) return "18–30h before peak";
  if (leadTimeHours <= 48) return "30–48h before peak";
  if (leadTimeHours <= 120) return "2–5d before peak";
  return "5d+ before peak";
}

function snapshotLeadTimeHours(snapshot: LooseDoc) {
  const settlementClock = getObject(snapshot.settlementClock);
  return normalizeNumber(snapshot.leadTimeHours ?? settlementClock?.leadTimeHours);
}

function summarizeSegment(key: string, segment: SegmentAccumulator) {
  const sampleCount = segment.errors.length;
  const meanErrorF = sampleCount
    ? segment.errors.reduce((sum, value) => sum + value, 0) / sampleCount
    : null;
  const meanAbsoluteErrorF = sampleCount
    ? segment.errors.reduce((sum, value) => sum + Math.abs(value), 0) / sampleCount
    : null;
  const exactBucketRate = sampleCount ? segment.exactBucketCount / sampleCount : null;
  const withinOneBucketRate = sampleCount ? segment.withinOneBucketCount / sampleCount : null;
  const meanLeadTimeHours = segment.leadTimeHours.length
    ? segment.leadTimeHours.reduce((sum, value) => sum + value, 0) / segment.leadTimeHours.length
    : null;
  const warmMissCount = segment.errors.filter((value) => value > 0.5).length;
  const coolMissCount = segment.errors.filter((value) => value < -0.5).length;

  let read = "Needs more samples.";
  if (sampleCount > 0 && meanErrorF !== null) {
    if (meanErrorF > 0.5) {
      read = `${segment.source} has run warm by about ${meanErrorF.toFixed(1)}°F for ${segment.leadTimeBucket}.`;
    } else if (meanErrorF < -0.5) {
      read = `${segment.source} has run cool by about ${Math.abs(meanErrorF).toFixed(1)}°F for ${segment.leadTimeBucket}.`;
    } else {
      read = `${segment.source} has been near-neutral for ${segment.leadTimeBucket}.`;
    }
  }

  return {
    id: key,
    stationId: segment.stationId,
    stationName: segment.stationName,
    eventFamily: segment.eventFamily,
    leadTimeBucket: segment.leadTimeBucket,
    meanLeadTimeHours: meanLeadTimeHours === null ? null : Number(meanLeadTimeHours.toFixed(1)),
    source: segment.source,
    sampleCount,
    meanErrorF: meanErrorF === null ? null : Number(meanErrorF.toFixed(2)),
    meanAbsoluteErrorF: meanAbsoluteErrorF === null ? null : Number(meanAbsoluteErrorF.toFixed(2)),
    warmMissCount,
    coolMissCount,
    exactBucketCount: segment.exactBucketCount,
    exactBucketRate: exactBucketRate === null ? null : Number((exactBucketRate * 100).toFixed(1)),
    withinOneBucketCount: segment.withinOneBucketCount,
    withinOneBucketRate: withinOneBucketRate === null ? null : Number((withinOneBucketRate * 100).toFixed(1)),
    read,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const stationIdFilter = normalizeString(url.searchParams.get("stationId"));
    const eventFamilyFilter = normalizeString(url.searchParams.get("eventFamily"));
    const limit = parseLimit(url.searchParams.get("limit"), 500, 25, 1500);

    let snapshotQuery: FirebaseFirestore.Query = adminDb
      .collection("users")
      .doc(user.uid)
      .collection("weatherForecastSnapshots");

    let resolvedQuery: FirebaseFirestore.Query = adminDb
      .collection("users")
      .doc(user.uid)
      .collection("weatherResolvedResults");

    if (stationIdFilter) {
      snapshotQuery = snapshotQuery.where("stationId", "==", stationIdFilter);
      resolvedQuery = resolvedQuery.where("stationId", "==", stationIdFilter);
    }

    if (eventFamilyFilter) {
      snapshotQuery = snapshotQuery.where("eventFamily", "==", eventFamilyFilter);
      resolvedQuery = resolvedQuery.where("eventFamily", "==", eventFamilyFilter);
    }

    const [snapshotDocs, resolvedDocs] = await Promise.all([
      snapshotQuery.limit(limit).get(),
      resolvedQuery.limit(limit).get(),
    ]);

    const snapshots: LooseDoc[] = snapshotDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const resolvedResults: LooseDoc[] = resolvedDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const resolvedByKey = new Map<string, LooseDoc>();
    for (const result of resolvedResults) {
      const key = resultKey(result);
      if (key) resolvedByKey.set(key, result);
    }

    const segments = new Map<string, SegmentAccumulator>();

    for (const snapshot of snapshots) {
      const key = resultKey(snapshot);
      if (!key) continue;

      const resolved = resolvedByKey.get(key);
      if (!resolved) continue;

      const actualF = normalizeNumber(resolved.resolvedHighF ?? resolved.resolvedTemperatureF);
      if (actualF === null) continue;

      const actualBucketLower = bucketLower(normalizeString(resolved.resolvedBucket) ?? bucketFromTemperatureF(actualF));
      const leadTimeBucket = snapshotLeadTimeBucket(snapshot);
      const leadTimeHours = snapshotLeadTimeHours(snapshot);
      const modelConsensus = getArray(snapshot.modelConsensus);

      for (const row of modelConsensus) {
        const source = normalizeString(row.source);
        const forecastHighF = normalizeNumber(row.forecastHighF);
        if (!source || forecastHighF === null) continue;

        const forecastBucketLower = bucketLower(normalizeString(row.bucket) ?? bucketFromTemperatureF(forecastHighF));
        const segmentKey = [
          normalizeString(snapshot.stationId) ?? "unknown-station",
          normalizeString(snapshot.eventFamily) ?? "daily_high",
          leadTimeBucket,
          source,
        ].join("|");

        const segment = segments.get(segmentKey) ?? {
          stationId: normalizeString(snapshot.stationId),
          stationName: normalizeString(snapshot.stationName),
          eventFamily: normalizeString(snapshot.eventFamily) ?? "daily_high",
          leadTimeBucket,
          source,
          errors: [],
          exactBucketCount: 0,
          withinOneBucketCount: 0,
          leadTimeHours: [],
        };

        segment.errors.push(forecastHighF - actualF);
        if (leadTimeHours !== null) segment.leadTimeHours.push(leadTimeHours);

        if (forecastBucketLower !== null && actualBucketLower !== null) {
          if (forecastBucketLower === actualBucketLower) segment.exactBucketCount += 1;
          if (Math.abs(forecastBucketLower - actualBucketLower) <= 1) segment.withinOneBucketCount += 1;
        }

        segments.set(segmentKey, segment);
      }
    }

    const rows = Array.from(segments.entries())
      .map(([key, segment]) => summarizeSegment(key, segment))
      .sort((a, b) => {
        if (b.sampleCount !== a.sampleCount) return b.sampleCount - a.sampleCount;
        if ((a.meanAbsoluteErrorF ?? 999) !== (b.meanAbsoluteErrorF ?? 999)) {
          return (a.meanAbsoluteErrorF ?? 999) - (b.meanAbsoluteErrorF ?? 999);
        }
        return `${a.stationId ?? ""}${a.leadTimeBucket}${a.source}`.localeCompare(`${b.stationId ?? ""}${b.leadTimeBucket}${b.source}`);
      });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      filters: {
        stationId: stationIdFilter,
        eventFamily: eventFamilyFilter,
        limit,
      },
      snapshotCount: snapshots.length,
      resolvedResultCount: resolvedResults.length,
      matchedSegmentCount: rows.length,
      rows,
      notes: [
        "Lead-time segments compare forecast snapshots against resolved NWS-based results for the same station/date/family/hour.",
        "Positive mean error means the source ran warm; negative mean error means it ran cool.",
        "This endpoint is designed to power future bias-weighted scanner ranking and station-specific model selection.",
      ],
    });
  } catch (error) {
    console.error("Lead-time bias segment request failed:", error);
    const message = error instanceof Error ? error.message : "Unknown lead-time bias segment error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
