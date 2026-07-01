"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import { useEffect, useMemo, useState } from "react";

type EventScannerSignal =
  | "POTENTIAL_ENTRY"
  | "WATCH_CLOSELY"
  | "NO_CLEAR_EDGE"
  | "INSUFFICIENT_DATA";

type EventScannerScope =
  | "today_tomorrow"
  | "today"
  | "tomorrow"
  | "all";

type EventScannerFamily = "daily_high" | "hourly_temperature";

type EventScannerMarket = {
  ticker: string;
  label: string;
  yesBid: number | null;
  yesAskEstimate: number | null;
  noBid: number | null;
  impliedProbability: number | null;
  volume: number | null;
  openInterest: number | null;
  status: string | null;
};

type EventScannerMatchingPosition = {
  ticker: string;
  side: "yes" | "no" | "flat" | "unknown";
  contractCount: number | null;
  positionFp: number | null;
};

type EventForecastSynthesis = {
  predictedHighF: number | null;
  likelyBucket: string | null;
  alternateBuckets: string[];
  confidencePercent: number;
  confidenceLabel: "low" | "medium" | "high";
  sourceAgreement: "strong" | "moderate" | "weak" | "insufficient";
  uncertaintyF: number | null;
  reasoning: string[];
  dataQualityNotes: string[];
  inputs: {
    nwsForecastHighF: number | null;
    openMeteoForecastHighF: number | null;
    openMeteoEnsembleMeanHighF: number | null;
    openMeteoEnsembleSpreadF: number | null;
    recentObservedMaxF: number | null;
  };
};

type EventScannerScoreBreakdown = {
  forecastAgreement: number;
  marketMismatch: number;
  priceAttractiveness: number;
  forecastStrength: number;
  dataQuality: number;
  total: number;
};

type EventAiReview = {
  action: "ENTER_YES" | "WATCH_ONLY" | "AVOID" | "INSUFFICIENT_DATA";
  recommendedBasketTicker: string | null;
  recommendedBasketLabel: string | null;
  confidence: "low" | "medium" | "high";
  trueConfidencePercent: number | null;
  summary: string;
  independentForecast: {
    predictedHighF: number | null;
    mostLikelyBucket: string | null;
    secondMostLikelyBucket: string | null;
    probabilityEstimate: string;
    confidencePercent: number | null;
    reasoning: string;
  };
  weatherEvidenceRead: {
    observationTrend: string;
    forecastRead: string;
    atmosphericRead: string;
    marketPricingRead: string;
    timingRead: string;
  };
  decisionPlan: {
    immediateAction: string;
    nextObservationTrigger: string;
    invalidationSignal: string;
    upsideScenario: string;
    downsideScenario: string;
  };
  candidateAssessment: {
    appCandidateTicker: string | null;
    appCandidateLabel: string | null;
    assessment: "agree" | "partially_agree" | "disagree" | "no_candidate";
    assessmentReason: string;
  };
  dataRead: {
    nwsInterpretation: string;
    openMeteoInterpretation: string;
    kalshiMarketInterpretation: string;
    observationInterpretation: string;
  };
  entryOpinion: {
    shouldEnter: boolean;
    preferredMaxEntryPrice: number | null;
    fairValueEstimate: number | null;
    reasoning: string;
  };
  risks: string[];
  whatWouldChangeMyMind: string[];
  recommendedMonitoring: string[];
};

type EventScannerResult = {
  family: EventScannerFamily;
  eventTicker: string;
  seriesTicker: string;
  marketCode: string | null;
  locationName: string | null;
  eventDate: string | null;
  eventHourLocal: number | null;
  eventDateTimeLocalLabel: string | null;
  title: string;
  signal: EventScannerSignal;
  score: number;
  scoreBreakdown: EventScannerScoreBreakdown | null;
  forecastSynthesis: EventForecastSynthesis | null;
  summary: string;
  reasons: string[];
  risks: string[];
  marketFavorite: EventScannerMarket | null;
  weatherFavorite: EventScannerMarket | null;
  markets: EventScannerMarket[];
  weather: {
    heldOrFavoriteBucket: string | null;
    nwsBucket: string | null;
    openMeteoBucket: string | null;
    nwsTemperatureF: number | null;
    openMeteoTemperatureF: number | null;
    hourlyTemperatureF: number | null;
    hourlyThresholdCandidate: string | null;
    weatherAgreement: boolean;
  };
  matchingPosition: EventScannerMatchingPosition | null;
};

type EventScannerResponse = {
  ok: boolean;
  generatedAt: string;
  scope: EventScannerScope;
  today: string;
  tomorrow: string;
  results: EventScannerResult[];
  diagnostics: {
    scannedSeries: string[];
    eventCount: number;
    resultCount: number;
    filteredOutByScope: number;
    matchingPositionCount: number;
    errors: string[];
  };
};

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

function formatNumber(value: number | null, digits = 0) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatTemp(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}°F`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function scopeLabel(scope: EventScannerScope) {
  switch (scope) {
    case "today_tomorrow":
      return "Today + tomorrow";
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "all":
      return "All open";
    default:
      return scope;
  }
}

function signalLabel(signal: EventScannerSignal) {
  switch (signal) {
    case "POTENTIAL_ENTRY":
      return "Potential entry";
    case "WATCH_CLOSELY":
      return "Watch closely";
    case "NO_CLEAR_EDGE":
      return "No clear edge";
    case "INSUFFICIENT_DATA":
      return "Insufficient data";
    default:
      return signal;
  }
}


function familyLabel(family: EventScannerFamily) {
  if (family === "hourly_temperature") {
    return "Hourly temp";
  }

  return "Daily high";
}

function eventTimeLabel(event: EventScannerResult) {
  if (event.eventDateTimeLocalLabel) {
    return event.eventDateTimeLocalLabel;
  }

  return event.eventDate ?? "—";
}

function signalClass(signal: EventScannerSignal) {
  switch (signal) {
    case "POTENTIAL_ENTRY":
      return "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#bbf7d0]";
    case "WATCH_CLOSELY":
      return "border-[#facc15]/40 bg-[#facc15]/10 text-[#fde68a]";
    case "NO_CLEAR_EDGE":
      return "border-[#1f2a24] bg-[#0b120f] text-[#a8b3ad]";
    case "INSUFFICIENT_DATA":
      return "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]";
    default:
      return "border-[#1f2a24] bg-[#0b120f] text-[#a8b3ad]";
  }
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ScoreBreakdownPanel({
  scoreBreakdown,
  forecastSynthesis,
}: {
  scoreBreakdown: EventScannerScoreBreakdown | null;
  forecastSynthesis: EventForecastSynthesis | null;
}) {
  if (!scoreBreakdown && !forecastSynthesis) {
    return null;
  }

  const breakdownItems: Array<[string, number, number]> = scoreBreakdown
    ? [
        ["Forecast agreement", scoreBreakdown.forecastAgreement, 25],
        ["Market mismatch", scoreBreakdown.marketMismatch, 25],
        ["Price attractiveness", scoreBreakdown.priceAttractiveness, 20],
        ["Forecast strength", scoreBreakdown.forecastStrength, 15],
        ["Data quality", scoreBreakdown.dataQuality, 15],
      ]
    : [];

  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
            Forecast confidence score
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {scoreBreakdown ? `${scoreBreakdown.total}/100` : "—"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
            This score weighs source agreement, market mismatch, price, forecast
            strength, and data quality. It is not reduced just because the event
            is tomorrow.
          </p>
        </div>

        {forecastSynthesis ? (
          <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-4 md:w-[320px]">
            <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
              Forecast synthesis
            </p>
            <p className="mt-2 text-sm text-[#a8b3ad]">
              Likely bucket: {forecastSynthesis.likelyBucket ?? "—"}
            </p>
            <p className="mt-1 text-sm text-[#a8b3ad]">
              Predicted high: {formatTemp(forecastSynthesis.predictedHighF)}
            </p>
            <p className="mt-1 text-sm text-[#a8b3ad]">
              Source agreement: {forecastSynthesis.sourceAgreement}
            </p>
            <p className="mt-1 text-sm text-[#a8b3ad]">
              Uncertainty: {formatTemp(forecastSynthesis.uncertaintyF)}
            </p>
          </div>
        ) : null}
      </div>

      {breakdownItems.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {breakdownItems.map(([label, value, max]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-[#1f2a24] bg-[#101714] p-3"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-[#6f7b74]">
                {label}
              </p>
              <p className="mt-2 font-bold text-white">
                {value}/{max}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {forecastSynthesis?.dataQualityNotes.length ? (
        <div className="mt-5 rounded-xl border border-[#facc15]/30 bg-[#facc15]/10 p-4">
          <p className="text-sm font-semibold text-[#fde68a]">Data quality notes</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#fde68a]">
            {forecastSynthesis.dataQualityNotes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ScopeButton({
  value,
  label,
  activeScope,
  onClick,
}: {
  value: EventScannerScope;
  label: string;
  activeScope: EventScannerScope;
  onClick: (value: EventScannerScope) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={
        activeScope === value
          ? "rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008]"
          : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
      }
    >
      {label}
    </button>
  );
}

function MarketTable({ markets }: { markets: EventScannerMarket[] }) {
  if (markets.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 text-sm text-[#a8b3ad]">
        No basket markets returned.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f2a24] bg-[#0b120f]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
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
              <tr key={market.ticker} className="border-b border-[#1f2a24]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{market.label}</p>
                  <p className="mt-1 font-mono text-xs text-[#6f7b74]">
                    {market.ticker}
                  </p>
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.yesBid)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.yesAskEstimate)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPercent(market.impliedProbability)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.noBid)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {formatNumber(market.volume)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {formatNumber(market.openInterest)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {market.status ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchingPositionPanel({
  matchingPosition,
}: {
  matchingPosition: EventScannerMatchingPosition;
}) {
  return (
    <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
            Matching open position
          </p>
          <h3 className="mt-2 break-all font-mono text-sm font-semibold text-white">
            {matchingPosition.ticker}
          </h3>
          <p className="mt-2 text-sm text-[#bae6fd]">
            Side: {matchingPosition.side.toUpperCase()} · Contracts:{" "}
            {formatNumber(matchingPosition.contractCount, 2)}
          </p>
        </div>

        <a
          href={`/positions/${encodeURIComponent(matchingPosition.ticker)}`}
          className="rounded-xl bg-[#38bdf8] px-5 py-3 text-sm font-semibold text-[#021018] transition hover:bg-[#0ea5e9]"
        >
          View Position
        </a>
      </div>
    </div>
  );
}


function AiReviewResultPanel({ aiReview }: { aiReview: EventAiReview }) {
  return (
    <div className="space-y-5 rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
            AI event review
          </p>
          <h3 className="mt-2 text-2xl font-bold text-[#bae6fd]">
            {aiReview.action.replaceAll("_", " ")}
          </h3>
          <p className="mt-2 text-sm text-[#bae6fd]">
            Confidence:{" "}
            <span className="font-semibold text-white">
              {aiReview.confidence.toUpperCase()}
            </span>
            {aiReview.trueConfidencePercent !== null ? (
              <>
                {" "}
                · True confidence:{" "}
                <span className="font-semibold text-white">
                  {aiReview.trueConfidencePercent.toFixed(0)}%
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#021018]/60 p-4 lg:min-w-[280px]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
            Recommended basket
          </p>
          <p className="mt-2 font-semibold text-white">
            {aiReview.recommendedBasketLabel ?? "No basket recommended"}
          </p>
          {aiReview.recommendedBasketTicker ? (
            <p className="mt-1 break-all font-mono text-xs text-[#7dd3fc]">
              {aiReview.recommendedBasketTicker}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-sm leading-6 text-[#f4f7f5]">{aiReview.summary}</p>

      <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#021018]/60 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
          Independent weather forecast
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniStat
            label="Predicted high"
            value={
              aiReview.independentForecast.predictedHighF !== null
                ? `${formatNumber(aiReview.independentForecast.predictedHighF, 1)}°F`
                : "—"
            }
          />
          <MiniStat
            label="Most likely bucket"
            value={aiReview.independentForecast.mostLikelyBucket ?? "—"}
          />
          <MiniStat
            label="Forecast confidence"
            value={
              aiReview.independentForecast.confidencePercent !== null
                ? `${aiReview.independentForecast.confidencePercent.toFixed(0)}%`
                : "—"
            }
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-[#bae6fd]">
          {aiReview.independentForecast.probabilityEstimate}
        </p>
        <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
          {aiReview.independentForecast.reasoning}
        </p>
        {aiReview.independentForecast.secondMostLikelyBucket ? (
          <p className="mt-3 text-sm text-[#7dd3fc]">
            Second most likely: {aiReview.independentForecast.secondMostLikelyBucket}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Observation and timing read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.weatherEvidenceRead.observationTrend}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.weatherEvidenceRead.timingRead}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Forecast and atmosphere read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.weatherEvidenceRead.forecastRead}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.weatherEvidenceRead.atmosphericRead}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#86efac]">
          AI action plan
        </p>
        <h4 className="mt-2 text-lg font-bold text-white">
          {aiReview.decisionPlan.immediateAction}
        </h4>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <p className="text-sm leading-6 text-[#bbf7d0]">
            <span className="font-semibold text-white">Next trigger:</span>{" "}
            {aiReview.decisionPlan.nextObservationTrigger}
          </p>
          <p className="text-sm leading-6 text-[#bbf7d0]">
            <span className="font-semibold text-white">Invalidation:</span>{" "}
            {aiReview.decisionPlan.invalidationSignal}
          </p>
          <p className="text-sm leading-6 text-[#bbf7d0]">
            <span className="font-semibold text-white">Upside:</span>{" "}
            {aiReview.decisionPlan.upsideScenario}
          </p>
          <p className="text-sm leading-6 text-[#bbf7d0]">
            <span className="font-semibold text-white">Downside:</span>{" "}
            {aiReview.decisionPlan.downsideScenario}
          </p>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#bbf7d0]">
          <span className="font-semibold text-white">Market pricing:</span>{" "}
          {aiReview.weatherEvidenceRead.marketPricingRead}
        </p>
      </div>

      <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
          AI assessment of app candidate
        </p>

        <h4 className="mt-2 text-lg font-bold text-white">
          {aiReview.candidateAssessment.appCandidateLabel ?? "No app candidate"}
        </h4>

        <p className="mt-2 font-mono text-xs text-[#7dd3fc]">
          {aiReview.candidateAssessment.appCandidateTicker ?? "—"}
        </p>

        <p className="mt-3 text-sm text-[#bae6fd]">
          Assessment:{" "}
          <span className="font-semibold text-white">
            {aiReview.candidateAssessment.assessment.replace("_", " ")}
          </span>
        </p>

        <p className="mt-3 text-sm leading-6 text-[#bae6fd]">
          {aiReview.candidateAssessment.assessmentReason}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MiniStat
          label="Should enter"
          value={aiReview.entryOpinion.shouldEnter ? "Yes" : "No"}
        />
        <MiniStat
          label="Max entry"
          value={formatPrice(aiReview.entryOpinion.preferredMaxEntryPrice)}
        />
        <MiniStat
          label="Fair value"
          value={formatPrice(aiReview.entryOpinion.fairValueEstimate)}
        />
      </div>

      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
        <h4 className="font-semibold text-white">Entry reasoning</h4>
        <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
          {aiReview.entryOpinion.reasoning}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">NWS read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.nwsInterpretation}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Open-Meteo read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.openMeteoInterpretation}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Kalshi market read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.kalshiMarketInterpretation}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Observation read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.observationInterpretation}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">Risks</h4>
          {aiReview.risks.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {aiReview.risks.map((risk) => (
                <li key={risk}>• {risk}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">No risks returned.</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
          <h4 className="font-semibold text-white">What would change the view</h4>
          {aiReview.whatWouldChangeMyMind.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
              {aiReview.whatWouldChangeMyMind.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No change conditions returned.
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
              No monitoring items returned.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


function EventCard({
  event,
  expanded,
  onToggle,
  aiReview,
  loadingAiReview,
  aiReviewError,
  onRunAiReview,
}: {
  event: EventScannerResult;
  expanded: boolean;
  onToggle: () => void;
  aiReview: EventAiReview | null;
  loadingAiReview: boolean;
  aiReviewError: string;
  onRunAiReview: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[#1f2a24] bg-[#101714]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${signalClass(
                  event.signal
                )}`}
              >
                {signalLabel(event.signal)}
              </span>

              <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a8b3ad]">
                Score {event.score}/100
              </span>

              <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a8b3ad]">
                {event.seriesTicker}
              </span>

              <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a8b3ad]">
                {familyLabel(event.family)}
              </span>

              {event.matchingPosition ? (
                <span className="rounded-full border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#bae6fd]">
                  You hold {event.matchingPosition.side.toUpperCase()}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 break-words text-2xl font-bold text-white">
              {event.locationName ?? event.marketCode ?? "Unknown location"}{" "}
              · {eventTimeLabel(event)}
            </h2>

            <p className="mt-2 break-all font-mono text-xs text-[#6f7b74]">
              {event.eventTicker}
            </p>

            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              {event.summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <MiniStat
              label="Market favorite"
              value={event.marketFavorite?.label ?? "—"}
            />
            <MiniStat
              label={
                event.family === "hourly_temperature"
                  ? "Forecast threshold"
                  : "Weather basket"
              }
              value={event.weatherFavorite?.label ?? "—"}
            />
            <MiniStat
              label={event.family === "hourly_temperature" ? "NWS temp" : "NWS bucket"}
              value={
                event.family === "hourly_temperature"
                  ? formatTemp(event.weather.nwsTemperatureF)
                  : event.weather.nwsBucket ?? "—"
              }
            />
            <MiniStat
              label={
                event.family === "hourly_temperature"
                  ? "Open-Meteo temp"
                  : "Open-Meteo bucket"
              }
              value={
                event.family === "hourly_temperature"
                  ? formatTemp(event.weather.openMeteoTemperatureF)
                  : event.weather.openMeteoBucket ?? "—"
              }
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#1f2a24] pt-4 text-sm text-[#a8b3ad]">
          <span>
            {expanded ? "Hide details" : "Show details"} · {event.markets.length}{" "}
            baskets
          </span>
          <span className="text-lg text-[#22c55e]">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-5 border-t border-[#1f2a24] p-5">
          {event.matchingPosition ? (
            <MatchingPositionPanel matchingPosition={event.matchingPosition} />
          ) : null}

          <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
                  AI review
                </p>
                <h3 className="mt-2 font-semibold text-white">
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#bae6fd]">
                  This sends fresh Kalshi, NWS, observation, and Open-Meteo data
                  for this event. It also sends the app-selected candidate basket
                  for AI assessment, but does not send the scanner score, signal,
                  reasons, or risks.
                </p>
              </div>

              <button
                type="button"
                onClick={onRunAiReview}
                disabled={loadingAiReview}
                className="rounded-xl bg-[#38bdf8] px-5 py-3 text-sm font-semibold text-[#021018] transition hover:bg-[#0ea5e9] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingAiReview ? "Running AI review..." : "AI Review"}
              </button>
            </div>

            {aiReviewError ? (
              <div className="mt-5 rounded-2xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-4 text-sm text-[#fecaca]">
                {aiReviewError}
              </div>
            ) : null}
          </div>

          {aiReview ? <AiReviewResultPanel aiReview={aiReview} /> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Market favorite implied"
              value={formatPercent(event.marketFavorite?.impliedProbability ?? null)}
            />
            <MiniStat
              label={
                event.family === "hourly_temperature"
                  ? "Forecast threshold ask"
                  : "Weather favorite ask"
              }
              value={formatPrice(event.weatherFavorite?.yesAskEstimate ?? null)}
            />
            <MiniStat
              label={event.family === "hourly_temperature" ? "Blended hourly temp" : "NWS temp"}
              value={
                event.family === "hourly_temperature"
                  ? formatTemp(event.weather.hourlyTemperatureF)
                  : formatTemp(event.weather.nwsTemperatureF)
              }
            />
            <MiniStat
              label={
                event.family === "hourly_temperature"
                  ? "Threshold candidate"
                  : "Open-Meteo temp"
              }
              value={
                event.family === "hourly_temperature"
                  ? event.weather.hourlyThresholdCandidate ?? "—"
                  : formatTemp(event.weather.openMeteoTemperatureF)
              }
            />
          </div>

          <ScoreBreakdownPanel
            scoreBreakdown={event.scoreBreakdown}
            forecastSynthesis={event.forecastSynthesis}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <h3 className="font-semibold text-white">Reasons</h3>
              {event.reasons.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
                  {event.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#a8b3ad]">
                  No reasons returned.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <h3 className="font-semibold text-white">Risks</h3>
              {event.risks.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
                  {event.risks.map((risk) => (
                    <li key={risk}>• {risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#a8b3ad]">
                  No risk flags returned.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-white">Event basket table</h3>
            <MarketTable markets={event.markets} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function EventScannerClient() {
  const [data, setData] = useState<EventScannerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedTickers, setExpandedTickers] = useState<Record<string, boolean>>(
    {}
  );
  const [signalFilter, setSignalFilter] = useState<"ALL" | EventScannerSignal>(
    "ALL"
  );
  const [aiReviews, setAiReviews] = useState<Record<string, EventAiReview>>({});
  const [loadingAiReviews, setLoadingAiReviews] = useState<Record<string, boolean>>(
    {}
  );
  const [aiReviewErrors, setAiReviewErrors] = useState<Record<string, string>>({});
  const [scope, setScope] = useState<EventScannerScope>("today_tomorrow");

  async function loadScanner(activeScope = scope) {
    setLoading(true);
    setError("");

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch(`/api/events/scanner?scope=${activeScope}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to load Event Scanner.");
      }

      setData(body);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to load Event Scanner.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }


  async function runEventAiReview(event: EventScannerResult) {
    setLoadingAiReviews((current) => ({
      ...current,
      [event.eventTicker]: true,
    }));
    setAiReviewErrors((current) => ({
      ...current,
      [event.eventTicker]: "",
    }));

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch("/api/events/scanner/ai-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          eventTicker: event.eventTicker,
          seriesTicker: event.seriesTicker,
          appCandidateBasket: event.weatherFavorite,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to run AI review.");
      }

      setAiReviews((current) => ({
        ...current,
        [event.eventTicker]: body.aiReview,
      }));
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to run AI review.";

      setAiReviewErrors((current) => ({
        ...current,
        [event.eventTicker]: message,
      }));
    } finally {
      setLoadingAiReviews((current) => ({
        ...current,
        [event.eventTicker]: false,
      }));
    }
  }

  useEffect(() => {
    void loadScanner(scope);
  }, [scope]);

  const filteredResults = useMemo(() => {
    const results = data?.results ?? [];

    if (signalFilter === "ALL") {
      return results;
    }

    return results.filter((result) => result.signal === signalFilter);
  }, [data, signalFilter]);

  const counts = useMemo(() => {
    const results = data?.results ?? [];

    return {
      all: results.length,
      potentialEntry: results.filter((item) => item.signal === "POTENTIAL_ENTRY")
        .length,
      watchClosely: results.filter((item) => item.signal === "WATCH_CLOSELY")
        .length,
      noClearEdge: results.filter((item) => item.signal === "NO_CLEAR_EDGE")
        .length,
      insufficientData: results.filter(
        (item) => item.signal === "INSUFFICIENT_DATA"
      ).length,
      heldMatches: results.filter((item) => item.matchingPosition !== null).length,
    };
  }, [data]);

  function toggleExpanded(eventTicker: string) {
    setExpandedTickers((current) => ({
      ...current,
      [eventTicker]: !current[eventTicker],
    }));
  }

  function expandTopCandidates() {
    const next: Record<string, boolean> = {};

    for (const result of filteredResults.slice(0, 5)) {
      next[result.eventTicker] = true;
    }

    setExpandedTickers(next);
  }

  function collapseAll() {
    setExpandedTickers({});
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Event Scanner
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Weather event scanner
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#a8b3ad]">
              Scans active Kalshi daily high-temperature and experimental hourly
              temperature events, then compares market pricing against NWS and
              Open-Meteo forecast data. This is advisory-only and does not place
              trades.
            </p>
            <p className="mt-3 text-sm text-[#6f7b74]">
              Scope: {scopeLabel(scope)}
              {data ? ` · API returned ${scopeLabel(data.scope)}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadScanner(scope)}
            disabled={loading}
            className="rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Scanning..." : "Refresh scanner"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-6 text-sm text-[#fecaca]">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Scanned events" value={formatNumber(counts.all)} />
        <MiniStat
          label="Potential entries"
          value={formatNumber(counts.potentialEntry)}
        />
        <MiniStat label="Watch closely" value={formatNumber(counts.watchClosely)} />
        <MiniStat label="No clear edge" value={formatNumber(counts.noClearEdge)} />
        <MiniStat label="Held matches" value={formatNumber(counts.heldMatches)} />
        <MiniStat
          label="Generated"
          value={data ? formatDateTime(data.generatedAt) : loading ? "Scanning" : "—"}
        />
      </section>

      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
              Scan scope
            </p>
            <div className="flex flex-wrap gap-2">
              <ScopeButton
                value="today_tomorrow"
                label="Today + tomorrow"
                activeScope={scope}
                onClick={setScope}
              />
              <ScopeButton
                value="today"
                label="Today"
                activeScope={scope}
                onClick={setScope}
              />
              <ScopeButton
                value="tomorrow"
                label="Tomorrow"
                activeScope={scope}
                onClick={setScope}
              />
              <ScopeButton
                value="all"
                label="All open"
                activeScope={scope}
                onClick={setScope}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
                Signal filter
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ALL", `All (${counts.all})`],
                    ["POTENTIAL_ENTRY", `Potential (${counts.potentialEntry})`],
                    ["WATCH_CLOSELY", `Watch (${counts.watchClosely})`],
                    ["NO_CLEAR_EDGE", `No edge (${counts.noClearEdge})`],
                    [
                      "INSUFFICIENT_DATA",
                      `Insufficient (${counts.insufficientData})`,
                    ],
                  ] as Array<["ALL" | EventScannerSignal, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSignalFilter(value)}
                    className={
                      signalFilter === value
                        ? "rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008]"
                        : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={expandTopCandidates}
                className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Expand top 5
              </button>

              <button
                type="button"
                onClick={collapseAll}
                className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading && !data ? (
        <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-sm text-[#a8b3ad]">
          Scanning Kalshi weather events...
        </section>
      ) : null}

      {!loading && data && filteredResults.length === 0 ? (
        <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-sm text-[#a8b3ad]">
          No events matched the current filter.
        </section>
      ) : null}

      <section className="space-y-4">
        {filteredResults.map((event) => (
          <EventCard
            key={event.eventTicker}
            event={event}
            expanded={Boolean(expandedTickers[event.eventTicker])}
            onToggle={() => toggleExpanded(event.eventTicker)}
            aiReview={aiReviews[event.eventTicker] ?? null}
            loadingAiReview={Boolean(loadingAiReviews[event.eventTicker])}
            aiReviewError={aiReviewErrors[event.eventTicker] ?? ""}
            onRunAiReview={() => void runEventAiReview(event)}
          />
        ))}
      </section>

      {data?.diagnostics.errors.length ? (
        <section className="rounded-3xl border border-[#facc15]/30 bg-[#facc15]/10 p-6">
          <h2 className="font-semibold text-[#fde68a]">Scanner diagnostics</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#fde68a]">
            {data.diagnostics.errors.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
