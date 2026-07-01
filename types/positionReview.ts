
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
