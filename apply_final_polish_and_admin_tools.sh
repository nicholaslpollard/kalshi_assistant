#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "Run this script from the repo root, beside package.json and app/."
  exit 1
fi

mkdir -p app/admin components/admin app/api/admin/weather-data/summary app/api/admin/weather-data/export app/api/admin/weather-data/resolve-pending

cat > app/page.tsx <<'TSX'
import Link from "next/link";

const featureCards = [
  {
    title: "Scan weather markets",
    detail: "Prioritize supported Kalshi weather events with forecast evidence, market pricing, and risk context.",
  },
  {
    title: "Review positions",
    detail: "Compare open exposure against live weather observations, forecast buckets, exit math, and AI decision reads.",
  },
  {
    title: "Learn from history",
    detail: "Track snapshots, resolved highs, source bias, and lead-time accuracy as the assistant is used.",
  },
];

const proofPoints = [
  "Manual execution only",
  "Daily high buckets treated as ranges",
  "Lead-time-aware source bias",
  "Official observations prioritized",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050807] text-[#f4f7f5]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-1 flex-col justify-center py-14 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#22c55e]">
              Kalshi Weather Assistant
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Weather-market evidence without the noise.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#a8b3ad] sm:text-lg">
              Scan supported weather markets, review active positions, compare forecast evidence, and keep trading decisions manual and disciplined.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
              >
                Open dashboard
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center rounded-xl border border-[#25332b] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Scan events
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-transparent px-5 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 pb-10 md:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proofPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-[#25332b] bg-[#050807] px-4 py-3 text-sm font-semibold text-[#d7ded9]">
                {point}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
TSX

cat > app/dashboard/page.tsx <<'TSX'
import Link from "next/link";

const actions = [
  {
    href: "/positions",
    title: "Review positions",
    detail: "Check current exposure, market pricing, weather evidence, and sell-vs-hold context.",
  },
  {
    href: "/events",
    title: "Scan events",
    detail: "Rank supported weather markets by forecast edge, price discipline, risk, and bias history.",
  },
  {
    href: "/history",
    title: "Open history",
    detail: "Review forecast snapshots, resolved results, trends, and lead-time source bias.",
  },
  {
    href: "/admin",
    title: "Data tools",
    detail: "Export history, run pending settlement resolution, and review tracking counts.",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-4 py-8 text-[#f4f7f5] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22c55e]">Dashboard</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Choose the next review.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad] sm:text-base">
            The assistant keeps analysis separated into a few focused workflows: positions, event scanning, historical learning, and data upkeep.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 transition hover:border-[#22c55e] hover:bg-[#132019]"
            >
              <h2 className="text-xl font-semibold text-white group-hover:text-[#22c55e]">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">{action.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
TSX

cat > components/admin/AdminToolsClient.tsx <<'TSX'
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
TSX

cat > app/admin/page.tsx <<'TSX'
import { AdminToolsClient } from "@/components/admin/AdminToolsClient";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-4 py-8 text-[#f4f7f5] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22c55e]">Data tools</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Keep weather history clean and useful.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad] sm:text-base">
            These tools are for maintenance, export, and automatic settlement checks. They do not place trades or change Kalshi positions.
          </p>
        </div>
        <AdminToolsClient />
      </section>
    </main>
  );
}
TSX

cat > app/api/admin/weather-data/summary/route.ts <<'TS'
import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTIONS = [
  "weatherForecastSnapshots",
  "weatherResolvedResults",
  "trackedWeatherEvents",
] as const;

async function limitedCount(uid: string, collectionName: string, limit = 1000) {
  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .collection(collectionName)
    .limit(limit)
    .get();

  return {
    name: collectionName,
    count: snapshot.size,
    limited: snapshot.size >= limit,
    docs: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Array<Record<string, unknown>>,
  };
}

function statusCounts(docs: Array<Record<string, unknown>>) {
  const statuses: Record<string, number> = {};
  let needsAttention = 0;

  for (const doc of docs) {
    const status = typeof doc.status === "string" ? doc.status : "unknown";
    statuses[status] = (statuses[status] ?? 0) + 1;
    if (status === "needs_review" || status === "error") needsAttention += 1;
  }

  return { statuses, needsAttention };
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const counted = await Promise.all(COLLECTIONS.map((name) => limitedCount(user.uid, name)));
    const tracked = counted.find((item) => item.name === "trackedWeatherEvents");

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      collections: counted.map(({ name, count, limited }) => ({ name, count, limited })),
      tracking: statusCounts(tracked?.docs ?? []),
    });
  } catch (error) {
    console.error("Weather admin summary failed:", error);
    const message = error instanceof Error ? error.message : "Unknown admin summary error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
TS

cat > app/api/admin/weather-data/export/route.ts <<'TS'
import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTIONS = [
  "weatherForecastSnapshots",
  "weatherResolvedResults",
  "trackedWeatherEvents",
] as const;

async function readCollection(uid: string, collectionName: string, limit = 2000) {
  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .collection(collectionName)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()
    .catch(async () => {
      return adminDb.collection("users").doc(uid).collection(collectionName).limit(limit).get();
    });

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await Promise.all(
      COLLECTIONS.map(async (name) => [name, await readCollection(user.uid, name)] as const)
    );

    const payload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      userId: user.uid,
      collections: Object.fromEntries(entries),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="kalshi-weather-history-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Weather admin export failed:", error);
    const message = error instanceof Error ? error.message : "Unknown admin export error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
TS

cat > app/api/admin/weather-data/resolve-pending/route.ts <<'TS'
import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { resolvePendingTrackedWeatherEvents } from "@/lib/weather/weatherSettlementResolver";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readLimit(value: unknown) {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : 50;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 50;
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

    const summary = await resolvePendingTrackedWeatherEvents(user.uid, readLimit(body.limit));
    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), summary });
  } catch (error) {
    console.error("Weather admin pending resolver failed:", error);
    const message = error instanceof Error ? error.message : "Unknown admin resolver error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
TS

python - <<'PY'
from pathlib import Path
path = Path('components/layout/AppNav.tsx')
if path.exists():
    text = path.read_text()
    if 'href: "/admin"' not in text:
        if '{ href: "/settings/credentials", label: "Credentials" }' in text:
            text = text.replace(
                '{ href: "/settings/credentials", label: "Credentials" }',
                '{ href: "/admin", label: "Data Tools" },\n  { href: "/settings/credentials", label: "Credentials" }'
            )
        elif 'label: "History"' in text:
            text = text.replace(
                '{ href: "/history", label: "History" },',
                '{ href: "/history", label: "History" },\n  { href: "/admin", label: "Data Tools" },'
            )
        else:
            text = text.replace(
                'const NAV_LINKS = [',
                'const NAV_LINKS = [\n  { href: "/admin", label: "Data Tools" },'
            )
        path.write_text(text)
        print('Added Data Tools nav link.')
    else:
        print('Data Tools nav link already present.')
else:
    print('components/layout/AppNav.tsx not found; skipped nav patch.')
PY

echo "Final polish and admin tools update applied. Run: npm run build"
