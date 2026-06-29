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

type WeatherDetail = {
  ok: boolean;
  ticker: string;
  parsed: {
    ticker: string;
    eventTicker: string | null;
    marketCode: string | null;
    eventDate: string | null;
    bucketToken: string | null;
    bucketLabel: string | null;
  };
  config: {
    code: string;
    displayName: string;
    timezone: string;
    latitude: number;
    longitude: number;
    nwsObservationStation: string;
    settlementNote: string;
  };
  nws: {
    forecastSummary: {
      periodName: unknown;
      temperatureF: number | null;
      shortForecast: unknown;
      detailedForecast: unknown;
      selectedForecastDate: string | null;
      matchedEventDate: boolean;
      rawPeriods: Record<string, unknown>[];
    } | null;
    observationSummary: {
      observedMaxF: number | null;
      latestTempF: number | null;
      latestTimestamp: string | null;
      observationCount: number;
      eventDate: string;
    };
    alerts: Record<string, unknown>;
  };
  openMeteo: {
    dailyMaxF: number | null;
    eventHourly: {
      time: unknown;
      temperatureF: number | null;
    }[];
    rawDaily: Record<string, unknown> | null;
  };
  bucketRead: {
    heldBucket: string | null;
    observedBucket: string | null;
    nwsBucket: string | null;
    openMeteoBucket: string | null;
    effectiveObservedFloorF: number | null;
    observedFloorStatus: "not_started" | "active" | "complete" | "unknown";
  };
};


type PositionReview = {
  action:
    | "HOLD"
    | "WATCH_CLOSELY"
    | "HOLD_OR_TRIM_PROFIT"
    | "SELL_TO_LOCK_PROFIT"
    | "SELL_FULL_POSITION"
    | "CUT_LOSS"
    | "ROLL_TO_BETTER_BUCKET"
    | "NO_ACTION";
  confidence: "low" | "medium" | "high";
  summary: string;
  reasons: string[];
  risks: string[];
  sellNow: {
    exitValueDollars: number | null;
    currentBidPrice: number | null;
    unrealizedPnlAfterFeesDollars: number | null;
  };
  holdToExpiration: {
    maxPayoutDollars: number | null;
    remainingUpsideIfWinDollars: number | null;
    riskIfHeldInsteadOfSoldDollars: number | null;
  };
  weatherRead: {
    heldBucket: string | null;
    observedBucket: string | null;
    nwsBucket: string | null;
    openMeteoBucket: string | null;
    observedFloorStatus: string | null;
    supportedBy: string[];
    conflictCount: number;
  };
  rollCandidate: {
    ticker: string;
    label: string;
    impliedProbability: number | null;
    yesBid: number | null;
    yesAskFromNoBid: number | null;
  } | null;
  manualActionPlan: {
    title: string;
    summary: string;
    urgency: "low" | "medium" | "high";
    steps: string[];
    priceGuidance: {
      currentSellBid: number | null;
      targetBuyAskEstimate: number | null;
      maxReasonableTargetEntry: number | null;
      minReasonableExit: number | null;
    };
    checksBeforeActing: string[];
    afterActionChecks: string[];
  };
  aiReviewRequested: boolean;
  aiReviewNote: string | null;
};

type PositionAiReview = {
  action:
    | "HOLD"
    | "WATCH_CLOSELY"
    | "HOLD_OR_TRIM_PROFIT"
    | "SELL_TO_LOCK_PROFIT"
    | "SELL_FULL_POSITION"
    | "CUT_LOSS"
    | "ROLL_TO_BETTER_BUCKET"
    | "NO_ACTION";
  confidence: "low" | "medium" | "high";
  agreementWithDeterministicReview: "agree" | "partially_agree" | "disagree";
  summary: string;
  keyReasons: string[];
  keyRisks: string[];
  sellNowCase: string;
  holdCase: string;
  rollCase: string | null;
  whatWouldChangeMyMind: string[];
  recommendedMonitoring: string[];
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

function formatTemperature(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}°F`;
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

function stringValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "—";
}

function observedFloorLabel(
  status: WeatherDetail["bucketRead"]["observedFloorStatus"],
  value: number | null
) {
  if (status === "not_started") {
    return "Not started yet";
  }

  return formatTemperature(value);
}

function observedBucketLabel(
  status: WeatherDetail["bucketRead"]["observedFloorStatus"],
  value: string | null
) {
  if (status === "not_started") {
    return "Not started yet";
  }

  return value ?? "—";
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

function WeatherHourlyTable({
  hourly,
}: {
  hourly: WeatherDetail["openMeteo"]["eventHourly"];
}) {
  const filtered = hourly
    .filter((item) => item.temperatureF !== null)
    .slice(0, 24);

  if (filtered.length === 0) {
    return (
      <p className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 text-sm text-[#a8b3ad]">
        No hourly Open-Meteo data returned for the event date.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f2a24] bg-[#0b120f]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-[#a8b3ad]">
            <tr>
              <th className="border-b border-[#1f2a24] px-4 py-3">Time</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                Temperature
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={String(item.time)} className="border-b border-[#1f2a24]">
                <td className="px-4 py-3 text-white">{String(item.time)}</td>
                <td className="px-4 py-3 text-white">
                  {formatTemperature(item.temperatureF)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExecutiveSummary({
  detail,
  weather,
}: {
  detail: PositionDetail;
  weather: WeatherDetail | null;
}) {
  const position = detail.position;

  return (
    <Section eyebrow="Command Center" title="Executive snapshot">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataCard
          label="Held contract"
          value={weather?.bucketRead.heldBucket ?? detail.ticker}
        />
        <DataCard
          label="Weather read"
          value={
            weather
              ? `NWS ${weather.bucketRead.nwsBucket ?? "—"} / OM ${
                  weather.bucketRead.openMeteoBucket ?? "—"
                }`
              : "Loading weather"
          }
        />
        <DataCard
          label="Current bid"
          value={position.hasCurrentBid ? formatPrice(position.currentBidPrice) : "No bid"}
        />
        <DataCard
          label="Unrealized P/L"
          value={formatDollars(position.unrealizedPnlAfterFeesDollars)}
          valueClassName={`mt-2 text-xl font-bold ${pnlClass(
            position.unrealizedPnlAfterFeesDollars
          )}`}
        />
      </div>
    </Section>
  );
}

function PositionWeatherPanel({
  ticker,
  weather,
  loading,
  error,
  onRefresh,
}: {
  ticker: string;
  weather: WeatherDetail | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  if (loading && !weather) {
    return (
      <Section eyebrow="Weather" title="Weather vs held contract">
        <p className="text-sm text-[#a8b3ad]">Loading weather data...</p>
      </Section>
    );
  }

  if (error) {
    return (
      <Section eyebrow="Weather" title="Weather vs held contract">
        <div className="rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-4 text-sm text-[#fecaca]">
          {error}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
        >
          Retry weather load
        </button>
      </Section>
    );
  }

  if (!weather) {
    return (
      <Section eyebrow="Weather" title="Weather vs held contract">
        <p className="text-sm text-[#a8b3ad]">
          No weather data loaded for {ticker}.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
        >
          Load weather
        </button>
      </Section>
    );
  }

  const activeAlertCount = Array.isArray(weather.nws.alerts.features)
    ? weather.nws.alerts.features.length
    : 0;

  return (
    <>
      <Section eyebrow="Weather Summary" title="Weather vs held contract">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataCard label="Location" value={weather.config.displayName} />
          <DataCard label="Event date" value={weather.parsed.eventDate ?? "—"} />
          <DataCard label="Held bucket" value={weather.bucketRead.heldBucket ?? "—"} />
          <DataCard
            label="Observed bucket"
            value={observedBucketLabel(
              weather.bucketRead.observedFloorStatus,
              weather.bucketRead.observedBucket
            )}
          />
          <DataCard
            label="NWS bucket"
            value={weather.bucketRead.nwsBucket ?? "—"}
          />
          <DataCard
            label="Open-Meteo bucket"
            value={weather.bucketRead.openMeteoBucket ?? "—"}
          />
          <DataCard
            label="Observed floor"
            value={observedFloorLabel(
              weather.bucketRead.observedFloorStatus,
              weather.bucketRead.effectiveObservedFloorF
            )}
          />
          <DataCard
            label="Station"
            value={weather.config.nwsObservationStation}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 text-sm leading-6 text-[#a8b3ad]">
          <p>
            This compares your held Kalshi basket against the event-date
            observation floor, the NWS forecast, and the Open-Meteo model. The
            observed floor is only used once the event date has started.
          </p>
          <p className="mt-3 text-[#6f7b74]">{weather.config.settlementNote}</p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="mt-5 rounded-xl border border-[#1f2a24] px-5 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing weather..." : "Refresh weather"}
        </button>
      </Section>

      <Section eyebrow="NWS" title="Forecast and observations">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataCard
            label="NWS forecast high"
            value={formatTemperature(weather.nws.forecastSummary?.temperatureF ?? null)}
          />
          <DataCard
            label="Forecast period"
            value={stringValue(weather.nws.forecastSummary?.periodName)}
          />
          <DataCard
            label="Forecast date"
            value={weather.nws.forecastSummary?.selectedForecastDate ?? "—"}
          />
          <DataCard
            label="Latest event obs"
            value={observedFloorLabel(
              weather.bucketRead.observedFloorStatus,
              weather.nws.observationSummary.latestTempF
            )}
          />
          <DataCard
            label="Observed max"
            value={observedFloorLabel(
              weather.bucketRead.observedFloorStatus,
              weather.nws.observationSummary.observedMaxF
            )}
          />
          <DataCard
            label="Observation count"
            value={
              weather.bucketRead.observedFloorStatus === "not_started"
                ? "Not started yet"
                : formatNumber(weather.nws.observationSummary.observationCount, 0)
            }
          />
          <DataCard label="Active alerts" value={formatNumber(activeAlertCount, 0)} />
          <DataCard
            label="Short forecast"
            value={stringValue(weather.nws.forecastSummary?.shortForecast)}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 text-sm leading-6 text-[#a8b3ad]">
          <p className="font-semibold text-white">NWS detailed forecast</p>
          <p className="mt-2">
            {stringValue(weather.nws.forecastSummary?.detailedForecast)}
          </p>
        </div>
      </Section>

      <Section eyebrow="Open-Meteo" title="Model forecast">
        <div className="grid gap-4 md:grid-cols-3">
          <DataCard
            label="Daily max"
            value={formatTemperature(weather.openMeteo.dailyMaxF)}
          />
          <DataCard
            label="Model bucket"
            value={weather.bucketRead.openMeteoBucket ?? "—"}
          />
          <DataCard
            label="Hourly points"
            value={formatNumber(weather.openMeteo.eventHourly.length, 0)}
          />
        </div>

        <div className="mt-6">
          <WeatherHourlyTable hourly={weather.openMeteo.eventHourly} />
        </div>
      </Section>
    </>
  );
}


function ManualActionPlanPanel({
  plan,
}: {
  plan: PositionReview["manualActionPlan"];
}) {
  const urgencyClass =
    plan.urgency === "high"
      ? "border-[#ef4444]/40 bg-[#ef4444]/10 text-[#fecaca]"
      : plan.urgency === "medium"
        ? "border-[#facc15]/30 bg-[#facc15]/10 text-[#fde68a]"
        : "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#bbf7d0]";

  return (
    <div className={`mt-6 rounded-2xl border p-5 ${urgencyClass}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-80">
            Manual action plan
          </p>
          <h4 className="mt-2 text-xl font-bold">{plan.title}</h4>
          <p className="mt-3 text-sm leading-6">{plan.summary}</p>
        </div>

        <span className="rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
          {plan.urgency} urgency
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataCard
          label="Current sell bid"
          value={formatPrice(plan.priceGuidance.currentSellBid)}
        />
        <DataCard
          label="Target ask est."
          value={formatPrice(plan.priceGuidance.targetBuyAskEstimate)}
        />
        <DataCard
          label="Max target entry"
          value={formatPrice(plan.priceGuidance.maxReasonableTargetEntry)}
        />
        <DataCard
          label="Min exit guide"
          value={formatPrice(plan.priceGuidance.minReasonableExit)}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h5 className="font-semibold text-white">Steps</h5>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
            {plan.steps.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h5 className="font-semibold text-white">Check before acting</h5>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
            {plan.checksBeforeActing.map((check) => (
              <li key={check}>• {check}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h5 className="font-semibold text-white">After action</h5>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
            {plan.afterActionChecks.map((check) => (
              <li key={check}>• {check}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ReviewResultPanel({ review }: { review: PositionReview }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
          Deterministic action
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[#22c55e]">
          {review.action}
        </h3>
        <p className="mt-2 text-sm text-[#a8b3ad]">
          Confidence:{" "}
          <span className="font-semibold text-white">
            {review.confidence.toUpperCase()}
          </span>
        </p>
        <p className="mt-4 text-sm leading-6 text-[#f4f7f5]">
          {review.summary}
        </p>
      </div>

      <ManualActionPlanPanel plan={review.manualActionPlan} />

      <div className="grid gap-4 md:grid-cols-3">
        <DataCard
          label="Sell now"
          value={formatDollars(review.sellNow.exitValueDollars)}
        />
        <DataCard
          label="Risk if held"
          value={formatDollars(
            review.holdToExpiration.riskIfHeldInsteadOfSoldDollars
          )}
        />
        <DataCard
          label="Remaining upside"
          value={formatDollars(
            review.holdToExpiration.remainingUpsideIfWinDollars
          )}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Reasons</h4>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
            {review.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Risks</h4>
          {review.risks.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {review.risks.map((risk) => (
                <li key={risk}>• {risk}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No major deterministic risk flags were generated.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
        <h4 className="font-semibold text-white">Weather support</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DataCard
            label="Held bucket"
            value={review.weatherRead.heldBucket ?? "—"}
          />
          <DataCard
            label="NWS bucket"
            value={review.weatherRead.nwsBucket ?? "—"}
          />
          <DataCard
            label="Open-Meteo bucket"
            value={review.weatherRead.openMeteoBucket ?? "—"}
          />
          <DataCard
            label="Supported by"
            value={
              review.weatherRead.supportedBy.length > 0
                ? review.weatherRead.supportedBy.join(", ")
                : "No direct support"
            }
          />
        </div>
      </div>

      {review.rollCandidate ? (
        <div className="rounded-2xl border border-[#facc15]/30 bg-[#facc15]/10 p-5">
          <h4 className="font-semibold text-[#fde68a]">Roll candidate</h4>
          <p className="mt-2 text-sm leading-6 text-[#fde68a]">
            {review.rollCandidate.label}{" "}
            <span className="font-mono text-xs">
              {review.rollCandidate.ticker}
            </span>
          </p>
          <p className="mt-2 text-sm text-[#fde68a]">
            Implied probability:{" "}
            {review.rollCandidate.impliedProbability !== null
              ? `${(review.rollCandidate.impliedProbability * 100).toFixed(1)}%`
              : "—"}
          </p>
        </div>
      ) : null}

      {review.aiReviewNote ? (
        <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5 text-sm leading-6 text-[#bae6fd]">
          {review.aiReviewNote}
        </div>
      ) : null}
    </div>
  );
}


function AiReviewResultPanel({ aiReview }: { aiReview: PositionAiReview }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
          AI review
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[#bae6fd]">
          {aiReview.action}
        </h3>
        <p className="mt-2 text-sm text-[#bae6fd]">
          Confidence:{" "}
          <span className="font-semibold text-white">
            {aiReview.confidence.toUpperCase()}
          </span>{" "}
          · Deterministic agreement:{" "}
          <span className="font-semibold text-white">
            {aiReview.agreementWithDeterministicReview.replace("_", " ")}
          </span>
        </p>
        <p className="mt-4 text-sm leading-6 text-[#f4f7f5]">
          {aiReview.summary}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">AI reasons</h4>
          {aiReview.keyReasons.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {aiReview.keyReasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No AI reasons were returned.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">AI risks</h4>
          {aiReview.keyRisks.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {aiReview.keyRisks.map((risk) => (
                <li key={risk}>• {risk}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No AI risks were returned.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Sell-now case</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.sellNowCase}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Hold case</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.holdCase}
          </p>
        </div>
      </div>

      {aiReview.rollCase ? (
        <div className="rounded-2xl border border-[#facc15]/30 bg-[#facc15]/10 p-5">
          <h4 className="font-semibold text-[#fde68a]">Roll discussion</h4>
          <p className="mt-3 text-sm leading-6 text-[#fde68a]">
            {aiReview.rollCase}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">
            What would change the review
          </h4>
          {aiReview.whatWouldChangeMyMind.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {aiReview.whatWouldChangeMyMind.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No change conditions were returned.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Recommended monitoring</h4>
          {aiReview.recommendedMonitoring.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {aiReview.recommendedMonitoring.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No monitoring items were returned.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PositionDetailClient({ ticker }: { ticker: string }) {
  const [detail, setDetail] = useState<PositionDetail | null>(null);
  const [weather, setWeather] = useState<WeatherDetail | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [aiReviewEnabled, setAiReviewEnabled] = useState(false);
  const [review, setReview] = useState<PositionReview | null>(null);
  const [aiReview, setAiReview] = useState<PositionAiReview | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingAiReview, setLoadingAiReview] = useState(false);

  const [error, setError] = useState("");
  const [weatherError, setWeatherError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [aiReviewError, setAiReviewError] = useState("");

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

  async function loadWeather() {
    setLoadingWeather(true);
    setWeatherError("");

    try {
      const response = await fetch(
        `/api/positions/${encodeURIComponent(ticker)}/weather`,
        {
          method: "GET",
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to load weather data.");
      }

      setWeather(body);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to load weather data.";

      setWeatherError(message);
    } finally {
      setLoadingWeather(false);
    }
  }


  async function runAiReview(deterministicReview: PositionReview) {
    if (!detail) {
      return;
    }

    setLoadingAiReview(true);
    setAiReviewError("");

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        `/api/positions/${encodeURIComponent(ticker)}/ai-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            position: detail.position,
            weather,
            basketMarkets: detail.basketMarkets,
            deterministicReview,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to run AI review.");
      }

      setAiReview(body.aiReview);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to run AI review.";

      setAiReviewError(message);
    } finally {
      setLoadingAiReview(false);
    }
  }

  async function runPositionReview() {
    if (!detail) {
      return;
    }

    setLoadingReview(true);
    setReviewError("");
    setAiReview(null);
    setAiReviewError("");

    try {
      const response = await fetch(
        `/api/positions/${encodeURIComponent(ticker)}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            position: detail.position,
            weather,
            basketMarkets: detail.basketMarkets,
            aiReviewRequested: aiReviewEnabled,
          }),
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to run position review.");
      }

      setReview(body.review);

      if (aiReviewEnabled) {
        await runAiReview(body.review);
      }
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to run position review.";

      setReviewError(message);
    } finally {
      setLoadingReview(false);
    }
  }

  useEffect(() => {
    void loadDetail();
    void loadWeather();
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
              onClick={() => {
                void loadDetail();
                void loadWeather();
              }}
              disabled={loading || loadingWeather}
              className="rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || loadingWeather ? "Refreshing..." : "Refresh all"}
            </button>
          </div>
        </div>
      </section>

      <ExecutiveSummary detail={detail} weather={weather} />

      <Section eyebrow="Contract" title="Contract you hold">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        </div>
      </Section>

      <PositionWeatherPanel
        ticker={ticker}
        weather={weather}
        loading={loadingWeather}
        error={weatherError}
        onRefresh={() => void loadWeather()}
      />

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

      <Section eyebrow="Kalshi" title="Event basket market table">
        <p className="mb-5 text-sm leading-6 text-[#a8b3ad]">
          Sibling markets from the same Kalshi event. The held basket is
          highlighted. YES bid is the current sell-now bid for YES holders. YES
          ask estimate is inferred from the NO bid where available.
        </p>
        <BasketMarketsTable markets={detail.basketMarkets} />
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

      <Section eyebrow="Review" title="Position review">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">AI review</h3>
            <p className="mt-1 text-sm text-[#a8b3ad]">
              Keep this off for deterministic-only review. Turn it on when you
              want the later AI layer to review the same data package.
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
          onClick={() => void runPositionReview()}
          disabled={loadingReview || loadingAiReview}
          className="mt-5 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingReview
            ? "Running review..."
            : loadingAiReview
              ? "Running AI review..."
              : "Run Position Review"}
        </button>

        {reviewError ? (
          <div className="mt-5 rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-4 text-sm text-[#fecaca]">
            {reviewError}
          </div>
        ) : null}

        {review ? <ReviewResultPanel review={review} /> : null}

        {loadingAiReview ? (
          <div className="mt-5 rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-4 text-sm text-[#bae6fd]">
            Running AI review...
          </div>
        ) : null}

        {aiReviewError ? (
          <div className="mt-5 rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-4 text-sm text-[#fecaca]">
            {aiReviewError}
          </div>
        ) : null}

        {aiReview ? <AiReviewResultPanel aiReview={aiReview} /> : null}
      </Section>

      <Section eyebrow="Debug" title="Raw data">
        <details className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
          <summary className="cursor-pointer font-semibold text-white">
            Show raw Kalshi and weather data
          </summary>
          <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#a8b3ad]">
            {JSON.stringify(
              {
                kalshi: {
                  position: detail.position.raw,
                  market: detail.market,
                  event: detail.event,
                  basketMarkets: detail.basketMarkets,
                  orderbook: detail.orderbook,
                  diagnostics: detail.diagnostics,
                },
                weather,
                review,
                aiReview,
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