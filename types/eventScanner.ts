
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
