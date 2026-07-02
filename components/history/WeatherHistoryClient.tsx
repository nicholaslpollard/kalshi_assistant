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
