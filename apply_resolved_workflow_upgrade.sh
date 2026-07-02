#!/usr/bin/env bash
set -euo pipefail

mkdir -p lib/weather
cat > lib/weather/bucketUtils.ts <<'TS_EOF'
export type ParsedDailyHighBucket = {
  kind: "daily_high_range";
  raw: string;
  lowerF: number;
  upperF: number;
  label: string;
  kalshiCode: string;
};

export type ParsedHourlyThreshold = {
  kind: "hourly_threshold";
  raw: string;
  thresholdF: number;
  label: string;
  kalshiCode: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stripTrailingZero(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function dailyHighBucketFromTemperatureF(value: unknown): string | null {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!isFiniteNumber(numeric)) {
    return null;
  }

  const lower = Math.floor(numeric);
  return `${lower}° to ${lower + 1}°`;
}

export function dailyHighBucketCodeFromTemperatureF(value: unknown): string | null {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!isFiniteNumber(numeric)) {
    return null;
  }

  const lower = Math.floor(numeric);
  return `B${stripTrailingZero(lower + 0.5)}`;
}

export function parseDailyHighBucketCode(value: unknown): ParsedDailyHighBucket | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(/^B(-?\d+(?:\.\d+)?)$/i);
  const tickerMatch = trimmed.match(/(?:^|[-_])B(-?\d+(?:\.\d+)?)(?:$|[-_])/i);
  const match = directMatch ?? tickerMatch;

  if (!match) {
    return null;
  }

  const midpoint = Number(match[1]);
  if (!Number.isFinite(midpoint)) {
    return null;
  }

  const lower = Math.floor(midpoint);
  const upper = lower + 1;
  const code = `B${stripTrailingZero(midpoint)}`;

  return {
    kind: "daily_high_range",
    raw: trimmed,
    lowerF: lower,
    upperF: upper,
    label: `${lower}° to ${upper}°`,
    kalshiCode: code,
  };
}

export function parseHourlyThresholdCode(value: unknown): ParsedHourlyThreshold | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(/^T(-?\d+(?:\.\d+)?)$/i);
  const tickerMatch = trimmed.match(/(?:^|[-_])T(-?\d+(?:\.\d+)?)(?:$|[-_])/i);
  const match = directMatch ?? tickerMatch;

  if (!match) {
    return null;
  }

  const rawThreshold = Number(match[1]);
  if (!Number.isFinite(rawThreshold)) {
    return null;
  }

  // Kalshi hourly temperature contracts often encode 69.99 to mean 70° or above.
  const threshold = Number.isInteger(rawThreshold) ? rawThreshold : Math.ceil(rawThreshold);
  const code = `T${stripTrailingZero(rawThreshold)}`;

  return {
    kind: "hourly_threshold",
    raw: trimmed,
    thresholdF: threshold,
    label: `${threshold}° or above`,
    kalshiCode: code,
  };
}

export function normalizeDailyHighBucketLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return dailyHighBucketFromTemperatureF(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedCode = parseDailyHighBucketCode(trimmed);
  if (parsedCode) {
    return parsedCode.label;
  }

  const rangeMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*(?:°|deg|degrees)?\s*(?:to|-|–|—)\s*(-?\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const lower = Math.floor(Number(rangeMatch[1]));
    const upper = Math.ceil(Number(rangeMatch[2]));
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      return `${lower}° to ${upper}°`;
    }
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return dailyHighBucketFromTemperatureF(numeric);
  }

  return trimmed;
}

export function inferResolvedBucket(input: {
  eventFamily?: string | null;
  resolvedBucket?: unknown;
  resolvedHighF?: unknown;
  resolvedTemperatureF?: unknown;
  marketTicker?: unknown;
}) {
  const explicitBucket =
    typeof input.resolvedBucket === "string" && input.resolvedBucket.trim()
      ? input.resolvedBucket.trim()
      : null;

  if (explicitBucket) {
    if (input.eventFamily === "hourly_temperature") {
      return parseHourlyThresholdCode(explicitBucket)?.label ?? explicitBucket;
    }

    return normalizeDailyHighBucketLabel(explicitBucket);
  }

  if (input.eventFamily === "hourly_temperature") {
    const fromTicker = parseHourlyThresholdCode(input.marketTicker);
    if (fromTicker) {
      return fromTicker.label;
    }

    const temp =
      typeof input.resolvedTemperatureF === "string"
        ? Number(input.resolvedTemperatureF)
        : input.resolvedTemperatureF;

    return isFiniteNumber(temp) ? `${Math.round(temp)}° observed` : null;
  }

  const fromTicker = parseDailyHighBucketCode(input.marketTicker);
  if (fromTicker) {
    return fromTicker.label;
  }

  return dailyHighBucketFromTemperatureF(input.resolvedHighF);
}

TS_EOF

mkdir -p app/api/weather/history/resolved
cat > app/api/weather/history/resolved/route.ts <<'TS_EOF'
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

TS_EOF

mkdir -p components/history
cat > components/history/WeatherHistoryClient.tsx <<'TSX_EOF'
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
  WeatherResolvedResultDocument,
} from "@/types/weatherHistory";
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

type HistoryTab = "bias" | "snapshots" | "resolved" | "add_result" | "settlement_tools";

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
    <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5 shadow-xl shadow-black/20">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
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
      ? "rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60";

  return <button {...props} className={className} />;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#1f2a24] bg-[#050807] px-2.5 py-1 text-xs font-semibold text-[#a8b3ad]">
      {children}
    </span>
  );
}

export function WeatherHistoryClient() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("bias");
  const [stationId, setStationId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventFamily, setEventFamily] = useState<"" | WeatherHistoryFamily>("daily_high");
  const [limit, setLimit] = useState("100");

  const [snapshots, setSnapshots] = useState<WeatherForecastSnapshotDocument[]>([]);
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
    if (activeTab === "snapshots") void loadSnapshots();
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
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22c55e]">
              Weather history
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Model Bias & Forecast History</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a8b3ad]">
              Review saved AI forecast snapshots, enter resolved station results, and measure which sources have recently run warm or cool by station and market family.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 min-[520px]:flex min-[520px]:flex-wrap">
            {([
              ["bias", "Model bias"],
              ["snapshots", "Snapshots"],
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
                    ? "rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008]"
                    : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Panel title="Filters" description="Use station IDs like KDEN, KDCA, KNYC, KORD, KLAX, KMIA, KBOS, KPHL, KATL, KAUS.">
        <div className="grid gap-4 md:grid-cols-4">
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

        <div className="mt-4 flex flex-wrap gap-3">
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
        </div>

        {status ? <p className="mt-4 text-sm text-[#22c55e]">{status}</p> : null}
        {error ? <p className="mt-4 text-sm text-[#fecaca]">{error}</p> : null}
      </Panel>

      {activeTab === "bias" ? (
        <Panel
          title="Model/source bias"
          description="Bias compares saved model forecast rows against manually saved resolved results for the same station/date/family. Positive mean error means the source ran warm; negative means it ran cool."
        >
          {biasSummary ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <SummaryCard label="Station" value={biasSummary.stationId ?? "All"} />
                <SummaryCard label="Snapshots" value={String(biasSummary.sampleCount)} />
                <SummaryCard label="Resolved results" value={String(biasSummary.resolvedResultCount)} />
                <SummaryCard label="Generated" value={formatDateTime(biasSummary.generatedAt)} />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#1f2a24]">
                <table className="min-w-[850px] w-full text-left text-sm">
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
        <Panel title="Resolved results" description="Manual settlement results used for later model-bias calculations.">
          {resolvedResults.length ? (
            <div className="overflow-x-auto rounded-2xl border border-[#1f2a24]">
              <table className="min-w-[760px] w-full text-left text-sm">
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
          <div className="grid gap-4 lg:grid-cols-3">
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
            <div className="grid gap-4 md:grid-cols-3">
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
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#1f2a24]">
          <table className="min-w-[700px] w-full text-left text-sm">
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
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

TSX_EOF

echo "Resolved-result workflow and bucket settlement tools applied."
