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
    return "No bid";
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
              Read-only import of your current open Kalshi positions using your
              encrypted saved credentials.
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

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
          >
            Dashboard
          </Link>
          <Link
            href="/settings/credentials"
            className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
          >
            Credentials
          </Link>
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
        <section className="overflow-hidden rounded-3xl border border-[#1f2a24] bg-[#101714]">
          <div className="border-b border-[#1f2a24] p-5">
            <p className="text-sm text-[#a8b3ad]">
              Showing {positions.length} open position
              {positions.length === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
              <thead className="bg-[#0b120f] text-[#a8b3ad]">
                <tr>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Ticker
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Side
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Contracts
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Entry
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Current bid
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Exposure
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Exit value
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Fees
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Unrealized P/L
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Total P/L
                  </th>
                  <th className="border-b border-[#1f2a24] px-4 py-3 font-semibold">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr
                    key={position.ticker}
                    className="border-b border-[#1f2a24] last:border-b-0"
                  >
                    <td className="px-4 py-4 font-mono text-xs text-white">
                      {position.ticker}
                    </td>
                    <td className="px-4 py-4">
                      <SideBadge side={position.side} />
                    </td>
                    <td className="px-4 py-4 text-[#f4f7f5]">
                      {formatNumber(position.contractCount)}
                    </td>
                    <td className="px-4 py-4 text-[#f4f7f5]">
                      {formatContractPrice(position.estimatedEntryPrice)}
                    </td>
                    <td className="px-4 py-4 text-[#f4f7f5]">
                      {position.hasCurrentBid
                        ? formatContractPrice(position.currentBidPrice)
                        : "No bid"}
                    </td>
                    <td className="px-4 py-4 text-[#f4f7f5]">
                      {formatDollars(position.marketExposureDollars)}
                    </td>
                    <td className="px-4 py-4 text-[#f4f7f5]">
                      {formatDollars(position.currentExitValueDollars)}
                    </td>
                    <td className="px-4 py-4 text-[#f4f7f5]">
                      {formatDollars(position.feesPaidDollars)}
                    </td>
                    <td
                      className={`px-4 py-4 font-semibold ${getPnlClass(
                        position.unrealizedPnlAfterFeesDollars
                      )}`}
                    >
                      {formatDollars(position.unrealizedPnlAfterFeesDollars)}
                    </td>
                    <td
                      className={`px-4 py-4 font-semibold ${getPnlClass(
                        position.totalPnlDollars
                      )}`}
                    >
                      {formatDollars(position.totalPnlDollars)}
                    </td>
                    <td className="px-4 py-4 text-[#a8b3ad]">
                      {formatDate(position.lastUpdatedTs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}