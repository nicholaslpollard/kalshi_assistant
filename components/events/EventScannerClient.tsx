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

  modelConsensus?: Array<{
    source: string;
    forecastHighF: number | null;
    bucket: string | null;
    weight: "very_high" | "high" | "medium_high" | "medium" | "low" | "context";
    notes: string;
  }>;
  bucketProbabilities?: Array<{
    bucket: string;
    probabilityPercent: number;
    fairValueEstimate: number | null;
    reasoning: string;
  }>;
  fairValue?: {
    modelImpliedProbabilityPercent: number | null;
    fairYesPrice: number | null;
    currentYesAsk: number | null;
    currentYesBid: number | null;
    edgeCents: number | null;
    maxEntryPrice: number | null;
    priceDiscipline: string;
  };
  observationTriggers?: Array<{
    trigger: string;
    action: string;
    urgency: "low" | "medium" | "high";
  }>;
  settlementClock?: {
    localTimeNow: string | null;
    remainingHeatingWindow: string;
    peakHeatingPassed: boolean | null;
    settlementTimingRead: string;
  };
  forecastChangeRead?: string;
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

type LeadTimeBucket =
  | "0_3h_before_peak"
  | "3_6h_before_peak"
  | "6_12h_before_peak"
  | "12_18h_before_peak"
  | "18_30h_before_peak"
  | "30_48h_before_peak"
  | "2_5d_before_peak"
  | "after_peak"
  | "unknown";

type ScannerLeadTimeBiasRow = {
  source: string;
  leadTimeBucket: LeadTimeBucket | string;
  leadTimeLabel?: string | null;
  stationId?: string | null;
  stationName?: string | null;
  eventFamily?: EventScannerFamily | string | null;
  sampleCount: number;
  meanErrorF: number | null;
  meanAbsoluteErrorF: number | null;
  meanLeadTimeHours?: number | null;
  exactBucketCount: number;
  exactBucketRate?: number | null;
  withinOneBucketCount: number;
  withinOneBucketRate?: number | null;
  notes?: string | null;
  read?: string | null;
};

type ScannerBiasSummary = {
  leadTimeRows?: ScannerLeadTimeBiasRow[];
  rows?: Array<{
    source: string;
    sampleCount: number;
    meanErrorF: number | null;
    meanAbsoluteErrorF: number | null;
    exactBucketCount?: number;
    withinOneBucketCount?: number;
    notes?: string;
  }>;
};

type ScannerBiasRead = {
  leadTimeBucket: LeadTimeBucket;
  leadTimeLabel: string;
  sampleCount: number;
  bestSource: string | null;
  meanErrorF: number | null;
  meanAbsoluteErrorF: number | null;
  scoreAdjustment: number;
  adjustedForecastHighF: number | null;
  adjustedBucket: string | null;
  headline: string;
  note: string;
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
function classifyScannerLeadTime(event: EventScannerResult, now = new Date()): { bucket: LeadTimeBucket; label: string; hours: number | null } {
  if (!event.eventDate) {
    return { bucket: "unknown", label: "Unknown lead time", hours: null };
  }

  const targetHour = event.family === "hourly_temperature" && event.eventHourLocal !== null ? event.eventHourLocal : 16;
  const target = new Date(`${event.eventDate}T${String(targetHour).padStart(2, "0")}:00:00`);

  if (Number.isNaN(target.getTime())) {
    return { bucket: "unknown", label: "Unknown lead time", hours: null };
  }

  const hours = (target.getTime() - now.getTime()) / 36e5;

  if (hours < 0) {
    return { bucket: "after_peak", label: "After normal peak window", hours };
  }

  if (hours <= 3) return { bucket: "0_3h_before_peak", label: "0–3h before peak", hours };
  if (hours <= 6) return { bucket: "3_6h_before_peak", label: "3–6h before peak", hours };
  if (hours <= 12) return { bucket: "6_12h_before_peak", label: "6–12h before peak", hours };
  if (hours <= 18) return { bucket: "12_18h_before_peak", label: "12–18h before peak", hours };
  if (hours <= 30) return { bucket: "18_30h_before_peak", label: "18–30h before peak", hours };
  if (hours <= 48) return { bucket: "30_48h_before_peak", label: "30–48h before peak", hours };
  if (hours <= 120) return { bucket: "2_5d_before_peak", label: "2–5d before peak", hours };

  return { bucket: "unknown", label: `${Math.round(hours)}h before peak`, hours };
}

function normalizeLeadTimeBucket(value: unknown): LeadTimeBucket {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/\s+/g, " ");

  if (!normalized) return "unknown";
  if (normalized.includes("after")) return "after_peak";
  if (normalized.includes("0-3") || normalized.includes("0_3")) return "0_3h_before_peak";
  if (normalized.includes("3-6") || normalized.includes("3_6")) return "3_6h_before_peak";
  if (normalized.includes("6-12") || normalized.includes("6_12")) return "6_12h_before_peak";
  if (normalized.includes("12-18") || normalized.includes("12_18")) return "12_18h_before_peak";
  if (normalized.includes("18-30") || normalized.includes("18_30")) return "18_30h_before_peak";
  if (normalized.includes("30-48") || normalized.includes("30_48")) return "30_48h_before_peak";
  if (normalized.includes("2-5d") || normalized.includes("2_5d") || normalized.includes("2-5 d")) return "2_5d_before_peak";

  return "unknown";
}

function dailyHighBucketLabelFromTemperature(tempF: number | null) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const lower = Math.floor(tempF);
  return `${lower}° to ${lower + 1}°`;
}
function normalizedText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function biasRowMatchesEvent(row: ScannerLeadTimeBiasRow, event: EventScannerResult) {
  const family = row.eventFamily ? String(row.eventFamily) : null;
  if (family && family !== event.family) {
    return false;
  }

  return true;
}

function biasRowMatchesLocation(row: ScannerLeadTimeBiasRow, event: EventScannerResult) {
  const rowStation = normalizedText(row.stationName ?? row.stationId ?? null);
  const eventLocation = normalizedText(event.locationName);

  if (!rowStation || !eventLocation) {
    return false;
  }

  if (rowStation.includes(eventLocation) || eventLocation.includes(rowStation)) {
    return true;
  }

  const eventTokens = eventLocation.split(" ").filter((token) => token.length >= 4);
  return eventTokens.some((token) => rowStation.includes(token));
}


function summarizeLeadTimeBias(event: EventScannerResult, biasSummary: ScannerBiasSummary | null): ScannerBiasRead {
  const lead = classifyScannerLeadTime(event);
  const leadBucket = normalizeLeadTimeBucket(lead.bucket);
  const sameLeadRows = (biasSummary?.leadTimeRows ?? []).filter((row) => normalizeLeadTimeBucket(row.leadTimeBucket) === leadBucket);
  const sameFamilyRows = sameLeadRows.filter((row) => biasRowMatchesEvent(row, event));
  const sameLocationRows = sameFamilyRows.filter((row) => biasRowMatchesLocation(row, event));
  const rows = sameLocationRows.length ? sameLocationRows : sameFamilyRows.length ? sameFamilyRows : sameLeadRows;
  const usableRows = rows.filter((row) => row.sampleCount >= 2 && row.meanAbsoluteErrorF !== null);
  const best = usableRows.slice().sort((a, b) => {
    const aMae = a.meanAbsoluteErrorF ?? 99;
    const bMae = b.meanAbsoluteErrorF ?? 99;
    return aMae - bMae || b.sampleCount - a.sampleCount;
  })[0] ?? null;

  const weightedRows = usableRows.length ? usableRows : rows.filter((row) => row.meanErrorF !== null);
  const totalSamples = weightedRows.reduce((sum, row) => sum + Math.max(0, row.sampleCount), 0);
  const weightedError = totalSamples > 0
    ? weightedRows.reduce((sum, row) => sum + (row.meanErrorF ?? 0) * Math.max(0, row.sampleCount), 0) / totalSamples
    : null;
  const weightedMae = totalSamples > 0
    ? weightedRows.reduce((sum, row) => sum + (row.meanAbsoluteErrorF ?? 0) * Math.max(0, row.sampleCount), 0) / totalSamples
    : null;

  const forecastHigh = event.forecastSynthesis?.predictedHighF ?? event.weather.nwsTemperatureF ?? event.weather.openMeteoTemperatureF ?? null;
  const adjustedForecastHighF = forecastHigh !== null && weightedError !== null ? forecastHigh - weightedError : null;
  const adjustedBucket = event.family === "daily_high" ? dailyHighBucketLabelFromTemperature(adjustedForecastHighF) : null;

  const scoreAdjustment = (() => {
    if (!best || best.meanAbsoluteErrorF === null || best.sampleCount < 2) return 0;
    let delta = 0;
    if (best.meanAbsoluteErrorF <= 0.75) delta += 7;
    else if (best.meanAbsoluteErrorF <= 1.25) delta += 4;
    else if (best.meanAbsoluteErrorF >= 2.5) delta -= 6;

    if (Math.abs(best.meanErrorF ?? 0) >= 1.5) delta += 2;
    if (weightedRows.length >= 3) delta += 2;
    return Math.max(-8, Math.min(10, delta));
  })();

  if (!rows.length) {
    return {
      leadTimeBucket: leadBucket,
      leadTimeLabel: lead.label,
      sampleCount: 0,
      bestSource: null,
      meanErrorF: null,
      meanAbsoluteErrorF: null,
      scoreAdjustment: 0,
      adjustedForecastHighF: null,
      adjustedBucket: null,
      headline: "No lead-time bias history yet",
      note: `No resolved lead-time segment samples are available for scans run ${lead.label.toLowerCase()}. Ranking is using live forecast evidence only.`,
    };
  }

  const direction = weightedError === null
    ? "near neutral"
    : weightedError > 0.5
      ? `running warm by ${weightedError.toFixed(1)}°F`
      : weightedError < -0.5
        ? `running cool by ${Math.abs(weightedError).toFixed(1)}°F`
        : "near neutral";

  const adjustedText = adjustedForecastHighF !== null
    ? `Bias-adjusted forecast read: ${adjustedForecastHighF.toFixed(1)}°F${adjustedBucket ? ` (${adjustedBucket})` : ""}.`
    : "Not enough data to calculate a bias-adjusted forecast high.";

  return {
    leadTimeBucket: leadBucket,
    leadTimeLabel: lead.label,
    sampleCount: rows.reduce((sum, row) => sum + row.sampleCount, 0),
    bestSource: best?.source ?? null,
    meanErrorF: weightedError === null ? null : Number(weightedError.toFixed(2)),
    meanAbsoluteErrorF: weightedMae === null ? null : Number(weightedMae.toFixed(2)),
    scoreAdjustment,
    adjustedForecastHighF: adjustedForecastHighF === null ? null : Number(adjustedForecastHighF.toFixed(1)),
    adjustedBucket,
    headline: best ? `${best.source} has been strongest ${lead.label.toLowerCase()}` : `Lead-time samples exist for ${lead.label.toLowerCase()}`,
    note: `${best?.read ?? `Historical forecasts at this lead time are ${direction}.`} ${adjustedText}`,
  };
}

type EventOpportunityCategory =
  | "best_opportunity"
  | "watch_closely"
  | "held_position_risk"
  | "forecast_disagreement"
  | "avoid_no_edge";

type EventOpportunityRead = {
  category: EventOpportunityCategory;
  categoryLabel: string;
  headline: string;
  priorityScore: number;
  forecastEdgeLabel: string;
  modelAgreementLabel: string;
  priceRead: string;
  actionLabel: string;
  riskLabel: string;
  biasRead: ScannerBiasRead;
};

type EventOpportunityGroup = {
  id: EventOpportunityCategory;
  label: string;
  description: string;
  events: EventScannerResult[];
};

function opportunityCategoryLabel(category: EventOpportunityCategory) {
  switch (category) {
    case "best_opportunity":
      return "Best Opportunities";
    case "watch_closely":
      return "Watch Closely";
    case "held_position_risk":
      return "Held Position Risk";
    case "forecast_disagreement":
      return "Forecast Disagreement";
    case "avoid_no_edge":
      return "Avoid / No Clear Edge";
    default:
      return "Scanner Results";
  }
}

function opportunityCategoryDescription(category: EventOpportunityCategory) {
  switch (category) {
    case "best_opportunity":
      return "Highest-priority weather/market mismatches. These deserve review first, especially when price is still below the app's forecast-supported fair-value read.";
    case "watch_closely":
      return "Useful candidates, but price, timing, model spread, or source agreement still need confirmation.";
    case "held_position_risk":
      return "Events tied to an open position where the scanner sees hedge, roll, exit, or overshoot/cap risk worth reviewing.";
    case "forecast_disagreement":
      return "Markets where the weather sources diverge enough that the bucket call should be treated cautiously.";
    case "avoid_no_edge":
      return "Low-priority cards with weak forecast support, insufficient evidence, or no clear market edge.";
    default:
      return "Scanner results grouped by current opportunity read.";
  }
}

function opportunityCategoryClass(category: EventOpportunityCategory) {
  switch (category) {
    case "best_opportunity":
      return "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#bbf7d0]";
    case "watch_closely":
      return "border-[#facc15]/40 bg-[#facc15]/10 text-[#fde68a]";
    case "held_position_risk":
      return "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#bae6fd]";
    case "forecast_disagreement":
      return "border-[#fb923c]/40 bg-[#fb923c]/10 text-[#fed7aa]";
    case "avoid_no_edge":
      return "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]";
    default:
      return "border-[#1f2a24] bg-[#0b120f] text-[#a8b3ad]";
  }
}

function sourceAgreementLabel(value: EventForecastSynthesis["sourceAgreement"] | undefined) {
  switch (value) {
    case "strong":
      return "Strong model agreement";
    case "moderate":
      return "Moderate model agreement";
    case "weak":
      return "Weak model agreement";
    case "insufficient":
      return "Insufficient model data";
    default:
      return "Model agreement unavailable";
  }
}

function priceReadForEvent(event: EventScannerResult) {
  const candidate = event.weatherFavorite ?? event.marketFavorite;

  if (!candidate) {
    return "No candidate price";
  }

  const ask = candidate.yesAskEstimate;
  const bid = candidate.yesBid;

  if (ask !== null && Number.isFinite(ask)) {
    return `Candidate ask ${formatPrice(ask)}`;
  }

  if (bid !== null && Number.isFinite(bid)) {
    return `Candidate bid ${formatPrice(bid)}`;
  }

  return "Candidate price unavailable";
}

function forecastEdgeForEvent(event: EventScannerResult) {
  if (event.family === "hourly_temperature") {
    return event.weather.hourlyThresholdCandidate
      ? `Forecast threshold ${event.weather.hourlyThresholdCandidate}`
      : "No threshold edge";
  }

  const market = event.marketFavorite?.label ?? null;
  const weather = event.weatherFavorite?.label ?? event.forecastSynthesis?.likelyBucket ?? null;

  if (!market && !weather) {
    return "No bucket comparison";
  }

  if (market && weather && market !== weather) {
    return `Market ${market} vs weather ${weather}`;
  }

  if (weather) {
    return `Weather supports ${weather}`;
  }

  return `Market favors ${market}`;
}

function riskReadForEvent(event: EventScannerResult) {
  if (event.forecastSynthesis?.sourceAgreement === "weak") {
    return "Forecast disagreement risk";
  }

  if (event.risks.length > 0) {
    return event.risks[0];
  }

  if (event.signal === "INSUFFICIENT_DATA") {
    return "Insufficient evidence";
  }

  return "No major scanner risk flagged";
}

function classifyEventOpportunity(event: EventScannerResult, biasSummary: ScannerBiasSummary | null = null): EventOpportunityRead {
  const biasRead = summarizeLeadTimeBias(event, biasSummary);
  const sourceAgreement = event.forecastSynthesis?.sourceAgreement;
  const heldPositionMismatch = Boolean(
    event.matchingPosition &&
      event.weatherFavorite?.ticker &&
      event.matchingPosition.ticker !== event.weatherFavorite.ticker
  );
  const weakAgreement = sourceAgreement === "weak";
  const strongAgreement = sourceAgreement === "strong" || sourceAgreement === "moderate";
  const candidateAsk = event.weatherFavorite?.yesAskEstimate ?? event.marketFavorite?.yesAskEstimate ?? null;
  const priceBonus =
    candidateAsk !== null && Number.isFinite(candidateAsk)
      ? candidateAsk <= 0.35
        ? 8
        : candidateAsk <= 0.5
          ? 4
          : candidateAsk >= 0.75
            ? -5
            : 0
      : -3;

  let category: EventOpportunityCategory = "avoid_no_edge";
  let headline = "No clear actionable edge.";
  let actionLabel = "Avoid unless new data changes the setup.";

  if (heldPositionMismatch) {
    category = "held_position_risk";
    headline = "Open position differs from the scanner's forecast-supported basket.";
    actionLabel = "Review for hedge, trim, roll, or exit risk.";
  } else if (weakAgreement && event.signal !== "INSUFFICIENT_DATA") {
    category = "forecast_disagreement";
    headline = "Weather sources are split enough to lower confidence.";
    actionLabel = "Wait for model convergence or use smaller sizing.";
  } else if (event.signal === "POTENTIAL_ENTRY" && event.score >= 70 && strongAgreement) {
    category = "best_opportunity";
    headline = "Forecast support and scanner score justify first review.";
    actionLabel = "Review price immediately; enter only below fair-value discipline.";
  } else if (event.signal === "POTENTIAL_ENTRY" || event.signal === "WATCH_CLOSELY") {
    category = "watch_closely";
    headline = "Potential setup, but not clean enough to be top priority.";
    actionLabel = "Monitor forecast updates, price, and next observation.";
  }

  const priorityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        event.score +
          priceBonus +
          (event.matchingPosition ? 6 : 0) +
          biasRead.scoreAdjustment +
          (sourceAgreement === "strong" ? 6 : sourceAgreement === "moderate" ? 3 : 0) -
          (weakAgreement ? 10 : 0) -
          (event.signal === "INSUFFICIENT_DATA" ? 20 : 0)
      )
    )
  );

  return {
    category,
    categoryLabel: opportunityCategoryLabel(category),
    headline,
    priorityScore,
    forecastEdgeLabel: forecastEdgeForEvent(event),
    modelAgreementLabel: sourceAgreementLabel(sourceAgreement),
    priceRead: priceReadForEvent(event),
    actionLabel,
    riskLabel: riskReadForEvent(event),
    biasRead,
  };
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-3 sm:p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </p>
      <p className="mt-2 break-words text-base font-bold text-white sm:text-lg">{value}</p>
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
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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
          <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-3 sm:p-4 md:w-[320px]">
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
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
          ? "min-h-11 w-full rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008] min-[420px]:w-auto"
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
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[720px] text-left text-xs sm:text-sm">
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
    <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-4 sm:p-5">
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



function ModelConsensusPanel({
  rows,
}: {
  rows?: NonNullable<EventAiReview["modelConsensus"]>;
}) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
      <h4 className="font-semibold text-white">Model consensus</h4>
      <div className="mt-4 overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[680px] text-left text-xs sm:text-sm">
          <thead className="text-[#a8b3ad]">
            <tr>
              <th className="border-b border-[#1f2a24] px-3 py-2">Source</th>
              <th className="border-b border-[#1f2a24] px-3 py-2">High</th>
              <th className="border-b border-[#1f2a24] px-3 py-2">Bucket</th>
              <th className="border-b border-[#1f2a24] px-3 py-2">Weight</th>
              <th className="border-b border-[#1f2a24] px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.source}-${index}`} className="border-b border-[#1f2a24]">
                <td className="px-3 py-2 font-semibold text-white">{row.source}</td>
                <td className="px-3 py-2 text-[#a8b3ad]">
                  {row.forecastHighF !== null ? `${formatNumber(row.forecastHighF, 1)}°F` : "—"}
                </td>
                <td className="px-3 py-2 text-[#bae6fd]">{row.bucket ?? "—"}</td>
                <td className="px-3 py-2 text-[#a8b3ad]">{row.weight.replace("_", " ")}</td>
                <td className="px-3 py-2 text-[#a8b3ad]">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BucketProbabilityPanel({
  probabilities,
}: {
  probabilities?: NonNullable<EventAiReview["bucketProbabilities"]>;
}) {
  if (!probabilities || probabilities.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
      <h4 className="font-semibold text-white">Bucket probability distribution</h4>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {probabilities.map((item) => (
          <div key={item.bucket} className="rounded-xl border border-[#1f2a24] bg-[#101714] p-4">
            <p className="font-semibold text-white">{item.bucket}</p>
            <p className="mt-1 text-2xl font-bold text-[#7dd3fc]">
              {item.probabilityPercent.toFixed(0)}%
            </p>
            <p className="mt-1 text-xs text-[#a8b3ad]">
              Fair value: {formatPrice(item.fairValueEstimate)}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">{item.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionSupportPanel({ aiReview }: { aiReview: EventAiReview }) {
  const hasFairValue = Boolean(aiReview.fairValue);
  const hasTriggers = Boolean(aiReview.observationTriggers?.length);
  const hasClock = Boolean(aiReview.settlementClock);
  const hasForecastChange = Boolean(aiReview.forecastChangeRead);

  if (!hasFairValue && !hasTriggers && !hasClock && !hasForecastChange) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-[#fcd34d]">
        Decision support
      </p>
      {aiReview.fairValue ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MiniStat label="Fair YES" value={formatPrice(aiReview.fairValue.fairYesPrice)} />
          <MiniStat label="Max entry" value={formatPrice(aiReview.fairValue.maxEntryPrice)} />
          <MiniStat
            label="Edge"
            value={aiReview.fairValue.edgeCents !== null ? `${aiReview.fairValue.edgeCents.toFixed(1)}¢` : "—"}
          />
        </div>
      ) : null}
      {aiReview.fairValue?.priceDiscipline ? (
        <p className="mt-4 text-sm leading-6 text-[#fde68a]">
          {aiReview.fairValue.priceDiscipline}
        </p>
      ) : null}
      {aiReview.forecastChangeRead ? (
        <p className="mt-4 text-sm leading-6 text-[#fde68a]">
          <span className="font-semibold text-white">Forecast trend:</span>{" "}
          {aiReview.forecastChangeRead}
        </p>
      ) : null}
      {aiReview.settlementClock ? (
        <p className="mt-4 text-sm leading-6 text-[#fde68a]">
          <span className="font-semibold text-white">Settlement clock:</span>{" "}
          {aiReview.settlementClock.remainingHeatingWindow} {aiReview.settlementClock.settlementTimingRead}
        </p>
      ) : null}
      {aiReview.observationTriggers?.length ? (
        <div className="mt-4 space-y-3">
          {aiReview.observationTriggers.map((trigger, index) => (
            <div key={`${trigger.trigger}-${index}`} className="rounded-xl border border-[#f59e0b]/30 bg-[#0b120f]/70 p-3">
              <p className="text-sm font-semibold text-white">{trigger.trigger}</p>
              <p className="mt-1 text-sm text-[#fde68a]">{trigger.action}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#fcd34d]">
                {trigger.urgency} urgency
              </p>
            </div>
          ))}
        </div>
      ) : null}
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

      <ModelConsensusPanel rows={aiReview.modelConsensus} />

      <BucketProbabilityPanel probabilities={aiReview.bucketProbabilities} />

      <DecisionSupportPanel aiReview={aiReview} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
          <h4 className="font-semibold text-white">Observation and timing read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.weatherEvidenceRead.observationTrend}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.weatherEvidenceRead.timingRead}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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

      <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-4 sm:p-5">
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

      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
        <h4 className="font-semibold text-white">Entry reasoning</h4>
        <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
          {aiReview.entryOpinion.reasoning}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
          <h4 className="font-semibold text-white">NWS read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.nwsInterpretation}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
          <h4 className="font-semibold text-white">Open-Meteo read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.openMeteoInterpretation}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
          <h4 className="font-semibold text-white">Kalshi market read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.kalshiMarketInterpretation}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
          <h4 className="font-semibold text-white">Observation read</h4>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
            {aiReview.dataRead.observationInterpretation}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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

        <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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



function OpportunityCommandPanel({
  opportunityRead,
}: {
  opportunityRead: EventOpportunityRead;
}) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${opportunityCategoryClass(opportunityRead.category)}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-80">
            Scanner command read
          </p>
          <h3 className="mt-2 text-lg font-bold text-white">
            {opportunityRead.categoryLabel}
          </h3>
          <p className="mt-2 text-sm leading-6">
            {opportunityRead.headline}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4 lg:w-[280px]">
          <p className="text-xs uppercase tracking-[0.18em] opacity-80">
            Priority score
          </p>
          <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {opportunityRead.priorityScore}/100
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Forecast edge</p>
          <p className="mt-2 text-sm font-semibold text-white">{opportunityRead.forecastEdgeLabel}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Agreement</p>
          <p className="mt-2 text-sm font-semibold text-white">{opportunityRead.modelAgreementLabel}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Price read</p>
          <p className="mt-2 text-sm font-semibold text-white">{opportunityRead.priceRead}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">Risk</p>
          <p className="mt-2 text-sm font-semibold text-white">{opportunityRead.riskLabel}</p>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-white">
        Action: {opportunityRead.actionLabel}
      </p>
    </div>
  );
}

function BiasWeightedReadPanel({ biasRead }: { biasRead: ScannerBiasRead }) {
  const adjustmentText = biasRead.scoreAdjustment > 0
    ? `+${biasRead.scoreAdjustment}`
    : String(biasRead.scoreAdjustment);

  return (
    <div className="rounded-2xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c4b5fd]">
            Lead-time bias read
          </p>
          <h3 className="mt-2 text-lg font-bold text-white">{biasRead.headline}</h3>
          <p className="mt-2 text-sm leading-6 text-[#d8b4fe]">{biasRead.note}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-[#ddd6fe] md:w-[240px]">
          <p className="text-xs uppercase tracking-[0.18em] text-[#a78bfa]">Ranking impact</p>
          <p className="mt-2 text-2xl font-bold text-white">{adjustmentText}</p>
          <p className="mt-1 text-xs text-[#ddd6fe]">{biasRead.leadTimeLabel}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Samples" value={String(biasRead.sampleCount)} />
        <MiniStat label="Best source" value={biasRead.bestSource ?? "—"} />
        <MiniStat label="Mean error" value={biasRead.meanErrorF === null ? "—" : `${biasRead.meanErrorF > 0 ? "+" : ""}${biasRead.meanErrorF.toFixed(1)}°F`} />
        <MiniStat label="Adjusted bucket" value={biasRead.adjustedBucket ?? "—"} />
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
  opportunityRead,
}: {
  event: EventScannerResult;
  expanded: boolean;
  onToggle: () => void;
  aiReview: EventAiReview | null;
  loadingAiReview: boolean;
  aiReviewError: string;
  onRunAiReview: () => void;
  opportunityRead: EventOpportunityRead;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#1f2a24] bg-[#101714] sm:rounded-3xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left sm:p-5"
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

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${opportunityCategoryClass(
                  opportunityRead.category
                )}`}
              >
                Priority {opportunityRead.priorityScore}/100
              </span>

              <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a8b3ad]">
                {opportunityRead.modelAgreementLabel}
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

            <h2 className="mt-4 break-words text-xl font-bold text-white sm:text-2xl">
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

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:w-[640px]">
            <MiniStat
              label="Command group"
              value={opportunityRead.categoryLabel}
            />
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

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#1f2a24] pt-4 text-sm text-[#a8b3ad]">
          <span>
            {expanded ? "Hide details" : "Show details"} · {event.markets.length}{" "}
            baskets
          </span>
          <span className="text-lg text-[#22c55e]">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-[#1f2a24] p-4 sm:space-y-5 sm:p-5">
          <OpportunityCommandPanel opportunityRead={opportunityRead} />
          <BiasWeightedReadPanel biasRead={opportunityRead.biasRead} />

          {event.matchingPosition ? (
            <MatchingPositionPanel matchingPosition={event.matchingPosition} />
          ) : null}

          <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-4 sm:p-5">
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
                className="min-h-11 w-full rounded-xl bg-[#38bdf8] px-5 py-3 text-sm font-semibold text-[#021018] transition hover:bg-[#0ea5e9] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
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
            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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

            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 sm:p-5">
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
  const [scannerBiasSummary, setScannerBiasSummary] = useState<ScannerBiasSummary | null>(null);
  const [scannerBiasStatus, setScannerBiasStatus] = useState<string | null>(null);

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


  async function loadScannerBiasSummary() {
    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        setScannerBiasSummary(null);
        return;
      }

      const idToken = await user.getIdToken();
      const segmentParams = new URLSearchParams({ limit: "1500" });
      const segmentResponse = await fetch(`/api/weather/history/bias/segments?${segmentParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const segmentBody = await segmentResponse.json();

      if (segmentResponse.ok && Array.isArray(segmentBody.rows)) {
        const segmentRows = segmentBody.rows.map((row: ScannerLeadTimeBiasRow) => ({
          ...row,
          leadTimeBucket: normalizeLeadTimeBucket(row.leadTimeBucket),
          leadTimeLabel: row.leadTimeLabel ?? String(row.leadTimeBucket ?? "Unknown lead time"),
          notes: row.notes ?? row.read ?? "Lead-time segment sample.",
        }));

        setScannerBiasSummary({ leadTimeRows: segmentRows });
        setScannerBiasStatus(`${segmentRows.length} lead-time bias segments loaded`);
        return;
      }

      const params = new URLSearchParams({ limit: "500" });
      const response = await fetch(`/api/weather/history/bias?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? segmentBody?.error ?? "Unable to load bias summary.");
      }

      setScannerBiasSummary(body.summary ?? null);
      setScannerBiasStatus("Broad bias summary loaded");
    } catch (err) {
      console.error(err);
      setScannerBiasSummary(null);
      setScannerBiasStatus(err instanceof Error ? err.message : "Unable to load bias summary.");
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

  useEffect(() => {
    void loadScannerBiasSummary();
  }, []);

  const filteredResults = useMemo(() => {
    const results = data?.results ?? [];

    if (signalFilter === "ALL") {
      return results;
    }

    return results.filter((result) => result.signal === signalFilter);
  }, [data, signalFilter]);

  const rankedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      const bRead = classifyEventOpportunity(b, scannerBiasSummary);
      const aRead = classifyEventOpportunity(a, scannerBiasSummary);

      if (bRead.priorityScore !== aRead.priorityScore) {
        return bRead.priorityScore - aRead.priorityScore;
      }

      return b.score - a.score;
    });
  }, [filteredResults, scannerBiasSummary]);

  const groupedResults = useMemo<EventOpportunityGroup[]>(() => {
    const order: EventOpportunityCategory[] = [
      "best_opportunity",
      "held_position_risk",
      "watch_closely",
      "forecast_disagreement",
      "avoid_no_edge",
    ];

    return order
      .map((id) => ({
        id,
        label: opportunityCategoryLabel(id),
        description: opportunityCategoryDescription(id),
        events: rankedResults.filter(
          (event) => classifyEventOpportunity(event, scannerBiasSummary).category === id
        ),
      }))
      .filter((group) => group.events.length > 0);
  }, [rankedResults, scannerBiasSummary]);

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

    for (const result of rankedResults.slice(0, 5)) {
      next[result.eventTicker] = true;
    }

    setExpandedTickers(next);
  }

  function collapseAll() {
    setExpandedTickers({});
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-4 sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Event Scanner
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Weather event scanner
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#a8b3ad]">
              Scans active Kalshi daily high-temperature and experimental hourly
              temperature events, compares market pricing against NWS/Open-Meteo
              forecast data, then groups cards into command-board categories so
              the best opportunities and position risks surface first. This is
              advisory-only and does not place trades.
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
            className="min-h-11 w-full rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="Scanned events" value={formatNumber(counts.all)} />
        <MiniStat
          label="Potential entries"
          value={formatNumber(counts.potentialEntry)}
        />
        <MiniStat label="Watch closely" value={formatNumber(counts.watchClosely)} />
        <MiniStat label="No clear edge" value={formatNumber(counts.noClearEdge)} />
        <MiniStat label="Held matches" value={formatNumber(counts.heldMatches)} />
        <MiniStat label="Bias history" value={scannerBiasStatus ?? (scannerBiasSummary ? "Loaded" : "Not loaded")} />
        <MiniStat
          label="Generated"
          value={data ? formatDateTime(data.generatedAt) : loading ? "Scanning" : "—"}
        />
      </section>

      <section className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-4 sm:rounded-3xl sm:p-5">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
              Scan scope
            </p>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
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
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
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
                        ? "min-h-11 w-full rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008] min-[420px]:w-auto"
                        : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:flex md:flex-wrap">
              <button
                type="button"
                onClick={expandTopCandidates}
                className="min-h-11 w-full rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] min-[420px]:w-auto"
              >
                Expand top 5
              </button>

              <button
                type="button"
                onClick={collapseAll}
                className="min-h-11 w-full rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] min-[420px]:w-auto"
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

      <section className="space-y-6">
        {groupedResults.map((group) => (
          <div key={group.id} className="space-y-4">
            <div className={`rounded-2xl border p-4 sm:rounded-3xl sm:p-5 ${opportunityCategoryClass(group.id)}`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] opacity-80">
                    {group.events.length} event{group.events.length === 1 ? "" : "s"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-white">
                    {group.label}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6">
                    {group.description}
                  </p>
                </div>
              </div>
            </div>

            {group.events.map((event) => {
              const opportunityRead = classifyEventOpportunity(event, scannerBiasSummary);

              return (
                <EventCard
                  key={event.eventTicker}
                  event={event}
                  expanded={Boolean(expandedTickers[event.eventTicker])}
                  onToggle={() => toggleExpanded(event.eventTicker)}
                  aiReview={aiReviews[event.eventTicker] ?? null}
                  loadingAiReview={Boolean(loadingAiReviews[event.eventTicker])}
                  aiReviewError={aiReviewErrors[event.eventTicker] ?? ""}
                  onRunAiReview={() => void runEventAiReview(event)}
                  opportunityRead={opportunityRead}
                />
              );
            })}
          </div>
        ))}
      </section>

      {data?.diagnostics.errors.length ? (
        <section className="rounded-2xl border border-[#facc15]/30 bg-[#facc15]/10 p-4 sm:rounded-3xl sm:p-6">
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

