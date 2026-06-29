"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type BasketMarket = {
  ticker: string;
  label: string;
  yesBid: number | null;
  yesAskFromNoBid: number | null;
  noBid: number | null;
  noAskFromYesBid: number | null;
  impliedProbability: number | null;
  volume: number | null;
  openInterest: number | null;
  status: unknown;
  isHeld: boolean;
  raw: Record<string, unknown>;
};

type PositionDetail = {
  ticker: string;
  position: {
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
    maxPayoutDollars: number | null;
    remainingUpsideIfWinDollars: number | null;
    riskIfHeldInsteadOfSoldDollars: number | null;
    allInCostDollars: number | null;
    breakEvenBidPrice: number | null;
    lastUpdatedTs: string | null;
    raw: Record<string, unknown>;
  };
  market: Record<string, unknown> | null;
  event: Record<string, unknown> | null;
  basketMarkets: BasketMarket[];
  orderbook: {
    orderbook_fp?: {
      yes_dollars?: [string, string][];
      no_dollars?: [string, string][];
    };
    orderbook?: {
      yes?: [number, number][];
      no?: [number, number][];
    };
  } | null;
  diagnostics: Record<string, unknown>;
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

function formatPrice(value: number | null) {
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

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${(value * 100).toFixed(1)}%`;
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

function pnlClass(value: number | null) {
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

function DataCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </p>
      <p className={valueClassName ?? "mt-2 text-xl font-bold text-white"}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function BasketMarketsTable({ markets }: { markets: BasketMarket[] }) {
  if (!markets || markets.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 text-sm text-[#a8b3ad]">
        No sibling basket markets found for this event.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f2a24] bg-[#0b120f]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="text-[#a8b3ad]">
            <tr>
              <th className="border-b border-[#1f2a24] px-4 py-3">Basket</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">YES bid</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                YES ask est.
              </th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                Implied %
              </th>
              <th className="border-b border-[#1f2a24] px-4 py-3">NO bid</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">Volume</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                Open interest
              </th>
              <th className="border-b border-[#1f2a24] px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr
                key={market.ticker}
                className={
                  market.isHeld
                    ? "border-b border-[#1f2a24] bg-[#0b2a18]/40"
                    : "border-b border-[#1f2a24]"
                }
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">
                    {market.label}
                    {market.isHeld ? (
                      <span className="ml-2 rounded-full border border-[#22c55e]/40 bg-[#0b2a18] px-2 py-0.5 text-xs text-[#bbf7d0]">
                        Held
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 font-mono text-xs text-[#6f7b74]">
                    {market.ticker}
                  </div>
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.yesBid)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.yesAskFromNoBid)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPercent(market.impliedProbability)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.noBid)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {formatNumber(market.volume, 0)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {formatNumber(market.openInterest, 0)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {String(market.status ?? "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PositionDetailClient({ ticker }: { ticker: string }) {
  const [detail, setDetail] = useState<PositionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiReviewEnabled, setAiReviewEnabled] = useState(false);
  const [error, setError] = useState("");

  async function loadDetail() {
    setLoading(true);
    setError("");

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        `/api/positions/${encodeURIComponent(ticker)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to load position detail.");
      }

      setDetail(body);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to load position detail.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [ticker]);

  if (loading && !detail) {
    return (
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        Loading position detail...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-6 text-[#fecaca]">
        {error}
      </section>
    );
  }

  if (!detail) {
    return null;
  }

  const position = detail.position;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Position Detail
            </p>
            <h1 className="mt-2 break-all text-3xl font-bold text-white">
              {ticker}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              Detailed read-only command center for this position. This page is
              where the deterministic and AI review workflow will live.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/positions"
              className="rounded-xl border border-[#1f2a24] px-4 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              Back to positions
            </Link>

            <button
              type="button"
              onClick={() => loadDetail()}
              disabled={loading}
              className="rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh detail"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataCard label="Side" value={position.side.toUpperCase()} />
        <DataCard
          label="Owned contracts"
          value={formatNumber(position.contractCount)}
        />
        <DataCard label="Entry" value={formatPrice(position.estimatedEntryPrice)} />
        <DataCard
          label="Current bid"
          value={
            position.hasCurrentBid ? formatPrice(position.currentBidPrice) : "No bid"
          }
        />
        <DataCard
          label="Exposure"
          value={formatDollars(position.marketExposureDollars)}
        />
        <DataCard
          label="Exit value"
          value={formatDollars(position.currentExitValueDollars)}
        />
        <DataCard
          label="Unrealized P/L"
          value={formatDollars(position.unrealizedPnlAfterFeesDollars)}
          valueClassName={`mt-2 text-xl font-bold ${pnlClass(
            position.unrealizedPnlAfterFeesDollars
          )}`}
        />
        <DataCard
          label="Total P/L"
          value={formatDollars(position.totalPnlDollars)}
          valueClassName={`mt-2 text-xl font-bold ${pnlClass(
            position.totalPnlDollars
          )}`}
        />
      </section>

      <Section eyebrow="Summary" title="Sell-vs-hold decision math">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataCard
            label="Sell-now value"
            value={formatDollars(position.currentExitValueDollars)}
          />
          <DataCard
            label="Risk if held"
            value={formatDollars(position.riskIfHeldInsteadOfSoldDollars)}
          />
          <DataCard
            label="Max payout if correct"
            value={formatDollars(position.maxPayoutDollars)}
          />
          <DataCard
            label="Remaining upside"
            value={formatDollars(position.remainingUpsideIfWinDollars)}
          />
          <DataCard
            label="All-in cost"
            value={formatDollars(position.allInCostDollars)}
          />
          <DataCard
            label="Break-even bid"
            value={formatPrice(position.breakEvenBidPrice)}
          />
          <DataCard label="Fees paid" value={formatDollars(position.feesPaidDollars)} />
          <DataCard label="Updated" value={formatDate(position.lastUpdatedTs)} />
        </div>

        <div className="mt-6 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 text-sm leading-6 text-[#a8b3ad]">
          <p>
            Selling now would return about{" "}
            <span className="font-semibold text-white">
              {formatDollars(position.currentExitValueDollars)}
            </span>
            . Holding risks that sell-now value in exchange for a possible
            remaining upside of{" "}
            <span className="font-semibold text-white">
              {formatDollars(position.remainingUpsideIfWinDollars)}
            </span>{" "}
            if the contract settles in your favor.
          </p>
        </div>
      </Section>

      <Section eyebrow="Kalshi" title="Position data">
        <div className="grid gap-4 md:grid-cols-3">
          <DataCard
            label="Position FP"
            value={formatNumber(position.positionFp)}
          />
          <DataCard
            label="Total traded"
            value={formatDollars(position.totalTradedDollars)}
          />
          <DataCard
            label="Realized P/L"
            value={formatDollars(position.realizedPnlDollars)}
          />
        </div>
      </Section>

      <Section eyebrow="Kalshi" title="Event basket market table">
        <p className="mb-5 text-sm leading-6 text-[#a8b3ad]">
          Sibling markets from the same Kalshi event. The held basket is
          highlighted. YES bid is the current sell-now bid for YES holders. YES
          ask estimate is inferred from the NO bid where available.
        </p>
        <BasketMarketsTable markets={detail.basketMarkets} />
      </Section>

      <Section eyebrow="Weather" title="NWS data">
        <p className="text-sm leading-6 text-[#a8b3ad]">
          NWS forecast, observation station, latest observation, observed max,
          and alerts will be added in the next milestone.
        </p>
      </Section>

      <Section eyebrow="Weather" title="Open-Meteo data">
        <p className="text-sm leading-6 text-[#a8b3ad]">
          Open-Meteo daily max, hourly temperature forecast, and model comparison
          will be added in the next milestone.
        </p>
      </Section>

      <Section eyebrow="Review" title="Position review">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">AI review</h3>
            <p className="mt-1 text-sm text-[#a8b3ad]">
              Toggle is ready. The deterministic review and AI review API will
              be wired into this section after the detail page is stable.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAiReviewEnabled((current) => !current)}
            className={
              aiReviewEnabled
                ? "rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008]"
                : "rounded-xl border border-[#1f2a24] px-5 py-3 text-sm font-semibold text-[#a8b3ad]"
            }
          >
            AI Review: {aiReviewEnabled ? "On" : "Off"}
          </button>
        </div>

        <button
          type="button"
          className="mt-5 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
        >
          Run Position Review
        </button>
      </Section>

      <Section eyebrow="Debug" title="Raw Kalshi data">
        <details className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
          <summary className="cursor-pointer font-semibold text-white">
            Show raw position, market, event, basket, orderbook, and diagnostics
          </summary>
          <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#a8b3ad]">
            {JSON.stringify(
              {
                position: detail.position.raw,
                market: detail.market,
                event: detail.event,
                basketMarkets: detail.basketMarkets,
                orderbook: detail.orderbook,
                diagnostics: detail.diagnostics,
              },
              null,
              2
            )}
          </pre>
        </details>
      </Section>
    </div>
  );
}