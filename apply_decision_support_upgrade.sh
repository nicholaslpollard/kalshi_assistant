#!/usr/bin/env bash
set -euo pipefail

echo "Applying Kalshi decision-support upgrade..."

mkdir -p "$(dirname "types/eventScanner.ts")"
cat > 'types/eventScanner.ts' <<'__KALSHI_FILE__'

export type AiModelConsensusRow = {
  source: string;
  forecastHighF: number | null;
  bucket: string | null;
  weight: "very_high" | "high" | "medium_high" | "medium" | "low" | "context";
  notes: string;
};

export type AiBucketProbability = {
  bucket: string;
  probabilityPercent: number;
  fairValueEstimate: number | null;
  reasoning: string;
};

export type AiFairValueRead = {
  modelImpliedProbabilityPercent: number | null;
  fairYesPrice: number | null;
  currentYesAsk: number | null;
  currentYesBid: number | null;
  edgeCents: number | null;
  maxEntryPrice: number | null;
  priceDiscipline: string;
};

export type AiObservationTrigger = {
  trigger: string;
  action: string;
  urgency: "low" | "medium" | "high";
};

export type AiSettlementClockRead = {
  localTimeNow: string | null;
  remainingHeatingWindow: string;
  peakHeatingPassed: boolean | null;
  settlementTimingRead: string;
};

export type EventScannerSignal =
  | "POTENTIAL_ENTRY"
  | "WATCH_CLOSELY"
  | "NO_CLEAR_EDGE"
  | "INSUFFICIENT_DATA";

export type EventScannerScope =
  | "today_tomorrow"
  | "today"
  | "tomorrow"
  | "all";

export type EventScannerFamily = "daily_high" | "hourly_temperature";

export type EventScannerWeatherRead = {
  heldOrFavoriteBucket: string | null;
  nwsBucket: string | null;
  openMeteoBucket: string | null;
  nwsTemperatureF: number | null;
  openMeteoTemperatureF: number | null;
  hourlyTemperatureF: number | null;
  hourlyThresholdCandidate: string | null;
  weatherAgreement: boolean;
};

export type EventScannerMarket = {
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

export type EventScannerMatchingPosition = {
  ticker: string;
  side: "yes" | "no" | "flat" | "unknown";
  contractCount: number | null;
  positionFp: number | null;
};

export type EventForecastSynthesis = {
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

export type EventScannerScoreBreakdown = {
  forecastAgreement: number;
  marketMismatch: number;
  priceAttractiveness: number;
  forecastStrength: number;
  dataQuality: number;
  total: number;
};

export type EventScannerResult = {
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
  weather: EventScannerWeatherRead;
  matchingPosition: EventScannerMatchingPosition | null;
  rawEvent?: Record<string, unknown>;
};

export type EventScannerResponse = {
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

export type EventAiReviewAction =
  | "ENTER_YES"
  | "WATCH_ONLY"
  | "AVOID"
  | "INSUFFICIENT_DATA";

export type EventAiCandidateAssessment = {
  appCandidateTicker: string | null;
  appCandidateLabel: string | null;
  assessment: "agree" | "partially_agree" | "disagree" | "no_candidate";
  assessmentReason: string;
};

export type EventAiIndependentForecast = {
  predictedHighF: number | null;
  mostLikelyBucket: string | null;
  secondMostLikelyBucket: string | null;
  probabilityEstimate: string;
  confidencePercent: number | null;
  reasoning: string;
};

export type EventAiWeatherEvidenceRead = {
  observationTrend: string;
  forecastRead: string;
  atmosphericRead: string;
  marketPricingRead: string;
  timingRead: string;
};

export type EventAiDecisionPlan = {
  immediateAction: string;
  nextObservationTrigger: string;
  invalidationSignal: string;
  upsideScenario: string;
  downsideScenario: string;
};

export type EventAiReviewResult = {
  action: EventAiReviewAction;
  recommendedBasketTicker: string | null;
  recommendedBasketLabel: string | null;
  confidence: "low" | "medium" | "high";
  trueConfidencePercent: number | null;
  summary: string;
  independentForecast: EventAiIndependentForecast;
  weatherEvidenceRead: EventAiWeatherEvidenceRead;
  decisionPlan: EventAiDecisionPlan;
  candidateAssessment: EventAiCandidateAssessment;
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
  modelConsensus: AiModelConsensusRow[];
  bucketProbabilities: AiBucketProbability[];
  fairValue: AiFairValueRead;
  observationTriggers: AiObservationTrigger[];
  settlementClock: AiSettlementClockRead;
  forecastChangeRead: string;
};
__KALSHI_FILE__

mkdir -p "$(dirname "types/positionReview.ts")"
cat > 'types/positionReview.ts' <<'__KALSHI_FILE__'

export type AiModelConsensusRow = {
  source: string;
  forecastHighF: number | null;
  bucket: string | null;
  weight: "very_high" | "high" | "medium_high" | "medium" | "low" | "context";
  notes: string;
};

export type AiBucketProbability = {
  bucket: string;
  probabilityPercent: number;
  fairValueEstimate: number | null;
  reasoning: string;
};

export type AiFairValueRead = {
  modelImpliedProbabilityPercent: number | null;
  fairYesPrice: number | null;
  currentYesAsk: number | null;
  currentYesBid: number | null;
  edgeCents: number | null;
  maxEntryPrice: number | null;
  priceDiscipline: string;
};

export type AiObservationTrigger = {
  trigger: string;
  action: string;
  urgency: "low" | "medium" | "high";
};

export type AiSettlementClockRead = {
  localTimeNow: string | null;
  remainingHeatingWindow: string;
  peakHeatingPassed: boolean | null;
  settlementTimingRead: string;
};

export type PositionReviewAction =
  | "HOLD"
  | "WATCH_CLOSELY"
  | "HOLD_OR_TRIM_PROFIT"
  | "SELL_TO_LOCK_PROFIT"
  | "SELL_FULL_POSITION"
  | "CUT_LOSS"
  | "ROLL_TO_BETTER_BUCKET"
  | "NO_ACTION";

export type PositionManualActionPlan = {
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

export type PositionReviewResult = {
  action: PositionReviewAction;
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
  manualActionPlan: PositionManualActionPlan;
  aiReviewRequested: boolean;
  aiReviewNote: string | null;
};

export type PositionAiIndependentForecast = {
  predictedHighF: number | null;
  mostLikelyBucket: string | null;
  secondMostLikelyBucket: string | null;
  probabilityEstimate: string;
  confidencePercent: number | null;
  reasoning: string;
};

export type PositionAiWeatherEvidenceRead = {
  observationTrend: string;
  forecastRead: string;
  atmosphericRead: string;
  marketPricingRead: string;
  timingRead: string;
};

export type PositionAiDecisionPlan = {
  immediateAction: string;
  nextObservationTrigger: string;
  invalidationSignal: string;
  upsideScenario: string;
  downsideScenario: string;
};

export type PositionAiReviewResult = {
  action: PositionReviewAction;
  confidence: "low" | "medium" | "high";
  agreementWithDeterministicReview: "agree" | "partially_agree" | "disagree";
  summary: string;
  independentForecast: PositionAiIndependentForecast;
  weatherEvidenceRead: PositionAiWeatherEvidenceRead;
  decisionPlan: PositionAiDecisionPlan;
  keyReasons: string[];
  keyRisks: string[];
  sellNowCase: string;
  holdCase: string;
  rollCase: string | null;
  whatWouldChangeMyMind: string[];
  recommendedMonitoring: string[];
  modelConsensus: AiModelConsensusRow[];
  bucketProbabilities: AiBucketProbability[];
  fairValue: AiFairValueRead;
  observationTriggers: AiObservationTrigger[];
  settlementClock: AiSettlementClockRead;
  forecastChangeRead: string;
};
__KALSHI_FILE__

mkdir -p "$(dirname "lib/openai/eventAiReview.ts")"
cat > 'lib/openai/eventAiReview.ts' <<'__KALSHI_FILE__'
import type { EventAiReviewResult } from "@/types/eventScanner";

type AppCandidateBasket = {
  ticker: string | null;
  label: string | null;
  yesBid: number | null;
  yesAskEstimate: number | null;
  noBid: number | null;
  impliedProbability: number | null;
  volume: number | null;
  openInterest: number | null;
  status: string | null;
} | null;

type RunEventAiReviewInput = {
  apiKey: string;
  model?: string;
  payload: {
    eventTicker: string;
    seriesTicker: string;
    eventContext: Record<string, unknown>;
    appCandidateBasket: AppCandidateBasket;
    kalshiEvent: Record<string, unknown> | null;
    kalshiMarkets: Record<string, unknown>[];
    nws: Record<string, unknown>;
    openMeteo: Record<string, unknown>;
    weatherEvidence?: Record<string, unknown> | null;
  };
};

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("AI response did not contain valid JSON.");
  }
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getNestedObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}


function readWeight(value: unknown) {
  return value === "very_high" ||
    value === "high" ||
    value === "medium_high" ||
    value === "medium" ||
    value === "low" ||
    value === "context"
    ? value
    : "context";
}

function readUrgency(value: unknown) {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function validateModelConsensus(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row = getNestedObject(item);
      if (!row) {
        return null;
      }

      return {
        source: readString(row.source, "Unknown source"),
        forecastHighF: toNumberOrNull(row.forecastHighF),
        bucket: typeof row.bucket === "string" ? row.bucket : null,
        weight: readWeight(row.weight),
        notes: readString(row.notes, "No source notes provided."),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateBucketProbabilities(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row = getNestedObject(item);
      if (!row) {
        return null;
      }

      const probabilityPercent = toNumberOrNull(row.probabilityPercent);

      return {
        bucket: readString(row.bucket, "Unknown bucket"),
        probabilityPercent:
          probabilityPercent === null ? 0 : Math.max(0, Math.min(100, probabilityPercent)),
        fairValueEstimate: toNumberOrNull(row.fairValueEstimate),
        reasoning: readString(row.reasoning, "No bucket probability reasoning provided."),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateFairValue(value: unknown) {
  const read = getNestedObject(value);

  return {
    modelImpliedProbabilityPercent: toNumberOrNull(read?.modelImpliedProbabilityPercent),
    fairYesPrice: toNumberOrNull(read?.fairYesPrice),
    currentYesAsk: toNumberOrNull(read?.currentYesAsk),
    currentYesBid: toNumberOrNull(read?.currentYesBid),
    edgeCents: toNumberOrNull(read?.edgeCents),
    maxEntryPrice: toNumberOrNull(read?.maxEntryPrice),
    priceDiscipline: readString(read?.priceDiscipline, "No price-discipline read was provided."),
  };
}

function validateObservationTriggers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const trigger = getNestedObject(item);
      if (!trigger) {
        return null;
      }

      return {
        trigger: readString(trigger.trigger, "Unspecified trigger"),
        action: readString(trigger.action, "Reassess the market."),
        urgency: readUrgency(trigger.urgency),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateSettlementClock(value: unknown) {
  const read = getNestedObject(value);

  return {
    localTimeNow: typeof read?.localTimeNow === "string" ? read.localTimeNow : null,
    remainingHeatingWindow: readString(
      read?.remainingHeatingWindow,
      "No remaining-heating-window read was provided."
    ),
    peakHeatingPassed:
      typeof read?.peakHeatingPassed === "boolean" ? read.peakHeatingPassed : null,
    settlementTimingRead: readString(
      read?.settlementTimingRead,
      "No settlement timing read was provided."
    ),
  };
}

function validateIndependentForecast(value: unknown) {
  const forecast = getNestedObject(value);

  return {
    predictedHighF: toNumberOrNull(forecast?.predictedHighF),
    mostLikelyBucket: typeof forecast?.mostLikelyBucket === "string" ? forecast.mostLikelyBucket : null,
    secondMostLikelyBucket:
      typeof forecast?.secondMostLikelyBucket === "string"
        ? forecast.secondMostLikelyBucket
        : null,
    probabilityEstimate: readString(
      forecast?.probabilityEstimate,
      "No probability-style estimate was provided."
    ),
    confidencePercent: toNumberOrNull(forecast?.confidencePercent),
    reasoning: readString(
      forecast?.reasoning,
      "No independent forecast reasoning was provided."
    ),
  };
}

function validateWeatherEvidenceRead(value: unknown) {
  const read = getNestedObject(value);

  return {
    observationTrend: readString(
      read?.observationTrend,
      "No observation-trend read was provided."
    ),
    forecastRead: readString(read?.forecastRead, "No forecast read was provided."),
    atmosphericRead: readString(
      read?.atmosphericRead,
      "No atmospheric read was provided."
    ),
    marketPricingRead: readString(
      read?.marketPricingRead,
      "No market-pricing read was provided."
    ),
    timingRead: readString(read?.timingRead, "No timing read was provided."),
  };
}

function validateDecisionPlan(value: unknown) {
  const plan = getNestedObject(value);

  return {
    immediateAction: readString(
      plan?.immediateAction,
      "No immediate action plan was provided."
    ),
    nextObservationTrigger: readString(
      plan?.nextObservationTrigger,
      "No next-observation trigger was provided."
    ),
    invalidationSignal: readString(
      plan?.invalidationSignal,
      "No invalidation signal was provided."
    ),
    upsideScenario: readString(plan?.upsideScenario, "No upside scenario was provided."),
    downsideScenario: readString(
      plan?.downsideScenario,
      "No downside scenario was provided."
    ),
  };
}

function validateCandidateAssessment(
  value: unknown,
  fallbackCandidate: AppCandidateBasket
): EventAiReviewResult["candidateAssessment"] {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<EventAiReviewResult["candidateAssessment"]>)
      : null;

  const assessment =
    candidate?.assessment === "agree" ||
    candidate?.assessment === "partially_agree" ||
    candidate?.assessment === "disagree" ||
    candidate?.assessment === "no_candidate"
      ? candidate.assessment
      : fallbackCandidate
        ? "partially_agree"
        : "no_candidate";

  return {
    appCandidateTicker:
      typeof candidate?.appCandidateTicker === "string"
        ? candidate.appCandidateTicker
        : fallbackCandidate?.ticker ?? null,
    appCandidateLabel:
      typeof candidate?.appCandidateLabel === "string"
        ? candidate.appCandidateLabel
        : fallbackCandidate?.label ?? null,
    assessment,
    assessmentReason:
      typeof candidate?.assessmentReason === "string"
        ? candidate.assessmentReason
        : fallbackCandidate
          ? "AI did not provide a specific candidate assessment reason."
          : "No app candidate basket was provided.",
  };
}

function validateEventAiReview(
  value: unknown,
  fallbackCandidate: AppCandidateBasket
): EventAiReviewResult {
  if (!value || typeof value !== "object") {
    throw new Error("AI review response was not an object.");
  }

  const review = value as Partial<EventAiReviewResult>;

  return {
    action:
      review.action === "ENTER_YES" ||
      review.action === "WATCH_ONLY" ||
      review.action === "AVOID" ||
      review.action === "INSUFFICIENT_DATA"
        ? review.action
        : "INSUFFICIENT_DATA",
    recommendedBasketTicker:
      typeof review.recommendedBasketTicker === "string"
        ? review.recommendedBasketTicker
        : null,
    recommendedBasketLabel:
      typeof review.recommendedBasketLabel === "string"
        ? review.recommendedBasketLabel
        : null,
    confidence:
      review.confidence === "high" ||
      review.confidence === "medium" ||
      review.confidence === "low"
        ? review.confidence
        : "low",
    trueConfidencePercent: toNumberOrNull(review.trueConfidencePercent),
    summary: readString(review.summary, "AI review returned no summary."),
    independentForecast: validateIndependentForecast(review.independentForecast),
    weatherEvidenceRead: validateWeatherEvidenceRead(review.weatherEvidenceRead),
    decisionPlan: validateDecisionPlan(review.decisionPlan),
    candidateAssessment: validateCandidateAssessment(
      review.candidateAssessment,
      fallbackCandidate
    ),
    dataRead: {
      nwsInterpretation:
        typeof review.dataRead?.nwsInterpretation === "string"
          ? review.dataRead.nwsInterpretation
          : "No NWS interpretation provided.",
      openMeteoInterpretation:
        typeof review.dataRead?.openMeteoInterpretation === "string"
          ? review.dataRead.openMeteoInterpretation
          : "No Open-Meteo interpretation provided.",
      kalshiMarketInterpretation:
        typeof review.dataRead?.kalshiMarketInterpretation === "string"
          ? review.dataRead.kalshiMarketInterpretation
          : "No Kalshi market interpretation provided.",
      observationInterpretation:
        typeof review.dataRead?.observationInterpretation === "string"
          ? review.dataRead.observationInterpretation
          : "No observation interpretation provided.",
    },
    entryOpinion: {
      shouldEnter: Boolean(review.entryOpinion?.shouldEnter),
      preferredMaxEntryPrice: toNumberOrNull(
        review.entryOpinion?.preferredMaxEntryPrice
      ),
      fairValueEstimate: toNumberOrNull(review.entryOpinion?.fairValueEstimate),
      reasoning:
        typeof review.entryOpinion?.reasoning === "string"
          ? review.entryOpinion.reasoning
          : "No entry reasoning provided.",
    },
    risks: toStringArray(review.risks),
    whatWouldChangeMyMind: toStringArray(review.whatWouldChangeMyMind),
    recommendedMonitoring: toStringArray(review.recommendedMonitoring),
    modelConsensus: validateModelConsensus(review.modelConsensus),
    bucketProbabilities: validateBucketProbabilities(review.bucketProbabilities),
    fairValue: validateFairValue(review.fairValue),
    observationTriggers: validateObservationTriggers(review.observationTriggers),
    settlementClock: validateSettlementClock(review.settlementClock),
    forecastChangeRead: readString(
      review.forecastChangeRead,
      "No forecast-change read was provided."
    ),
  };
}

export async function runEventAiReview({
  apiKey,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  payload,
}: RunEventAiReviewInput): Promise<EventAiReviewResult> {
  const systemPrompt = `
You are an independent advisory-only Kalshi weather event analyst.

You do not place trades.
You do not know or use the app's deterministic scanner score.
You must not assume there is an opportunity.
You independently interpret Kalshi market pricing, NWS data, Open-Meteo data, observations, and the normalized weather evidence packet when available.

When a weatherEvidence packet is provided, use it as the primary structured source for observation trend, observed high so far, remaining heating window, NWS/Open-Meteo forecast highs, NWS raw gridpoint evidence, Open-Meteo model evidence, ensemble spread, atmospheric conditions, bucket analysis, and source agreement. Use the raw NWS/Open-Meteo payloads as supporting detail.

For same-day daily-high events, explicitly evaluate: current winning bucket, observed high so far, latest reading, recent trend, remaining heating window, overshoot risk, cloud cover, wind, humidity, NWS grid maxTemperature, Open-Meteo HRRR/NBM/GFS/ECMWF model agreement, ensemble spread, and storm/outflow risk.

For tomorrow or future daily-high events, observations may be unavailable or irrelevant. Do not mark a future event insufficient only because there are no same-day observations. Use NWS daily/hourly/gridpoint forecast highs, Open-Meteo best-match/HRRR/NBM/GFS/ECMWF highs, and ensemble mean/spread as the primary evidence. Compare them to the available Kalshi range baskets and identify the forecast-supported basket if one exists.

For hourly temperature events, use NWS hourly forecast and Open-Meteo hourly forecast for the target local hour as the primary evidence.

The app may provide one app-selected candidate basket. Treat it only as a candidate to evaluate, not as a conclusion. You may agree, partially agree, disagree, recommend a different basket, recommend watching only, or recommend avoiding the event.

Daily high bucket rule: Kalshi buckets with midpoint tickers are true one-degree ranges. B74.5 means 74° to 75°, B80.5 means 80° to 81°, and B93.5 means 93° to 94°. Do not treat these as above-threshold markets. When translating a forecast temperature into a daily high bucket, floor the temperature to the lower whole degree and add one degree for the upper bound.

Your job is to explain what the data means, make an independent final-temperature/bucket forecast, and give an opinion on which basket, if any, is worth entering or worth watching.
Your confidence must reflect the reliability of the data and how strong the conclusion is at this moment.
Return only valid JSON matching the requested schema.
`;

  const userPayload = {
    task: "Independently review this Kalshi weather event and decide whether any YES basket is worth entering. Also assess the app-selected candidate basket if one is provided.",
    importantRules: [
      "Do not use any deterministic scanner score, signal, reasons, or risks.",
      "The appCandidateBasket is only a candidate. Do not assume it is correct.",
      "Use the weatherEvidence packet when available. It contains normalized observations, NWS daily/hourly/gridpoint highs, Open-Meteo model evidence, ensemble spread, trend, atmosphere, timing, bucket analysis, and model agreement.",
      "Daily high bucket mapping is floor-to-next-degree: 74.5 = 74° to 75°, 80.5 = 80° to 81°, 93.5 = 93° to 94°. Do not describe midpoint-coded daily buckets as above-threshold markets.",
      "For same-day events, discuss observed high so far, whether the candidate bucket is already hit, overshoot risk, recent trend, and remaining heating window.",
      "For tomorrow/future daily-high events, use NWS and Open-Meteo forecast highs as primary evidence even when observations are missing.",
      "For future events, identify the forecast-supported basket and compare it to market pricing.",
      "Explicitly assess whether you agree, partially agree, or disagree with the app candidate.",
      "If you disagree with the app candidate, explain why and identify a better basket if one exists.",
      "Do not say to enter unless the forecast agreement, price, and risk/reward are strong enough.",
      "A low-confidence or watch-only answer is acceptable.",
      "Give a true confidence percentage based on data reliability, agreement between sources, timing, and market pricing.",
      "Build a compact model-consensus table that weights official station observations highest for same-day markets, HRRR/NBM/NWS hourly strongly for near-term markets, and NWS grid/ECMWF/ensemble spread strongly for tomorrow/future markets.",
      "Return a bucket probability distribution across the most realistic buckets, a fair-value estimate, and price discipline. A good forecast is not a good trade if the ask is above fair value.",
      "Include advisory observation triggers and settlement-clock logic: remaining heating window, peak-heating status, and what exact print/model/price condition changes the action.",
      "If recommending entry, specify the exact basket ticker and label if identifiable.",
      "Mention a preferred maximum entry price and fair value estimate when possible.",
      "Give concrete next-observation or forecast-update triggers that would change the decision.",
    ],
    outputSchema: {
      action: "ENTER_YES | WATCH_ONLY | AVOID | INSUFFICIENT_DATA",
      recommendedBasketTicker: "string or null",
      recommendedBasketLabel: "string or null",
      confidence: "low | medium | high",
      trueConfidencePercent: "number from 0 to 100 or null",
      summary: "plain-English independent opinion with your independent most-likely bucket/temperature read",
      independentForecast: {
        predictedHighF: "number or null",
        mostLikelyBucket: "string or null, such as 89° to 90°",
        secondMostLikelyBucket: "string or null",
        probabilityEstimate: "plain-English probability estimate with any meaningful threshold odds, such as 55-60% chance of 91+",
        confidencePercent: "number from 0 to 100 or null",
        reasoning: "explain the independent final-temperature/bucket forecast",
      },
      weatherEvidenceRead: {
        observationTrend: "latest temp, observed high so far, recent trend, and whether any candidate bucket is already hit",
        forecastRead: "NWS/Open-Meteo forecast highs and model agreement/disagreement",
        atmosphericRead: "clouds, wind, humidity, radiation, storm/outflow risk and how they affect heating",
        marketPricingRead: "market pricing, app candidate price, favorite basket, and whether price has already corrected",
        timingRead: "remaining heating window, next obs timing, and settlement timing",
      },
      decisionPlan: {
        immediateAction: "what to do now: enter, watch, avoid, wait, hedge, or no action",
        nextObservationTrigger: "specific next observation/forecast update that would change the action",
        invalidationSignal: "specific evidence that proves this read wrong",
        upsideScenario: "best-case scenario for the candidate/recommended basket",
        downsideScenario: "main way this candidate/recommended basket loses",
      },
      candidateAssessment: {
        appCandidateTicker: "string or null",
        appCandidateLabel: "string or null",
        assessment: "agree | partially_agree | disagree | no_candidate",
        assessmentReason:
          "explain whether the app candidate is a good entry candidate based on raw data",
      },
      dataRead: {
        nwsInterpretation: "what NWS data means",
        openMeteoInterpretation: "what Open-Meteo data means",
        kalshiMarketInterpretation: "what market pricing means",
        observationInterpretation:
          "what observations and trend mean; for same-day events include observed high so far, latest reading, and overshoot/undershoot risk; for future events state that observations are not yet useful and forecast data is primary",
      },
      entryOpinion: {
        shouldEnter: "boolean",
        preferredMaxEntryPrice: "0.00 to 1.00 or null",
        fairValueEstimate: "0.00 to 1.00 or null",
        reasoning: "entry reasoning",
      },
      risks: ["risk 1", "risk 2"],
      whatWouldChangeMyMind: ["specific condition"],
      recommendedMonitoring: ["specific data to monitor"],
      modelConsensus: [
        {
          source: "NWS daily | NWS hourly | NWS grid | Station observations | Open-Meteo Best Match | HRRR | NBM | GFS | ECMWF | Ensemble",
          forecastHighF: "number or null",
          bucket: "daily high bucket as true range, such as 93° to 94°, or null",
          weight: "very_high | high | medium_high | medium | low | context",
          notes: "what this source contributes and any caveat",
        },
      ],
      bucketProbabilities: [
        {
          bucket: "bucket label, such as 91° to 92°",
          probabilityPercent: "estimated probability from 0 to 100",
          fairValueEstimate: "fair YES price as decimal dollars, e.g. 0.42, or null",
          reasoning: "why this bucket has this probability",
        },
      ],
      fairValue: {
        modelImpliedProbabilityPercent: "number from 0 to 100 or null",
        fairYesPrice: "decimal dollars 0 to 1 or null",
        currentYesAsk: "decimal dollars 0 to 1 or null",
        currentYesBid: "decimal dollars 0 to 1 or null",
        edgeCents: "fair value minus current ask in cents, or null",
        maxEntryPrice: "maximum reasonable YES entry in decimal dollars or null",
        priceDiscipline: "explain whether the forecast is good but price is bad, or forecast and price both support entry/watch/avoid",
      },
      observationTriggers: [
        {
          trigger: "specific observation/model/price condition",
          action: "what manual action to consider",
          urgency: "low | medium | high",
        },
      ],
      settlementClock: {
        localTimeNow: "string or null",
        remainingHeatingWindow: "plain-English heating-window read",
        peakHeatingPassed: "boolean or null",
        settlementTimingRead: "how timing affects entry/watch/avoid decision",
      },
      forecastChangeRead: "explain whether forecasts/models appear to be warming, cooling, stable, converging, diverging, or unavailable based on the packet",

    },
    data: payload,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(userPayload),
        },
      ],
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const message =
      body?.error?.message ??
      `OpenAI request failed with status ${response.status}.`;

    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include text content.");
  }

  return validateEventAiReview(
    extractJsonObject(content),
    payload.appCandidateBasket
  );
}
__KALSHI_FILE__

mkdir -p "$(dirname "lib/openai/positionAiReview.ts")"
cat > 'lib/openai/positionAiReview.ts' <<'__KALSHI_FILE__'
import type {
  PositionAiReviewResult,
  PositionReviewResult,
} from "@/types/positionReview";

type RunPositionAiReviewInput = {
  apiKey: string;
  model?: string;
  position: Record<string, unknown>;
  weather: Record<string, unknown> | null;
  weatherEvidence?: Record<string, unknown> | null;
  basketMarkets: Record<string, unknown>[];
  deterministicReview: PositionReviewResult;
};

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("AI response did not contain valid JSON.");
  }
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getNestedObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}


function readWeight(value: unknown) {
  return value === "very_high" ||
    value === "high" ||
    value === "medium_high" ||
    value === "medium" ||
    value === "low" ||
    value === "context"
    ? value
    : "context";
}

function readUrgency(value: unknown) {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function validateModelConsensus(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row = getNestedObject(item);
      if (!row) {
        return null;
      }

      return {
        source: readString(row.source, "Unknown source"),
        forecastHighF: toNumberOrNull(row.forecastHighF),
        bucket: typeof row.bucket === "string" ? row.bucket : null,
        weight: readWeight(row.weight),
        notes: readString(row.notes, "No source notes provided."),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateBucketProbabilities(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row = getNestedObject(item);
      if (!row) {
        return null;
      }

      const probabilityPercent = toNumberOrNull(row.probabilityPercent);

      return {
        bucket: readString(row.bucket, "Unknown bucket"),
        probabilityPercent:
          probabilityPercent === null ? 0 : Math.max(0, Math.min(100, probabilityPercent)),
        fairValueEstimate: toNumberOrNull(row.fairValueEstimate),
        reasoning: readString(row.reasoning, "No bucket probability reasoning provided."),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateFairValue(value: unknown) {
  const read = getNestedObject(value);

  return {
    modelImpliedProbabilityPercent: toNumberOrNull(read?.modelImpliedProbabilityPercent),
    fairYesPrice: toNumberOrNull(read?.fairYesPrice),
    currentYesAsk: toNumberOrNull(read?.currentYesAsk),
    currentYesBid: toNumberOrNull(read?.currentYesBid),
    edgeCents: toNumberOrNull(read?.edgeCents),
    maxEntryPrice: toNumberOrNull(read?.maxEntryPrice),
    priceDiscipline: readString(read?.priceDiscipline, "No price-discipline read was provided."),
  };
}

function validateObservationTriggers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const trigger = getNestedObject(item);
      if (!trigger) {
        return null;
      }

      return {
        trigger: readString(trigger.trigger, "Unspecified trigger"),
        action: readString(trigger.action, "Reassess the market."),
        urgency: readUrgency(trigger.urgency),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateSettlementClock(value: unknown) {
  const read = getNestedObject(value);

  return {
    localTimeNow: typeof read?.localTimeNow === "string" ? read.localTimeNow : null,
    remainingHeatingWindow: readString(
      read?.remainingHeatingWindow,
      "No remaining-heating-window read was provided."
    ),
    peakHeatingPassed:
      typeof read?.peakHeatingPassed === "boolean" ? read.peakHeatingPassed : null,
    settlementTimingRead: readString(
      read?.settlementTimingRead,
      "No settlement timing read was provided."
    ),
  };
}

function validateIndependentForecast(value: unknown) {
  const forecast = getNestedObject(value);

  return {
    predictedHighF: toNumberOrNull(forecast?.predictedHighF),
    mostLikelyBucket: typeof forecast?.mostLikelyBucket === "string" ? forecast.mostLikelyBucket : null,
    secondMostLikelyBucket:
      typeof forecast?.secondMostLikelyBucket === "string"
        ? forecast.secondMostLikelyBucket
        : null,
    probabilityEstimate: readString(
      forecast?.probabilityEstimate,
      "No probability-style estimate was provided."
    ),
    confidencePercent: toNumberOrNull(forecast?.confidencePercent),
    reasoning: readString(
      forecast?.reasoning,
      "No independent forecast reasoning was provided."
    ),
  };
}

function validateWeatherEvidenceRead(value: unknown) {
  const read = getNestedObject(value);

  return {
    observationTrend: readString(
      read?.observationTrend,
      "No observation-trend read was provided."
    ),
    forecastRead: readString(read?.forecastRead, "No forecast read was provided."),
    atmosphericRead: readString(
      read?.atmosphericRead,
      "No atmospheric read was provided."
    ),
    marketPricingRead: readString(
      read?.marketPricingRead,
      "No market-pricing read was provided."
    ),
    timingRead: readString(read?.timingRead, "No timing read was provided."),
  };
}

function validateDecisionPlan(value: unknown) {
  const plan = getNestedObject(value);

  return {
    immediateAction: readString(
      plan?.immediateAction,
      "No immediate action plan was provided."
    ),
    nextObservationTrigger: readString(
      plan?.nextObservationTrigger,
      "No next-observation trigger was provided."
    ),
    invalidationSignal: readString(
      plan?.invalidationSignal,
      "No invalidation signal was provided."
    ),
    upsideScenario: readString(plan?.upsideScenario, "No upside scenario was provided."),
    downsideScenario: readString(
      plan?.downsideScenario,
      "No downside scenario was provided."
    ),
  };
}

function validateAiReview(value: unknown): PositionAiReviewResult {
  if (!value || typeof value !== "object") {
    throw new Error("AI review response was not an object.");
  }

  const review = value as Partial<PositionAiReviewResult>;

  return {
    action: review.action ?? "WATCH_CLOSELY",
    confidence: review.confidence ?? "low",
    agreementWithDeterministicReview:
      review.agreementWithDeterministicReview ?? "partially_agree",
    summary: readString(review.summary, "AI review returned no summary."),
    independentForecast: validateIndependentForecast(review.independentForecast),
    weatherEvidenceRead: validateWeatherEvidenceRead(review.weatherEvidenceRead),
    decisionPlan: validateDecisionPlan(review.decisionPlan),
    keyReasons: toStringArray(review.keyReasons),
    keyRisks: toStringArray(review.keyRisks),
    sellNowCase: readString(review.sellNowCase, "No sell-now case provided."),
    holdCase: readString(review.holdCase, "No hold case provided."),
    rollCase: typeof review.rollCase === "string" ? review.rollCase : null,
    whatWouldChangeMyMind: toStringArray(review.whatWouldChangeMyMind),
    recommendedMonitoring: toStringArray(review.recommendedMonitoring),
    modelConsensus: validateModelConsensus(review.modelConsensus),
    bucketProbabilities: validateBucketProbabilities(review.bucketProbabilities),
    fairValue: validateFairValue(review.fairValue),
    observationTriggers: validateObservationTriggers(review.observationTriggers),
    settlementClock: validateSettlementClock(review.settlementClock),
    forecastChangeRead: readString(
      review.forecastChangeRead,
      "No forecast-change read was provided."
    ),
  };
}

export async function runPositionAiReview({
  apiKey,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  position,
  weather,
  basketMarkets,
  deterministicReview,
  weatherEvidence = null,
}: RunPositionAiReviewInput): Promise<PositionAiReviewResult> {
  const systemPrompt = `
You are an advisory-only Kalshi weather position review assistant.

You do not place trades.
You do not tell the user a trade is guaranteed.
You review deterministic math, market pricing, weather data, bucket alignment, recent observations, forecast highs, NWS raw gridpoint evidence, Open-Meteo model evidence, ensemble spread, and atmospheric context.
Daily high bucket rule: Kalshi buckets with midpoint tickers are true one-degree ranges. B74.5 means 74° to 75°, B80.5 means 80° to 81°, and B93.5 means 93° to 94°. Do not treat these as above-threshold markets. When translating a forecast temperature into a daily high bucket, floor the temperature to the lower whole degree and add one degree for the upper bound.

Your goal is to produce the kind of practical trade-management read a sharp weather-market trader would want: current winning bucket, overshoot risk, roll/hedge options, what the next observation would change, and what price/risk tradeoff matters.
You return only valid JSON matching the requested schema.
`;

  const userPrompt = {
    task: "Review this open Kalshi weather position and provide an advisory recommendation using the full weather evidence packet when available.",
    analysisInstructions: [
      "Make an independent final-temperature/bucket read before deciding on the action.",
      "For same-day positions, weigh observed high so far, latest observation, recent trend, remaining heating window, clouds, wind, humidity, storm/outflow risk, NWS grid maxTemperature, Open-Meteo HRRR/NBM/GFS/ECMWF model agreement, ensemble spread, and forecast highs.",
      "Daily high bucket mapping is floor-to-next-degree: 74.5 = 74° to 75°, 80.5 = 80° to 81°, 93.5 = 93° to 94°. Do not describe midpoint-coded daily buckets as above-threshold markets.",
      "If the held bucket is currently winning, focus on overshoot risk and whether selling, holding, trimming, or hedging/rolling is better.",
      "If a neighboring bucket is becoming more likely, explain whether to roll fully or hedge partially and what observation would confirm it.",
      "For future positions, use NWS daily/hourly/gridpoint forecast, Open-Meteo best-match/HRRR/NBM/GFS/ECMWF forecast, ensemble mean/spread, model agreement, forecast spread, and market pricing as primary evidence.",
      "Build a compact model-consensus table that weights official station observations highest for same-day markets, HRRR/NBM/NWS hourly strongly for near-term markets, and NWS grid/ECMWF/ensemble spread strongly for tomorrow/future markets.",
      "Return a bucket probability distribution across the most realistic buckets, a fair-value estimate, and price discipline. A good forecast is not a good trade if the ask is above fair value.",
      "Include advisory observation triggers and settlement-clock logic: remaining heating window, peak-heating status, and what exact print/model/price condition changes the action.",
      "Do not simply repeat the deterministic review. You may agree or disagree with it based on the evidence packet.",
      "Use concrete observation triggers whenever possible, such as: if the next print is 91°F, roll; if two more prints stay 89°F, hold/sell the hedge.",
    ],
    outputSchema: {
      action:
        "HOLD | WATCH_CLOSELY | HOLD_OR_TRIM_PROFIT | SELL_TO_LOCK_PROFIT | SELL_FULL_POSITION | CUT_LOSS | ROLL_TO_BETTER_BUCKET | NO_ACTION",
      confidence: "low | medium | high",
      agreementWithDeterministicReview: "agree | partially_agree | disagree",
      summary: "short plain-English recommendation with independent weather/bucket read",
      independentForecast: {
        predictedHighF: "number or null",
        mostLikelyBucket: "string or null, such as 89° to 90°",
        secondMostLikelyBucket: "string or null",
        probabilityEstimate: "plain-English probability estimate, such as 55-60% chance of 91+ but 89-90 still live",
        confidencePercent: "number from 0 to 100 or null",
        reasoning: "explain the independent final-temperature/bucket forecast",
      },
      weatherEvidenceRead: {
        observationTrend: "latest temp, observed high so far, recent trend, and whether the held bucket is currently winning",
        forecastRead: "NWS/Open-Meteo forecast highs and model agreement/disagreement",
        atmosphericRead: "clouds, wind, humidity, radiation, storm/outflow risk and how they affect heating",
        marketPricingRead: "market pricing, bid/ask, exit value, roll/hedge pricing, and whether price has already corrected",
        timingRead: "remaining heating window, next obs timing, and settlement timing",
      },
      decisionPlan: {
        immediateAction: "what to do now: hold, trim, sell, hedge, roll, or wait",
        nextObservationTrigger: "specific next observation/temperature print that would change the action",
        invalidationSignal: "specific evidence that proves this read wrong",
        upsideScenario: "best-case scenario for the current position/candidate",
        downsideScenario: "main way this position/candidate loses",
      },
      keyReasons: ["reason 1", "reason 2"],
      keyRisks: ["risk 1", "risk 2"],
      sellNowCase: "plain-English case for selling now, including why the current bid is or is not worth taking",
      holdCase: "plain-English case for holding, including current winning bucket and overshoot risk when relevant",
      rollCase: "plain-English roll or hedge discussion, including target/hedge bucket and trigger; null if not relevant",
      whatWouldChangeMyMind: ["specific condition that would change recommendation"],
      recommendedMonitoring: ["specific data to monitor next"],
      modelConsensus: [
        {
          source: "NWS daily | NWS hourly | NWS grid | Station observations | Open-Meteo Best Match | HRRR | NBM | GFS | ECMWF | Ensemble",
          forecastHighF: "number or null",
          bucket: "daily high bucket as true range, such as 93° to 94°, or null",
          weight: "very_high | high | medium_high | medium | low | context",
          notes: "what this source contributes and any caveat",
        },
      ],
      bucketProbabilities: [
        {
          bucket: "bucket label, such as 91° to 92°",
          probabilityPercent: "estimated probability from 0 to 100",
          fairValueEstimate: "fair YES price as decimal dollars, e.g. 0.42, or null",
          reasoning: "why this bucket has this probability",
        },
      ],
      fairValue: {
        modelImpliedProbabilityPercent: "number from 0 to 100 or null",
        fairYesPrice: "decimal dollars 0 to 1 or null",
        currentYesAsk: "decimal dollars 0 to 1 or null",
        currentYesBid: "decimal dollars 0 to 1 or null",
        edgeCents: "fair value minus current ask in cents, or null",
        maxEntryPrice: "maximum reasonable YES entry in decimal dollars or null",
        priceDiscipline: "explain whether the forecast is good but price is bad, or forecast and price both support entry/hold",
      },
      observationTriggers: [
        {
          trigger: "specific observation/model/price condition",
          action: "what manual action to consider",
          urgency: "low | medium | high",
        },
      ],
      settlementClock: {
        localTimeNow: "string or null",
        remainingHeatingWindow: "plain-English heating-window read",
        peakHeatingPassed: "boolean or null",
        settlementTimingRead: "how timing affects hold/sell/enter decision",
      },
      forecastChangeRead: "explain whether forecasts/models appear to be warming, cooling, stable, converging, diverging, or unavailable based on the packet",

    },
    deterministicReview,
    position,
    weather,
    weatherEvidence,
    basketMarkets,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(userPrompt),
        },
      ],
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const message =
      body?.error?.message ??
      `OpenAI request failed with status ${response.status}.`;

    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include text content.");
  }

  return validateAiReview(extractJsonObject(content));
}
__KALSHI_FILE__

mkdir -p "$(dirname "components/events/EventScannerClient.tsx")"
cat > 'components/events/EventScannerClient.tsx' <<'__KALSHI_FILE__'
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



function ModelConsensusPanel({
  rows,
}: {
  rows?: NonNullable<EventAiReview["modelConsensus"]>;
}) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
      <h4 className="font-semibold text-white">Model consensus</h4>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
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
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
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
__KALSHI_FILE__

mkdir -p "$(dirname "components/positions/PositionDetailClient.tsx")"
cat > 'components/positions/PositionDetailClient.tsx' <<'__KALSHI_FILE__'
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
  keyReasons: string[];
  keyRisks: string[];
  sellNowCase: string;
  holdCase: string;
  rollCase: string | null;
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


function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#6f7b74]">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
    </div>
  );
}


function ModelConsensusPanel({
  rows,
}: {
  rows?: NonNullable<PositionAiReview["modelConsensus"]>;
}) {
  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
      <h4 className="font-semibold text-white">Model consensus</h4>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
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
  probabilities?: NonNullable<PositionAiReview["bucketProbabilities"]>;
}) {
  if (!probabilities || probabilities.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
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

function DecisionSupportPanel({ aiReview }: { aiReview: PositionAiReview }) {
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
__KALSHI_FILE__

mkdir -p "$(dirname "lib/weather/weatherEvidence.ts")"
cat > 'lib/weather/weatherEvidence.ts' <<'__KALSHI_FILE__'
import type { OpenMeteoEvidenceForecasts } from "@/lib/weather/openMeteoClient";

export type WeatherEvidenceTrend =
  | "rising"
  | "flat"
  | "falling"
  | "mixed"
  | "insufficient";

export type WeatherEvidencePacket = {
  station: {
    id: string;
    name: string | null;
    timezone: string;
    latitude: number;
    longitude: number;
  };
  event: {
    family: "daily_high" | "hourly_temperature";
    date: string;
    localNow: string | null;
    isToday: boolean;
    isTomorrow: boolean;
    isFuture: boolean;
    eventHourLocal: number | null;
    remainingHeatingHours: number | null;
    settlementAnchor: "official_station_observation";
  };
  observations: {
    latestTempF: number | null;
    latestObservationTimeLocal: string | null;
    observedHighF: number | null;
    observedHighTimeLocal: string | null;
    currentTempVsObservedHighF: number | null;
    observationCountForEventDate: number;
    recentReadings: Array<{
      timeLocal: string;
      tempF: number | null;
      dewPointF: number | null;
      humidityPercent: number | null;
      windDirectionDegrees: number | null;
      windSpeedMph: number | null;
      windGustMph: number | null;
      cloudText: string | null;
      pressureMb: number | null;
    }>;
    trend: WeatherEvidenceTrend;
    trendLastHourF: number | null;
  };
  forecasts: {
    nwsDailyHighF: number | null;
    nwsHourlyHighF: number | null;
    nwsHourlyHighTimeLocal: string | null;
    nwsGridMaxTemperatureF: number | null;
    nwsGridMaxTemperatureTimeLocal: string | null;
    openMeteoDailyHighF: number | null;
    openMeteoHourlyHighF: number | null;
    openMeteoHourlyHighTimeLocal: string | null;
    forecastHighAverageF: number | null;
    forecastHighMedianF: number | null;
    forecastSpreadF: number | null;
    modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
    likelyTemperatureF: number | null;
    likelyBucket: string | null;
    alternateBuckets: string[];
    alternateTemperatureRangeF: {
      low: number | null;
      high: number | null;
    };
  };
  openMeteoModels: {
    bestMatch: ModelEvidence | null;
    hrrr: ModelEvidence | null;
    nbm: ModelEvidence | null;
    gfs: ModelEvidence | null;
    ecmwf: ModelEvidence | null;
    ensemble: EnsembleEvidence | null;
    sourceErrors: string[];
  };
  nwsGrid: {
    updateTime: string | null;
    validTimes: string | null;
    rawMaxTemperatureF: number | null;
    rawMaxTemperatureTimeLocal: string | null;
    peakWindow: PeakWindowPoint[];
    hazards: string[];
    weatherSummary: string | null;
  };
  atmosphere: {
    cloudCoverPercentNearHigh: number | null;
    lowCloudCoverPercentNearHigh: number | null;
    midCloudCoverPercentNearHigh: number | null;
    highCloudCoverPercentNearHigh: number | null;
    windSpeedMphNearHigh: number | null;
    windGustMphNearHigh: number | null;
    windDirectionDegreesNearHigh: number | null;
    dewPointFNearHigh: number | null;
    humidityPercentNearHigh: number | null;
    shortwaveRadiationNearHigh: number | null;
    sunshineDurationSecondsNearHigh: number | null;
    precipitationProbabilityNearHigh: number | null;
    thunderstormProbabilityNearHigh: number | null;
    capeNearHigh: number | null;
    liftedIndexNearHigh: number | null;
    convectiveInhibitionNearHigh: number | null;
    boundaryLayerHeightMetersNearHigh: number | null;
    thunderstormRiskText: string | null;
    latestCloudText: string | null;
    latestWindSpeedMph: number | null;
    latestWindGustMph: number | null;
    latestHumidityPercent: number | null;
  };
  bucketAnalysis: {
    mostLikelyBucket: string | null;
    secondMostLikelyBucket: string | null;
    hotTailBucket: string | null;
    coolTailBucket: string | null;
    bucketConfidencePercent: number | null;
    overshootRisk: "high" | "moderate" | "low" | "insufficient";
    capRisk: "high" | "moderate" | "low" | "insufficient";
  };
  decisionSupport: {
    modelConsensus: Array<{
      source: string;
      forecastHighF: number | null;
      bucket: string | null;
      weight: "very_high" | "high" | "medium_high" | "medium" | "low" | "context";
      notes: string;
    }>;
    bucketProbabilities: Array<{
      bucket: string;
      probabilityPercent: number;
      fairValueEstimate: number | null;
      reasoning: string;
    }>;
    observationTriggers: Array<{
      trigger: string;
      action: string;
      urgency: "low" | "medium" | "high";
    }>;
    settlementClock: {
      localTimeNow: string | null;
      remainingHeatingWindow: string;
      peakHeatingPassed: boolean | null;
      settlementTimingRead: string;
    };
    forecastChangeRead: string;
  };
  reasoning: {
    summary: string;
    supportiveFactors: string[];
    limitingFactors: string[];
    watchTriggers: string[];
    invalidationSignals: string[];
  };
  rawSources: {
    nwsPoint: Record<string, unknown> | null;
    nwsDailyForecast: Record<string, unknown> | null;
    nwsHourlyForecast: Record<string, unknown> | null;
    nwsGridpointData: Record<string, unknown> | null;
    nwsAlerts: Record<string, unknown> | null;
    openMeteo: Record<string, unknown> | null;
    openMeteoEvidence: OpenMeteoEvidenceForecasts | null;
  };
  evidenceNotes: string[];
};

type ModelEvidence = {
  label: string;
  dailyHighF: number | null;
  hourlyHighF: number | null;
  hourlyHighTimeLocal: string | null;
  likelyBucket: string | null;
  peakIndex: number | null;
  peakConditions: Record<string, number | null>;
};

type EnsembleEvidence = ModelEvidence & {
  temperatureSpreadFNearHigh: number | null;
  highRangeApproxF: { low: number | null; high: number | null };
  uncertaintyBucket: string | null;
};

type PeakWindowPoint = {
  timeLocal: string;
  temperatureF: number | null;
  maxTemperatureF: number | null;
  dewPointF: number | null;
  relativeHumidityPercent: number | null;
  skyCoverPercent: number | null;
  windDirectionDegrees: number | null;
  windSpeedMph: number | null;
  windGustMph: number | null;
  probabilityOfPrecipitationPercent: number | null;
  probabilityOfThunderPercent: number | null;
  pressureMb: number | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function celsiusToFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32;
}

function kmhToMph(kmh: number) {
  return kmh * 0.621371;
}

function pascalToMb(pa: number) {
  return pa / 100;
}

function roundOne(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function roundWhole(value: number | null) {
  return value === null ? null : Math.round(value);
}

function getDailyHighBucketLabel(tempF: number | null) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const lower = Math.floor(tempF);
  const upper = lower + 1;

  return `${lower}° to ${upper}°`;
}

function getNeighborBucket(tempF: number | null, offset: number) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const lower = Math.floor(tempF) + offset;
  return `${lower}° to ${lower + 1}°`;
}


function normalizeProbabilityDistribution(raw: Array<{ bucket: string | null; weight: number; reasoning: string }>) {
  const merged = new Map<string, { bucket: string; weight: number; reasoning: string[] }>();

  for (const item of raw) {
    if (!item.bucket || item.weight <= 0) {
      continue;
    }

    const existing = merged.get(item.bucket);
    if (existing) {
      existing.weight += item.weight;
      existing.reasoning.push(item.reasoning);
    } else {
      merged.set(item.bucket, {
        bucket: item.bucket,
        weight: item.weight,
        reasoning: [item.reasoning],
      });
    }
  }

  const total = Array.from(merged.values()).reduce((sum, item) => sum + item.weight, 0);

  if (total <= 0) {
    return [];
  }

  return Array.from(merged.values())
    .map((item) => {
      const probabilityPercent = Math.round((item.weight / total) * 100);
      return {
        bucket: item.bucket,
        probabilityPercent,
        fairValueEstimate: Math.round((probabilityPercent / 100) * 100) / 100,
        reasoning: item.reasoning.join(" "),
      };
    })
    .sort((a, b) => b.probabilityPercent - a.probabilityPercent);
}

function buildSettlementClockRead(params: {
  localNow: string | null;
  remainingHeatingHours: number | null;
  isToday: boolean;
  isFuture: boolean;
}) {
  const { localNow, remainingHeatingHours, isToday, isFuture } = params;

  if (isFuture) {
    return {
      localTimeNow: localNow,
      remainingHeatingWindow: "Future event; same-day heating window has not started.",
      peakHeatingPassed: false,
      settlementTimingRead:
        "Use model agreement, model spread, and forecast trend as primary evidence until same-day observations begin.",
    };
  }

  if (!isToday) {
    return {
      localTimeNow: localNow,
      remainingHeatingWindow: "Event is not marked as today; heating-window read is contextual only.",
      peakHeatingPassed: null,
      settlementTimingRead:
        "Verify the event date and settlement rules before treating current observations as decisive.",
    };
  }

  if (remainingHeatingHours === null) {
    return {
      localTimeNow: localNow,
      remainingHeatingWindow: "Remaining heating window could not be estimated.",
      peakHeatingPassed: null,
      settlementTimingRead:
        "Use latest official station observations and model timing before acting.",
    };
  }

  return {
    localTimeNow: localNow,
    remainingHeatingWindow:
      remainingHeatingHours > 0
        ? `About ${remainingHeatingHours.toFixed(1)} hours of realistic heating remain.`
        : "The main heating window has likely passed or is nearly over.",
    peakHeatingPassed: remainingHeatingHours <= 0,
    settlementTimingRead:
      remainingHeatingHours > 2
        ? "Overshoot and further heating remain live risks."
        : remainingHeatingHours > 0
          ? "Late movement is still possible, but every capped observation increases confidence in the current high."
          : "Observed high and official late-day prints should dominate the read now.",
  };
}

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getLocalDateFromIso(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getLocalDateTimeLabel(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLocalHour(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(date);

  const hour = Number(hourText);
  return Number.isFinite(hour) ? hour : null;
}

function getQuantitativeValueF(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  const raw = toNumber(quantitative?.value);

  return raw === null ? null : celsiusToFahrenheit(raw);
}

function getQuantitativeValueMph(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  const raw = toNumber(quantitative?.value);

  return raw === null ? null : kmhToMph(raw);
}

function getQuantitativeValuePercent(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  return toNumber(quantitative?.value);
}

function getQuantitativeValueDegrees(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  return toNumber(quantitative?.value);
}

function getPressureMb(properties: Record<string, unknown>) {
  const stationPressure = properties.stationPressure as Record<string, unknown> | undefined;
  const seaLevelPressure = properties.seaLevelPressure as Record<string, unknown> | undefined;
  const raw = toNumber(stationPressure?.value ?? seaLevelPressure?.value);

  if (raw === null) {
    return null;
  }

  return raw > 2000 ? pascalToMb(raw) : raw;
}

function normalizeObservations(params: {
  data: Record<string, unknown> | null;
  eventDate: string;
  timezone: string;
}) {
  const { data, eventDate, timezone } = params;
  const features = Array.isArray(data?.features)
    ? (data?.features as Record<string, unknown>[])
    : [];

  const readings = features
    .map((feature) => {
      const properties = feature.properties as Record<string, unknown> | undefined;
      const timestamp = typeof properties?.timestamp === "string" ? properties.timestamp : null;

      if (!properties || !timestamp) {
        return null;
      }

      const localDate = getLocalDateFromIso(timestamp, timezone);
      const timeLocal = getLocalDateTimeLabel(timestamp, timezone);

      if (!timeLocal) {
        return null;
      }

      return {
        timestamp,
        localDate,
        timeLocal,
        tempF: roundOne(getQuantitativeValueF(properties.temperature)),
        dewPointF: roundOne(getQuantitativeValueF(properties.dewpoint)),
        humidityPercent: roundOne(getQuantitativeValuePercent(properties.relativeHumidity)),
        windDirectionDegrees: roundOne(getQuantitativeValueDegrees(properties.windDirection)),
        windSpeedMph: roundOne(getQuantitativeValueMph(properties.windSpeed)),
        windGustMph: roundOne(getQuantitativeValueMph(properties.windGust)),
        cloudText: typeof properties.textDescription === "string" ? properties.textDescription : null,
        pressureMb: roundOne(getPressureMb(properties)),
      };
    })
    .filter((reading): reading is NonNullable<typeof reading> => reading !== null)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const eventDateReadings = readings.filter(
    (reading) => reading.localDate === eventDate && reading.tempF !== null
  );

  const latest = readings.at(-1) ?? null;
  const recent = readings.slice(-24).reverse();

  const observedHighReading = eventDateReadings.reduce<(typeof eventDateReadings)[number] | null>(
    (best, reading) => {
      if (reading.tempF === null) {
        return best;
      }

      if (!best || best.tempF === null || reading.tempF > best.tempF) {
        return reading;
      }

      return best;
    },
    null
  );

  const lastHourReadings = readings.filter((reading) => {
    if (!latest) {
      return false;
    }

    return Date.parse(reading.timestamp) >= Date.parse(latest.timestamp) - 60 * 60 * 1000;
  });

  let trend: WeatherEvidenceTrend = "insufficient";
  let trendLastHourF: number | null = null;

  if (lastHourReadings.length >= 2) {
    const first = lastHourReadings[0]?.tempF ?? null;
    const last = lastHourReadings.at(-1)?.tempF ?? null;

    if (first !== null && last !== null) {
      trendLastHourF = roundOne(last - first);

      if (trendLastHourF !== null && trendLastHourF >= 1) {
        trend = "rising";
      } else if (trendLastHourF !== null && trendLastHourF <= -1) {
        trend = "falling";
      } else {
        trend = "flat";
      }
    }
  }

  return {
    latest,
    observedHighReading,
    recent,
    eventDateReadings,
    trend,
    trendLastHourF,
  };
}

function getNwsPeriods(data: Record<string, unknown> | null) {
  const properties = data?.properties as Record<string, unknown> | undefined;
  return Array.isArray(properties?.periods)
    ? (properties.periods as Record<string, unknown>[])
    : [];
}

function getNwsDailyHighF(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const periods = getNwsPeriods(data);
  const values = periods
    .filter((period) => {
      const startTime = typeof period.startTime === "string" ? period.startTime : null;
      return startTime ? getLocalDateFromIso(startTime, timezone) === eventDate : false;
    })
    .map((period) => toNumber(period.temperature))
    .filter((value): value is number => value !== null);

  return values.length > 0 ? Math.max(...values) : null;
}

function getNwsHourlyHigh(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const periods = getNwsPeriods(data);
  const values = periods
    .map((period) => {
      const startTime = typeof period.startTime === "string" ? period.startTime : null;
      const temp = toNumber(period.temperature);

      if (!startTime || temp === null) {
        return null;
      }

      if (getLocalDateFromIso(startTime, timezone) !== eventDate) {
        return null;
      }

      return {
        temp,
        timeLocal: getLocalDateTimeLabel(startTime, timezone),
      };
    })
    .filter((value): value is { temp: number; timeLocal: string | null } => value !== null);

  if (values.length === 0) {
    return { high: null, timeLocal: null };
  }

  const best = values.reduce((currentBest, value) =>
    value.temp > currentBest.temp ? value : currentBest
  );

  return {
    high: best.temp,
    timeLocal: best.timeLocal,
  };
}

function getOpenMeteoArray(data: Record<string, unknown> | null, key: string) {
  const hourly = data?.hourly as Record<string, unknown> | undefined;
  const value = hourly?.[key];
  return Array.isArray(value) ? value : [];
}

function getOpenMeteoDailyArray(data: Record<string, unknown> | null, key: string) {
  const daily = data?.daily as Record<string, unknown> | undefined;
  const value = daily?.[key];
  return Array.isArray(value) ? value : [];
}

function getOpenMeteoDailyHigh(data: Record<string, unknown> | null, eventDate?: string) {
  const daily = data?.daily as Record<string, unknown> | undefined;
  const times = Array.isArray(daily?.time) ? daily.time : [];
  const values = getOpenMeteoDailyArray(data, "temperature_2m_max");

  if (eventDate) {
    const index = times.findIndex((time) => time === eventDate);
    if (index >= 0) {
      return roundOne(toNumber(values[index]));
    }
  }

  return roundOne(toNumber(values[0]));
}

function getOpenMeteoHourlyHigh(data: Record<string, unknown> | null, eventDate: string) {
  const times = getOpenMeteoArray(data, "time");
  const temps = getOpenMeteoArray(data, "temperature_2m");

  let best: { index: number; temp: number; timeLocal: string } | null = null;

  for (let index = 0; index < times.length; index += 1) {
    const time = typeof times[index] === "string" ? times[index] : null;
    const temp = toNumber(temps[index]);

    if (!time || temp === null || !time.startsWith(eventDate)) {
      continue;
    }

    if (!best || temp > best.temp) {
      best = { index, temp, timeLocal: time.replace("T", " ") };
    }
  }

  return best;
}

function getOpenMeteoValueAtIndex(
  data: Record<string, unknown> | null,
  key: string,
  index: number | null | undefined
) {
  if (index === null || index === undefined) {
    return null;
  }

  const values = getOpenMeteoArray(data, key);
  return roundOne(toNumber(values[index]));
}

function getModelEvidence(
  label: string,
  data: Record<string, unknown> | null,
  eventDate: string
): ModelEvidence | null {
  if (!data) {
    return null;
  }

  const hourlyHigh = getOpenMeteoHourlyHigh(data, eventDate);
  const dailyHigh = getOpenMeteoDailyHigh(data, eventDate);
  const selectedHigh = hourlyHigh?.temp ?? dailyHigh;

  return {
    label,
    dailyHighF: dailyHigh,
    hourlyHighF: hourlyHigh?.temp ?? null,
    hourlyHighTimeLocal: hourlyHigh?.timeLocal ?? null,
    likelyBucket: getDailyHighBucketLabel(selectedHigh),
    peakIndex: hourlyHigh?.index ?? null,
    peakConditions: {
      cloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover", hourlyHigh?.index),
      lowCloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover_low", hourlyHigh?.index),
      midCloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover_mid", hourlyHigh?.index),
      highCloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover_high", hourlyHigh?.index),
      windSpeedMph: getOpenMeteoValueAtIndex(data, "wind_speed_10m", hourlyHigh?.index),
      windGustMph: getOpenMeteoValueAtIndex(data, "wind_gusts_10m", hourlyHigh?.index),
      windDirectionDegrees: getOpenMeteoValueAtIndex(data, "wind_direction_10m", hourlyHigh?.index),
      dewPointF: getOpenMeteoValueAtIndex(data, "dew_point_2m", hourlyHigh?.index),
      humidityPercent: getOpenMeteoValueAtIndex(data, "relative_humidity_2m", hourlyHigh?.index),
      shortwaveRadiation: getOpenMeteoValueAtIndex(data, "shortwave_radiation", hourlyHigh?.index),
      sunshineDurationSeconds: getOpenMeteoValueAtIndex(data, "sunshine_duration", hourlyHigh?.index),
      precipitationProbability: getOpenMeteoValueAtIndex(data, "precipitation_probability", hourlyHigh?.index),
      thunderstormProbability: getOpenMeteoValueAtIndex(data, "thunderstorm_probability", hourlyHigh?.index),
      cape: getOpenMeteoValueAtIndex(data, "cape", hourlyHigh?.index),
      liftedIndex: getOpenMeteoValueAtIndex(data, "lifted_index", hourlyHigh?.index),
      convectiveInhibition: getOpenMeteoValueAtIndex(data, "convective_inhibition", hourlyHigh?.index),
      boundaryLayerHeightMeters: getOpenMeteoValueAtIndex(data, "boundary_layer_height", hourlyHigh?.index),
      surfacePressure: getOpenMeteoValueAtIndex(data, "surface_pressure", hourlyHigh?.index),
    },
  };
}

function getEnsembleEvidence(data: Record<string, unknown> | null, eventDate: string): EnsembleEvidence | null {
  const model = getModelEvidence("Open-Meteo ensemble mean", data, eventDate);

  if (!model) {
    return null;
  }

  const spread = getOpenMeteoValueAtIndex(data, "temperature_2m_spread", model.peakIndex);
  const selectedHigh = model.hourlyHighF ?? model.dailyHighF;

  return {
    ...model,
    temperatureSpreadFNearHigh: spread,
    highRangeApproxF: {
      low: selectedHigh !== null && spread !== null ? roundOne(selectedHigh - spread) : null,
      high: selectedHigh !== null && spread !== null ? roundOne(selectedHigh + spread) : null,
    },
    uncertaintyBucket:
      selectedHigh !== null && spread !== null
        ? getDailyHighBucketLabel(selectedHigh + spread)
        : null,
  };
}

function parseNwsIntervalStart(validTime: unknown) {
  if (typeof validTime !== "string") {
    return null;
  }

  const start = validTime.split("/")[0];
  return start || null;
}

function getNwsGridLayer(data: Record<string, unknown> | null, key: string) {
  const properties = data?.properties as Record<string, unknown> | undefined;
  const layer = properties?.[key] as Record<string, unknown> | undefined;
  const values = Array.isArray(layer?.values)
    ? (layer.values as Record<string, unknown>[])
    : [];

  return {
    uom: typeof layer?.uom === "string" ? layer.uom : null,
    values,
  };
}

function convertGridValue(value: number, uom: string | null, kind: "temperature" | "wind" | "pressure" | "plain") {
  const unit = uom?.toLowerCase() ?? "";

  if (kind === "temperature") {
    if (unit.includes("degf") || unit.endsWith(":degf")) {
      return value;
    }

    return celsiusToFahrenheit(value);
  }

  if (kind === "wind") {
    if (unit.includes("mi_h-1") || unit.includes("mph")) {
      return value;
    }

    return kmhToMph(value);
  }

  if (kind === "pressure") {
    return value > 2000 ? pascalToMb(value) : value;
  }

  return value;
}

function getNwsGridValueForTime(
  data: Record<string, unknown> | null,
  key: string,
  timeLocal: string,
  timezone: string,
  kind: "temperature" | "wind" | "pressure" | "plain"
) {
  const layer = getNwsGridLayer(data, key);

  for (const item of layer.values) {
    const start = parseNwsIntervalStart(item.validTime);
    const value = toNumber(item.value);

    if (!start || value === null) {
      continue;
    }

    if (getLocalDateTimeLabel(start, timezone) === timeLocal) {
      return roundOne(convertGridValue(value, layer.uom, kind));
    }
  }

  return null;
}

function getNwsGridMaxForDate(
  data: Record<string, unknown> | null,
  key: string,
  eventDate: string,
  timezone: string,
  kind: "temperature" | "wind" | "pressure" | "plain"
) {
  const layer = getNwsGridLayer(data, key);
  const values = layer.values
    .map((item) => {
      const start = parseNwsIntervalStart(item.validTime);
      const value = toNumber(item.value);

      if (!start || value === null) {
        return null;
      }

      if (getLocalDateFromIso(start, timezone) !== eventDate) {
        return null;
      }

      return {
        value: roundOne(convertGridValue(value, layer.uom, kind)),
        timeLocal: getLocalDateTimeLabel(start, timezone),
        hourLocal: getLocalHour(start, timezone),
      };
    })
    .filter(
      (item): item is { value: number; timeLocal: string | null; hourLocal: number | null } =>
        item !== null && item.value !== null
    );

  if (values.length === 0) {
    return { value: null, timeLocal: null };
  }

  const best = values.reduce((currentBest, value) =>
    value.value > currentBest.value ? value : currentBest
  );

  return { value: best.value, timeLocal: best.timeLocal };
}

function getNwsHazards(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const layer = getNwsGridLayer(data, "hazards");

  return uniqueStrings(
    layer.values
      .map((item) => {
        const start = parseNwsIntervalStart(item.validTime);

        if (!start || getLocalDateFromIso(start, timezone) !== eventDate) {
          return null;
        }

        const values = Array.isArray(item.value) ? item.value : [];
        return values
          .map((hazard) => {
            if (!hazard || typeof hazard !== "object" || Array.isArray(hazard)) {
              return null;
            }

            const record = hazard as Record<string, unknown>;
            return [record.phenomenon, record.significance]
              .filter((value): value is string => typeof value === "string")
              .join(".");
          })
          .filter((value): value is string => Boolean(value));
      })
      .flat()
  );
}

function getNwsWeatherSummary(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const layer = getNwsGridLayer(data, "weather");
  const descriptions = uniqueStrings(
    layer.values
      .map((item) => {
        const start = parseNwsIntervalStart(item.validTime);

        if (!start || getLocalDateFromIso(start, timezone) !== eventDate) {
          return null;
        }

        const values = Array.isArray(item.value) ? item.value : [];
        return values.map((weather) => {
          if (!weather || typeof weather !== "object" || Array.isArray(weather)) {
            return null;
          }

          const record = weather as Record<string, unknown>;
          return [record.coverage, record.intensity, record.weather]
            .filter((value): value is string => typeof value === "string")
            .join(" ")
            .replaceAll("_", " ");
        });
      })
      .flat()
  );

  return descriptions.length > 0 ? descriptions.slice(0, 4).join("; ") : null;
}

function getNwsPeakWindow(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const temperatureLayer = getNwsGridLayer(data, "temperature");
  const maxTemperatureLayer = getNwsGridLayer(data, "maxTemperature");
  const candidateTimes = uniqueStrings(
    [...temperatureLayer.values, ...maxTemperatureLayer.values]
      .map((item) => parseNwsIntervalStart(item.validTime))
      .filter((start): start is string => Boolean(start))
      .filter((start) => getLocalDateFromIso(start, timezone) === eventDate)
      .filter((start) => {
        const hour = getLocalHour(start, timezone);
        return hour !== null && hour >= 10 && hour <= 20;
      })
      .map((start) => getLocalDateTimeLabel(start, timezone))
  );

  return candidateTimes.slice(0, 16).map((timeLocal) => ({
    timeLocal,
    temperatureF: getNwsGridValueForTime(data, "temperature", timeLocal, timezone, "temperature"),
    maxTemperatureF: getNwsGridValueForTime(data, "maxTemperature", timeLocal, timezone, "temperature"),
    dewPointF: getNwsGridValueForTime(data, "dewpoint", timeLocal, timezone, "temperature"),
    relativeHumidityPercent: getNwsGridValueForTime(data, "relativeHumidity", timeLocal, timezone, "plain"),
    skyCoverPercent: getNwsGridValueForTime(data, "skyCover", timeLocal, timezone, "plain"),
    windDirectionDegrees: getNwsGridValueForTime(data, "windDirection", timeLocal, timezone, "plain"),
    windSpeedMph: getNwsGridValueForTime(data, "windSpeed", timeLocal, timezone, "wind"),
    windGustMph: getNwsGridValueForTime(data, "windGust", timeLocal, timezone, "wind"),
    probabilityOfPrecipitationPercent: getNwsGridValueForTime(
      data,
      "probabilityOfPrecipitation",
      timeLocal,
      timezone,
      "plain"
    ),
    probabilityOfThunderPercent: getNwsGridValueForTime(data, "probabilityOfThunder", timeLocal, timezone, "plain"),
    pressureMb: getNwsGridValueForTime(data, "pressure", timeLocal, timezone, "pressure"),
  }));
}

function getThunderstormRiskText(
  dailyForecast: Record<string, unknown> | null,
  alerts: Record<string, unknown> | null,
  nwsWeatherSummary: string | null,
  thunderstormProbability: number | null
) {
  const periods = getNwsPeriods(dailyForecast);
  const periodText = periods
    .map((period) =>
      [period.name, period.shortForecast, period.detailedForecast]
        .filter((value): value is string => typeof value === "string")
        .join(" — ")
    )
    .find((text) => /thunder|storm|shower|rain|precip/i.test(text));

  const features = Array.isArray(alerts?.features)
    ? (alerts?.features as Record<string, unknown>[])
    : [];
  const alertText = features
    .map((feature) => {
      const properties = feature.properties as Record<string, unknown> | undefined;
      return typeof properties?.headline === "string" ? properties.headline : null;
    })
    .find((headline): headline is string => Boolean(headline));

  if (thunderstormProbability !== null && thunderstormProbability >= 30) {
    return `Open-Meteo thunderstorm probability near peak is ${thunderstormProbability}%.`;
  }

  return alertText ?? periodText ?? nwsWeatherSummary ?? null;
}

function getModelAgreement(values: number[]) {
  if (values.length < 2) {
    return "insufficient" as const;
  }

  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= 1.5) {
    return "strong" as const;
  }

  if (spread <= 3) {
    return "moderate" as const;
  }

  return "weak" as const;
}

function getRemainingHeatingHours(params: { eventDate: string; timezone: string; now: Date }) {
  const today = getLocalDateFromIso(params.now.toISOString(), params.timezone);

  if (today !== params.eventDate) {
    return null;
  }

  const currentHour = getLocalHour(params.now.toISOString(), params.timezone);

  if (currentHour === null) {
    return null;
  }

  const endHeatingHour = 18;
  return Math.max(0, endHeatingHour - currentHour);
}

function getRiskFromConditions(params: {
  eventIsToday: boolean;
  latestTempF: number | null;
  observedHighF: number | null;
  likelyTemperatureF: number | null;
  trend: WeatherEvidenceTrend;
  remainingHeatingHours: number | null;
  precipitationProbability: number | null;
  thunderstormProbability: number | null;
  cloudCover: number | null;
  modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
}) {
  if (!params.eventIsToday || params.likelyTemperatureF === null) {
    return {
      overshootRisk: params.modelAgreement === "weak" ? "moderate" : "insufficient",
      capRisk: params.modelAgreement === "weak" ? "moderate" : "insufficient",
    } as const;
  }

  let overshootScore = 0;
  let capScore = 0;

  if (params.trend === "rising") overshootScore += 2;
  if (params.trend === "falling") capScore += 2;
  if ((params.remainingHeatingHours ?? 0) >= 2) overshootScore += 1;
  if ((params.remainingHeatingHours ?? 0) <= 1) capScore += 1;

  if (params.observedHighF !== null && params.likelyTemperatureF - params.observedHighF >= 1.5) {
    overshootScore += 2;
  }

  if ((params.cloudCover ?? 0) >= 70) capScore += 1;
  if ((params.precipitationProbability ?? 0) >= 40) capScore += 2;
  if ((params.thunderstormProbability ?? 0) >= 25) capScore += 2;

  return {
    overshootRisk: overshootScore >= 4 ? "high" : overshootScore >= 2 ? "moderate" : "low",
    capRisk: capScore >= 4 ? "high" : capScore >= 2 ? "moderate" : "low",
  } as const;
}

function buildReasoning(params: {
  observedHighF: number | null;
  latestTempF: number | null;
  trend: WeatherEvidenceTrend;
  modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
  likelyBucket: string | null;
  forecastSpreadF: number | null;
  precipitationProbability: number | null;
  thunderstormProbability: number | null;
  cloudCover: number | null;
  remainingHeatingHours: number | null;
}) {
  const supportiveFactors: string[] = [];
  const limitingFactors: string[] = [];
  const watchTriggers: string[] = [];
  const invalidationSignals: string[] = [];

  if (params.observedHighF !== null) {
    supportiveFactors.push(`Official station observed high so far is ${params.observedHighF}°F.`);
  }

  if (params.latestTempF !== null) {
    supportiveFactors.push(`Latest official station observation is ${params.latestTempF}°F.`);
  }

  if (params.trend === "rising") {
    supportiveFactors.push("Recent official station trend is rising.");
  } else if (params.trend === "falling") {
    limitingFactors.push("Recent official station trend is falling.");
  }

  if (params.modelAgreement === "strong") {
    supportiveFactors.push("Forecast sources have strong agreement.");
  } else if (params.modelAgreement === "weak") {
    limitingFactors.push("Forecast sources disagree by several degrees.");
  }

  if ((params.forecastSpreadF ?? 0) >= 3) {
    limitingFactors.push(`Forecast spread is wide at about ${params.forecastSpreadF}°F.`);
  }

  if ((params.cloudCover ?? 0) >= 70) {
    limitingFactors.push(`Cloud cover near peak heating is high at about ${params.cloudCover}%.`);
  }

  if ((params.precipitationProbability ?? 0) >= 40) {
    limitingFactors.push(`Precipitation probability near peak heating is elevated at about ${params.precipitationProbability}%.`);
  }

  if ((params.thunderstormProbability ?? 0) >= 25) {
    limitingFactors.push(`Thunderstorm probability near peak heating is elevated at about ${params.thunderstormProbability}%.`);
  }

  watchTriggers.push("Monitor the next official station observation and whether it makes a new event-date high.");
  watchTriggers.push("Monitor NWS hourly forecast updates and Open-Meteo model refreshes for bucket shifts.");

  if (params.likelyBucket) {
    invalidationSignals.push(`A forecast/observation shift outside ${params.likelyBucket} weakens the current bucket read.`);
  }

  if (params.remainingHeatingHours !== null && params.remainingHeatingHours <= 1) {
    watchTriggers.push("With little heating time left, each additional official observation becomes more decisive.");
  }

  return {
    summary: params.likelyBucket
      ? `Most structured evidence currently points toward ${params.likelyBucket}.`
      : "The evidence packet does not yet identify a clear most-likely bucket.",
    supportiveFactors,
    limitingFactors,
    watchTriggers,
    invalidationSignals,
  };
}

export function buildWeatherEvidencePacket(params: {
  stationId: string;
  stationName?: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  eventDate: string;
  eventFamily?: "daily_high" | "hourly_temperature";
  eventHourLocal?: number | null;
  nwsPoint: Record<string, unknown> | null;
  nwsDailyForecast: Record<string, unknown> | null;
  nwsHourlyForecast: Record<string, unknown> | null;
  nwsGridpointData?: Record<string, unknown> | null;
  nwsObservations: Record<string, unknown> | null;
  nwsAlerts: Record<string, unknown> | null;
  openMeteo: Record<string, unknown> | null;
  openMeteoEvidence?: OpenMeteoEvidenceForecasts | null;
  now?: Date;
}): WeatherEvidencePacket {
  const now = params.now ?? new Date();
  const today = getLocalDateFromIso(now.toISOString(), params.timezone);
  const tomorrowDate = new Date(`${today ?? params.eventDate}T00:00:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const eventFamily = params.eventFamily ?? "daily_high";
  const observations = normalizeObservations({
    data: params.nwsObservations,
    eventDate: params.eventDate,
    timezone: params.timezone,
  });

  const nwsDailyHighF = getNwsDailyHighF(params.nwsDailyForecast, params.eventDate, params.timezone);
  const nwsHourlyHigh = getNwsHourlyHigh(params.nwsHourlyForecast, params.eventDate, params.timezone);
  const nwsGridMax = getNwsGridMaxForDate(
    params.nwsGridpointData ?? null,
    "maxTemperature",
    params.eventDate,
    params.timezone,
    "temperature"
  );
  const nwsGridTemperatureMax = getNwsGridMaxForDate(
    params.nwsGridpointData ?? null,
    "temperature",
    params.eventDate,
    params.timezone,
    "temperature"
  );

  const bestMatchData = params.openMeteoEvidence?.bestMatch ?? params.openMeteo;
  const openMeteoDailyHighF = getOpenMeteoDailyHigh(bestMatchData, params.eventDate);
  const openMeteoHourlyHigh = getOpenMeteoHourlyHigh(bestMatchData, params.eventDate);

  const modelEvidence = {
    bestMatch: getModelEvidence("Open-Meteo best match", bestMatchData, params.eventDate),
    hrrr: getModelEvidence("Open-Meteo HRRR", params.openMeteoEvidence?.hrrr ?? null, params.eventDate),
    nbm: getModelEvidence("Open-Meteo NBM", params.openMeteoEvidence?.nbm ?? null, params.eventDate),
    gfs: getModelEvidence("Open-Meteo GFS", params.openMeteoEvidence?.gfs ?? null, params.eventDate),
    ecmwf: getModelEvidence("Open-Meteo ECMWF IFS", params.openMeteoEvidence?.ecmwf ?? null, params.eventDate),
    ensemble: getEnsembleEvidence(params.openMeteoEvidence?.ensemble ?? null, params.eventDate),
  };

  const allHighs = [
    nwsHourlyHigh.high,
    nwsDailyHighF,
    nwsGridMax.value,
    nwsGridTemperatureMax.value,
    modelEvidence.bestMatch?.hourlyHighF ?? modelEvidence.bestMatch?.dailyHighF ?? null,
    modelEvidence.hrrr?.hourlyHighF ?? modelEvidence.hrrr?.dailyHighF ?? null,
    modelEvidence.nbm?.hourlyHighF ?? modelEvidence.nbm?.dailyHighF ?? null,
    modelEvidence.gfs?.hourlyHighF ?? modelEvidence.gfs?.dailyHighF ?? null,
    modelEvidence.ecmwf?.hourlyHighF ?? modelEvidence.ecmwf?.dailyHighF ?? null,
    modelEvidence.ensemble?.hourlyHighF ?? modelEvidence.ensemble?.dailyHighF ?? null,
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  const forecastHighAverageF = roundOne(average(allHighs));
  const forecastHighMedianF = roundOne(median(allHighs));
  const forecastSpreadF = allHighs.length > 1 ? roundOne(Math.max(...allHighs) - Math.min(...allHighs)) : null;
  const modelAgreement = getModelAgreement(allHighs);
  const likelyTemperatureF =
    forecastHighMedianF ??
    observations.observedHighReading?.tempF ??
    observations.latest?.tempF ??
    null;

  const likelyBucket = getDailyHighBucketLabel(likelyTemperatureF);
  const alternateBuckets = uniqueStrings([
    getDailyHighBucketLabel(nwsHourlyHigh.high),
    getDailyHighBucketLabel(nwsDailyHighF),
    getDailyHighBucketLabel(nwsGridMax.value),
    getDailyHighBucketLabel(openMeteoHourlyHigh?.temp ?? null),
    getDailyHighBucketLabel(openMeteoDailyHighF),
    modelEvidence.hrrr?.likelyBucket ?? null,
    modelEvidence.nbm?.likelyBucket ?? null,
    modelEvidence.gfs?.likelyBucket ?? null,
    modelEvidence.ecmwf?.likelyBucket ?? null,
    modelEvidence.ensemble?.likelyBucket ?? null,
  ]);

  const openMeteoHighIndex = openMeteoHourlyHigh?.index ?? modelEvidence.bestMatch?.peakIndex ?? null;
  const peakWindow = getNwsPeakWindow(params.nwsGridpointData ?? null, params.eventDate, params.timezone);
  const nwsHazards = getNwsHazards(params.nwsGridpointData ?? null, params.eventDate, params.timezone);
  const nwsWeatherSummary = getNwsWeatherSummary(params.nwsGridpointData ?? null, params.eventDate, params.timezone);

  const thunderstormProbability = getOpenMeteoValueAtIndex(bestMatchData, "thunderstorm_probability", openMeteoHighIndex);
  const precipitationProbability = getOpenMeteoValueAtIndex(bestMatchData, "precipitation_probability", openMeteoHighIndex);
  const cloudCover = getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover", openMeteoHighIndex);
  const remainingHeatingHours = getRemainingHeatingHours({ eventDate: params.eventDate, timezone: params.timezone, now });

  const risks = getRiskFromConditions({
    eventIsToday: today === params.eventDate,
    latestTempF: observations.latest?.tempF ?? null,
    observedHighF: observations.observedHighReading?.tempF ?? null,
    likelyTemperatureF,
    trend: observations.trend,
    remainingHeatingHours,
    precipitationProbability,
    thunderstormProbability,
    cloudCover,
    modelAgreement,
  });

  const confidenceBase =
    modelAgreement === "strong" ? 78 : modelAgreement === "moderate" ? 62 : modelAgreement === "weak" ? 42 : 25;
  const spreadPenalty = forecastSpreadF !== null ? Math.min(20, Math.max(0, (forecastSpreadF - 1) * 5)) : 10;
  const bucketConfidencePercent = Math.max(0, Math.min(95, Math.round(confidenceBase - spreadPenalty)));

  const reasoning = buildReasoning({
    observedHighF: observations.observedHighReading?.tempF ?? null,
    latestTempF: observations.latest?.tempF ?? null,
    trend: observations.trend,
    modelAgreement,
    likelyBucket,
    forecastSpreadF,
    precipitationProbability,
    thunderstormProbability,
    cloudCover,
    remainingHeatingHours,
  });

  const evidenceNotes: string[] = [];

  if (observations.observedHighReading?.tempF !== null && observations.observedHighReading) {
    evidenceNotes.push(
      `Observed high so far is ${observations.observedHighReading.tempF}°F at ${observations.observedHighReading.timeLocal}.`
    );
  }

  if (nwsHourlyHigh.high !== null) {
    evidenceNotes.push(
      `NWS hourly forecast high is ${nwsHourlyHigh.high}°F${
        nwsHourlyHigh.timeLocal ? ` near ${nwsHourlyHigh.timeLocal}` : ""
      }, pointing to ${getDailyHighBucketLabel(nwsHourlyHigh.high)}.`
    );
  }

  if (nwsGridMax.value !== null) {
    evidenceNotes.push(
      `NWS raw grid maxTemperature is ${nwsGridMax.value}°F${
        nwsGridMax.timeLocal ? ` near ${nwsGridMax.timeLocal}` : ""
      }, pointing to ${getDailyHighBucketLabel(nwsGridMax.value)}.`
    );
  }

  if (openMeteoHourlyHigh?.temp !== undefined) {
    evidenceNotes.push(
      `Open-Meteo best-match hourly high is ${openMeteoHourlyHigh.temp}°F near ${openMeteoHourlyHigh.timeLocal}, pointing to ${getDailyHighBucketLabel(openMeteoHourlyHigh.temp)}.`
    );
  }

  if (likelyBucket) {
    evidenceNotes.push(
      `Daily high bucket mapping uses floor-to-next-degree ranges: 93.5 means 93° to 94°, not an above-93.5 threshold. Current consensus points to ${likelyBucket}.`
    );
  }

  const localNowLabel = getLocalDateTimeLabel(now.toISOString(), params.timezone);

  const modelConsensus = [
    {
      source: "Station observations",
      forecastHighF: observations.observedHighReading?.tempF ?? null,
      bucket: getDailyHighBucketLabel(observations.observedHighReading?.tempF ?? null),
      weight: params.eventDate === today ? "very_high" as const : "context" as const,
      notes:
        observations.observedHighReading?.tempF !== null && observations.observedHighReading
          ? "Official station observations are the live settlement anchor for same-day markets."
          : "No event-date station high is available yet.",
    },
    {
      source: "NWS daily",
      forecastHighF: nwsDailyHighF,
      bucket: getDailyHighBucketLabel(nwsDailyHighF),
      weight: "high" as const,
      notes: "Official public NWS forecast high.",
    },
    {
      source: "NWS hourly",
      forecastHighF: nwsHourlyHigh.high,
      bucket: getDailyHighBucketLabel(nwsHourlyHigh.high),
      weight: "high" as const,
      notes: nwsHourlyHigh.timeLocal
        ? `Hourly NWS peak near ${nwsHourlyHigh.timeLocal}.`
        : "NWS hourly peak timing unavailable.",
    },
    {
      source: "NWS grid",
      forecastHighF: nwsGridMax.value,
      bucket: getDailyHighBucketLabel(nwsGridMax.value),
      weight: "medium_high" as const,
      notes: "Raw NWS gridpoint maxTemperature guidance.",
    },
    {
      source: "Open-Meteo Best Match",
      forecastHighF: modelEvidence.bestMatch?.hourlyHighF ?? openMeteoHourlyHigh?.temp ?? openMeteoDailyHighF,
      bucket: getDailyHighBucketLabel(modelEvidence.bestMatch?.hourlyHighF ?? openMeteoHourlyHigh?.temp ?? openMeteoDailyHighF),
      weight: "medium_high" as const,
      notes: "Open-Meteo blended best-match model guidance.",
    },
    {
      source: "HRRR",
      forecastHighF: modelEvidence.hrrr?.hourlyHighF ?? null,
      bucket: modelEvidence.hrrr?.likelyBucket ?? null,
      weight: params.eventDate === today ? "high" as const : "medium" as const,
      notes: "Rapid-refresh short-term guidance when available.",
    },
    {
      source: "NBM",
      forecastHighF: modelEvidence.nbm?.hourlyHighF ?? null,
      bucket: modelEvidence.nbm?.likelyBucket ?? null,
      weight: "high" as const,
      notes: "National Blend of Models guidance for the event location.",
    },
    {
      source: "GFS",
      forecastHighF: modelEvidence.gfs?.hourlyHighF ?? null,
      bucket: modelEvidence.gfs?.likelyBucket ?? null,
      weight: "medium" as const,
      notes: "Global model guidance; useful for broader trend confirmation.",
    },
    {
      source: "ECMWF",
      forecastHighF: modelEvidence.ecmwf?.hourlyHighF ?? null,
      bucket: modelEvidence.ecmwf?.likelyBucket ?? null,
      weight: "medium_high" as const,
      notes: "Independent global model confirmation or disagreement.",
    },
    {
      source: "Ensemble",
      forecastHighF: modelEvidence.ensemble?.hourlyHighF ?? null,
      bucket: modelEvidence.ensemble?.likelyBucket ?? null,
      weight: "context" as const,
      notes:
        modelEvidence.ensemble?.temperatureSpreadFNearHigh !== null && modelEvidence.ensemble?.temperatureSpreadFNearHigh !== undefined
          ? `Ensemble spread near high is ${modelEvidence.ensemble.temperatureSpreadFNearHigh}°F.`
          : "Ensemble spread unavailable; use as contextual evidence only.",
    },
  ].filter((row) => row.forecastHighF !== null || row.bucket !== null);

  const bucketProbabilities = normalizeProbabilityDistribution([
    {
      bucket: likelyBucket,
      weight: bucketConfidencePercent ?? 0,
      reasoning: "Primary consensus bucket from weighted NWS/Open-Meteo evidence.",
    },
    {
      bucket: getNeighborBucket(likelyTemperatureF, 1),
      weight: risks.overshootRisk === "high" ? 28 : risks.overshootRisk === "moderate" ? 18 : 8,
      reasoning: "Hot-tail/overshoot bucket based on remaining heating, model spread, and storm/cap risk.",
    },
    {
      bucket: getNeighborBucket(likelyTemperatureF, -1),
      weight: risks.capRisk === "high" ? 28 : risks.capRisk === "moderate" ? 18 : 8,
      reasoning: "Cool-tail/cap-risk bucket based on clouds, precipitation, thunder risk, and weak heating support.",
    },
    ...alternateBuckets.map((bucket) => ({
      bucket,
      weight: 10,
      reasoning: "Alternate bucket from disagreement among forecast sources.",
    })),
  ]);

  const observationTriggers = [
    {
      trigger: "Official station prints a temperature inside the hot-tail bucket.",
      action: "Reassess immediately for hedge/roll or avoid chasing if price has already corrected.",
      urgency: "high" as const,
    },
    {
      trigger: "Two consecutive official observations remain capped below the likely bucket while heating time is running out.",
      action: "Increase confidence in the cooler/current bucket and consider trimming weak hot-tail exposure.",
      urgency: "medium" as const,
    },
    {
      trigger: "Updated HRRR/NBM/NWS hourly guidance shifts by at least 1°F into a neighboring bucket.",
      action: "Recompute fair value and compare the new target basket to current ask before entering.",
      urgency: "medium" as const,
    },
  ];

  const settlementClock = buildSettlementClockRead({
    localNow: localNowLabel,
    remainingHeatingHours,
    isToday: today === params.eventDate,
    isFuture: today !== null ? params.eventDate > today : false,
  });

  const forecastChangeRead =
    forecastSpreadF === null
      ? "Forecast-change read is unavailable because too few model sources returned usable highs."
      : forecastSpreadF <= 1.5
        ? "Models are tightly clustered; bucket confidence should be driven more by price and live observations."
        : forecastSpreadF <= 3
          ? "Models show moderate spread; keep neighboring buckets live and avoid overpaying for one outcome."
          : "Models are widely spread; treat the bucket read as unstable until guidance converges.";

  const latest = observations.latest;
  const currentTempVsObservedHighF =
    latest?.tempF !== null && latest?.tempF !== undefined && observations.observedHighReading?.tempF !== null && observations.observedHighReading?.tempF !== undefined
      ? roundOne(latest.tempF - observations.observedHighReading.tempF)
      : null;

  return {
    station: {
      id: params.stationId,
      name: params.stationName ?? null,
      timezone: params.timezone,
      latitude: params.latitude,
      longitude: params.longitude,
    },
    event: {
      family: eventFamily,
      date: params.eventDate,
      localNow: localNowLabel,
      isToday: today === params.eventDate,
      isTomorrow: tomorrow === params.eventDate,
      isFuture: today !== null ? params.eventDate > today : false,
      eventHourLocal: params.eventHourLocal ?? null,
      remainingHeatingHours,
      settlementAnchor: "official_station_observation",
    },
    observations: {
      latestTempF: latest?.tempF ?? null,
      latestObservationTimeLocal: latest?.timeLocal ?? null,
      observedHighF: observations.observedHighReading?.tempF ?? null,
      observedHighTimeLocal: observations.observedHighReading?.timeLocal ?? null,
      currentTempVsObservedHighF,
      observationCountForEventDate: observations.eventDateReadings.length,
      recentReadings: observations.recent.map((reading) => ({
        timeLocal: reading.timeLocal,
        tempF: reading.tempF,
        dewPointF: reading.dewPointF,
        humidityPercent: reading.humidityPercent,
        windDirectionDegrees: reading.windDirectionDegrees,
        windSpeedMph: reading.windSpeedMph,
        windGustMph: reading.windGustMph,
        cloudText: reading.cloudText,
        pressureMb: reading.pressureMb,
      })),
      trend: observations.trend,
      trendLastHourF: observations.trendLastHourF,
    },
    forecasts: {
      nwsDailyHighF,
      nwsHourlyHighF: nwsHourlyHigh.high,
      nwsHourlyHighTimeLocal: nwsHourlyHigh.timeLocal,
      nwsGridMaxTemperatureF: nwsGridMax.value,
      nwsGridMaxTemperatureTimeLocal: nwsGridMax.timeLocal,
      openMeteoDailyHighF,
      openMeteoHourlyHighF: openMeteoHourlyHigh?.temp ?? null,
      openMeteoHourlyHighTimeLocal: openMeteoHourlyHigh?.timeLocal ?? null,
      forecastHighAverageF,
      forecastHighMedianF,
      forecastSpreadF,
      modelAgreement,
      likelyTemperatureF,
      likelyBucket,
      alternateBuckets,
      alternateTemperatureRangeF: {
        low: allHighs.length > 0 ? roundOne(Math.min(...allHighs)) : null,
        high: allHighs.length > 0 ? roundOne(Math.max(...allHighs)) : null,
      },
    },
    openMeteoModels: {
      bestMatch: modelEvidence.bestMatch,
      hrrr: modelEvidence.hrrr,
      nbm: modelEvidence.nbm,
      gfs: modelEvidence.gfs,
      ecmwf: modelEvidence.ecmwf,
      ensemble: modelEvidence.ensemble,
      sourceErrors: params.openMeteoEvidence?.errors ?? [],
    },
    nwsGrid: {
      updateTime:
        typeof (params.nwsGridpointData?.properties as Record<string, unknown> | undefined)?.updateTime === "string"
          ? ((params.nwsGridpointData?.properties as Record<string, unknown>).updateTime as string)
          : null,
      validTimes:
        typeof (params.nwsGridpointData?.properties as Record<string, unknown> | undefined)?.validTimes === "string"
          ? ((params.nwsGridpointData?.properties as Record<string, unknown>).validTimes as string)
          : null,
      rawMaxTemperatureF: nwsGridMax.value,
      rawMaxTemperatureTimeLocal: nwsGridMax.timeLocal,
      peakWindow,
      hazards: nwsHazards,
      weatherSummary: nwsWeatherSummary,
    },
    atmosphere: {
      cloudCoverPercentNearHigh: cloudCover,
      lowCloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover_low", openMeteoHighIndex),
      midCloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover_mid", openMeteoHighIndex),
      highCloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover_high", openMeteoHighIndex),
      windSpeedMphNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "wind_speed_10m", openMeteoHighIndex),
      windGustMphNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "wind_gusts_10m", openMeteoHighIndex),
      windDirectionDegreesNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "wind_direction_10m", openMeteoHighIndex),
      dewPointFNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "dew_point_2m", openMeteoHighIndex),
      humidityPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "relative_humidity_2m", openMeteoHighIndex),
      shortwaveRadiationNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "shortwave_radiation", openMeteoHighIndex),
      sunshineDurationSecondsNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "sunshine_duration", openMeteoHighIndex),
      precipitationProbabilityNearHigh: precipitationProbability,
      thunderstormProbabilityNearHigh: thunderstormProbability,
      capeNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cape", openMeteoHighIndex),
      liftedIndexNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "lifted_index", openMeteoHighIndex),
      convectiveInhibitionNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "convective_inhibition", openMeteoHighIndex),
      boundaryLayerHeightMetersNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "boundary_layer_height", openMeteoHighIndex),
      thunderstormRiskText: getThunderstormRiskText(
        params.nwsDailyForecast,
        params.nwsAlerts,
        nwsWeatherSummary,
        thunderstormProbability
      ),
      latestCloudText: latest?.cloudText ?? null,
      latestWindSpeedMph: latest?.windSpeedMph ?? null,
      latestWindGustMph: latest?.windGustMph ?? null,
      latestHumidityPercent: latest?.humidityPercent ?? null,
    },
    bucketAnalysis: {
      mostLikelyBucket: likelyBucket,
      secondMostLikelyBucket: alternateBuckets.find((bucket) => bucket !== likelyBucket) ?? null,
      hotTailBucket: getNeighborBucket(likelyTemperatureF, 1),
      coolTailBucket: getNeighborBucket(likelyTemperatureF, -1),
      bucketConfidencePercent,
      overshootRisk: risks.overshootRisk,
      capRisk: risks.capRisk,
    },
    reasoning,
    rawSources: {
      nwsPoint: params.nwsPoint,
      nwsDailyForecast: params.nwsDailyForecast,
      nwsHourlyForecast: params.nwsHourlyForecast,
      nwsGridpointData: params.nwsGridpointData ?? null,
      nwsAlerts: params.nwsAlerts,
      openMeteo: params.openMeteo,
      openMeteoEvidence: params.openMeteoEvidence ?? null,
    },
    evidenceNotes,
  };
}

export function sanitizeWeatherEvidenceForClient(packet: WeatherEvidencePacket) {
  const { rawSources, ...safePacket } = packet;

  return {
    ...safePacket,
    rawSources: {
      nwsPoint: rawSources.nwsPoint ? "available" : null,
      nwsDailyForecast: rawSources.nwsDailyForecast ? "available" : null,
      nwsHourlyForecast: rawSources.nwsHourlyForecast ? "available" : null,
      nwsGridpointData: rawSources.nwsGridpointData ? "available" : null,
      nwsAlerts: rawSources.nwsAlerts ? "available" : null,
      openMeteo: rawSources.openMeteo ? "available" : null,
      openMeteoEvidence: rawSources.openMeteoEvidence ? "available" : null,
    },
  };
}
__KALSHI_FILE__

echo "Done. Run: npm run build"
