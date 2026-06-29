"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type NormalizedPosition = {
  ticker: string;
  side: "yes" | "no" | "flat" | "unknown";
  positionFp: number | null;
  contractCount: number | null;
  marketExposureDollars: number | null;
  feesPaidDollars: number | null;
  realizedPnlDollars: number | null;
  totalTradedDollars: number | null;
  estimatedEntryPrice: number | null;
  currentBidPrice: number | null;
  hasCurrentBid: boolean;
  currentExitValueDollars: number | null;
  unrealizedPnlBeforeFeesDollars: number | null;
  unrealizedPnlAfterFeesDollars: number | null;
  totalPnlDollars: number | null;
  lastUpdatedTs: string | null;
};

function formatDollars(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatContractPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function getPnlClass(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "text-[#f4f7f5]";
  }

  if (value > 0) {
    return "text-[#22c55e]";
  }

  if (value < 0) {
    return "text-[#fecaca]";
  }

  return "text-[#f4f7f5]";
}

function SideBadge({ side }: { side: NormalizedPosition["side"] }) {
  const label = side.toUpperCase();

  if (side === "yes") {
    return (
      <span className="rounded-full border border-[#22c55e]/40 bg-[#0b2a18] px-3 py-1 text-xs font-semibold text-[#bbf7d0]">
        {label}
      </span>
    );
  }

  if (side === "no") {
    return (
      <span className="rounded-full border border-[#38bdf8]/40 bg-[#082335] px-3 py-1 text-xs font-semibold text-[#bae6fd]">
        {label}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-[#6f7b74]/40 bg-[#0b120f] px-3 py-1 text-xs font-semibold text-[#a8b3ad]">
      {label}
    </span>
  );
}

function InlineMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-[110px]">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#6f7b74]">
        {label}
      </p>
      <p className={valueClassName ?? "mt-1 text-sm font-semibold text-white"}>
        {value}
      </p>
    </div>
  );
}

function PositionCard({ position }: { position: NormalizedPosition }) {
  const detailHref = `/positions/${encodeURIComponent(position.ticker)}`;

  return (
    <Link
      href={detailHref}
      className="group block rounded-2xl border border-[#1f2a24] bg-[#101714] p-4 transition hover:border-[#22c55e]/70 hover:bg-[#111c17]"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SideBadge side={position.side} />

            <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold text-[#a8b3ad]">
              Owned: {formatNumber(position.contractCount)} contracts
            </span>

            <span className="text-xs text-[#6f7b74]">
              Updated {formatDate(position.lastUpdatedTs)}
            </span>
          </div>

          <h2 className="mt-3 break-all font-mono text-base font-bold text-white">
            {position.ticker}
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 xl:flex xl:items-center">
          <InlineMetric
            label="Entry"
            value={formatContractPrice(position.estimatedEntryPrice)}
          />

          <InlineMetric
            label="Bid"
            value={
              position.hasCurrentBid
                ? formatContractPrice(position.currentBidPrice)
                : "No bid"
            }
          />

          <InlineMetric
            label="Exit value"
            value={formatDollars(position.currentExitValueDollars)}
          />

          <InlineMetric
            label="Unrealized"
            value={formatDollars(position.unrealizedPnlAfterFeesDollars)}
            valueClassName={`mt-1 text-sm font-semibold ${getPnlClass(
              position.unrealizedPnlAfterFeesDollars
            )}`}
          />

          <div className="rounded-xl border border-[#1f2a24] px-4 py-2 text-center text-sm font-semibold text-[#a8b3ad] transition group-hover:border-[#22c55e] group-hover:text-[#22c55e]">
            Open detail →
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PositionsClient() {
  const [positions, setPositions] = useState<NormalizedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  async function loadPositions() {
    setLoading(true);
    setError("");

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch("/api/positions", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const body = await response.json();

      if (!response.ok) {
        const kalshiDetail = body?.kalshiBody
          ? ` Kalshi said: ${JSON.stringify(body.kalshiBody)}`
          : "";

        throw new Error(
          `${body?.error ?? "Unable to load positions."}${kalshiDetail}`
        );
      }

      setPositions(body.positions ?? []);
      setLoaded(true);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to load positions.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPositions();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Positions
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Open Kalshi positions
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              Click a position card to open the full command center for that
              market, including Kalshi data, weather data, sell-vs-hold math,
              and position review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadPositions()}
            disabled={loading}
            className="rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh positions"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-6 text-[#fecaca]">
          {error}
        </section>
      ) : null}

      {!error && loaded && positions.length === 0 ? (
        <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
          <h2 className="text-xl font-bold text-white">
            No open positions found
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            Kalshi returned no positions with a non-zero position count.
          </p>
        </section>
      ) : null}

      {positions.length > 0 ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
            <p className="text-sm text-[#a8b3ad]">
              Showing {positions.length} open position
              {positions.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="grid gap-3">
            {positions.map((position) => (
              <PositionCard key={position.ticker} position={position} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}