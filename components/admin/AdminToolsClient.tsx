"use client";

import { useMemo, useState } from "react";

type SummaryPayload = {
  ok?: boolean;
  generatedAt?: string;
  collections?: Array<{ name: string; count: number; limited: boolean }>;
  tracking?: {
    statuses: Record<string, number>;
    needsAttention: number;
  };
  error?: string;
};

type ResolvePayload = {
  ok?: boolean;
  generatedAt?: string;
  summary?: {
    checked: number;
    resolved: number;
    needsReview: number;
    errors: number;
    skipped: number;
  };
  error?: string;
};

function formatDate(value: string | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-[#25332b] bg-[#050807] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f7b74]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export function AdminToolsClient() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [resolveResult, setResolveResult] = useState<ResolvePayload | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const collectionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of summary?.collections ?? []) {
      map.set(item.name, item.count);
    }
    return map;
  }, [summary]);

  async function loadSummary() {
    setLoadingSummary(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/weather-data/summary", { cache: "no-store" });
      const payload = (await response.json()) as SummaryPayload;
      setSummary(payload);
      if (!response.ok) setMessage(payload.error ?? "Unable to load data summary.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load data summary.");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function resolvePending() {
    setResolving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/weather-data/resolve-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const payload = (await response.json()) as ResolvePayload;
      setResolveResult(payload);
      if (!response.ok) setMessage(payload.error ?? "Unable to resolve pending events.");
      await loadSummary();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resolve pending events.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#22c55e]">Weather data</p>
            <h2 className="mt-2 text-2xl font-bold text-white">History and tracking upkeep</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#a8b3ad]">
              Review saved weather-history records, run pending settlement resolution, and export data for backup or analysis.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={loadSummary}
              disabled={loadingSummary}
              className="rounded-xl border border-[#25332b] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSummary ? "Loading..." : "Refresh summary"}
            </button>
            <button
              type="button"
              onClick={resolvePending}
              disabled={resolving}
              className="rounded-xl bg-[#22c55e] px-4 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resolving ? "Resolving..." : "Resolve pending"}
            </button>
            <a
              href="/api/admin/weather-data/export"
              className="rounded-xl border border-[#25332b] px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-[#22c55e]"
            >
              Export JSON
            </a>
          </div>
        </div>
        {message ? (
          <div className="mt-5 rounded-2xl border border-[#7f1d1d] bg-[#2b1010] p-4 text-sm leading-6 text-[#fecaca]">{message}</div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Snapshots" value={collectionMap.get("weatherForecastSnapshots") ?? "—"} />
        <StatCard label="Resolved results" value={collectionMap.get("weatherResolvedResults") ?? "—"} />
        <StatCard label="Tracked events" value={collectionMap.get("trackedWeatherEvents") ?? "—"} />
        <StatCard label="Need attention" value={summary?.tracking?.needsAttention ?? "—"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
          <h3 className="text-lg font-semibold text-white">Tracking status</h3>
          <p className="mt-2 text-sm text-[#a8b3ad]">Last refreshed: {formatDate(summary?.generatedAt)}</p>
          <div className="mt-4 grid gap-2">
            {Object.entries(summary?.tracking?.statuses ?? {}).length ? (
              Object.entries(summary?.tracking?.statuses ?? {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-2xl border border-[#25332b] bg-[#050807] px-4 py-3 text-sm">
                  <span className="font-semibold text-white">{status}</span>
                  <span className="text-[#a8b3ad]">{count}</span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-[#25332b] bg-[#050807] p-4 text-sm text-[#a8b3ad]">
                Refresh the summary to show tracking statuses.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
          <h3 className="text-lg font-semibold text-white">Latest resolver run</h3>
          <p className="mt-2 text-sm text-[#a8b3ad]">Run time: {formatDate(resolveResult?.generatedAt)}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <StatCard label="Checked" value={resolveResult?.summary?.checked ?? "—"} />
            <StatCard label="Resolved" value={resolveResult?.summary?.resolved ?? "—"} />
            <StatCard label="Needs review" value={resolveResult?.summary?.needsReview ?? "—"} />
            <StatCard label="Skipped/errors" value={`${resolveResult?.summary?.skipped ?? "—"} / ${resolveResult?.summary?.errors ?? "—"}`} />
          </div>
        </div>
      </section>
    </div>
  );
}
