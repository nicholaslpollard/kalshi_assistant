import type {
  AiBucketProbability,
  AiModelConsensusRow,
  AiObservationTrigger,
  AiSettlementClockRead,
} from "@/types/eventScanner";

export type WeatherHistorySourceType = "event_ai_review" | "position_ai_review";

export type WeatherHistoryFamily = "daily_high" | "hourly_temperature";

export type WeatherLeadTimeBucket =
  | "post_peak"
  | "0_3h_to_peak"
  | "3_6h_to_peak"
  | "6_12h_to_peak"
  | "12_18h_to_peak"
  | "18_30h_to_peak"
  | "30_48h_to_peak"
  | "2_5d_to_peak"
  | "5d_plus_to_peak"
  | "unknown";

export type WeatherForecastSnapshotInput = {
  sourceType: WeatherHistorySourceType;
  eventTicker?: string | null;
  seriesTicker?: string | null;
  positionTicker?: string | null;
  marketCode?: string | null;
  stationId?: string | null;
  stationName?: string | null;
  eventDate?: string | null;
  eventFamily?: WeatherHistoryFamily | null;
  eventHourLocal?: number | null;
  weatherEvidence: Record<string, unknown> | null;
  aiReview?: Record<string, unknown> | null;
  leadTimeHours?: number | null;
  leadTimeBucket?: WeatherLeadTimeBucket | null;
  targetPeakHourLocal?: number | null;
  temporalContextLabel?: string | null;
};

export type WeatherForecastSnapshotDocument = {
  id?: string;
  createdAt: unknown;
  sourceType: WeatherHistorySourceType;
  eventTicker: string | null;
  seriesTicker: string | null;
  positionTicker: string | null;
  marketCode: string | null;
  stationId: string | null;
  stationName: string | null;
  eventDate: string | null;
  eventFamily: WeatherHistoryFamily | null;
  eventHourLocal: number | null;
  leadTimeHours: number | null;
  leadTimeBucket: WeatherLeadTimeBucket | null;
  targetPeakHourLocal: number | null;
  temporalContextLabel: string | null;
  modelConsensus: AiModelConsensusRow[];
  bucketProbabilities: AiBucketProbability[];
  observationTriggers: AiObservationTrigger[];
  settlementClock: AiSettlementClockRead | null;
  forecastChangeRead: string | null;
  evidenceSummary: string | null;
  aiSummary: string | null;
  aiAction: string | null;
  aiConfidence: string | null;
  aiIndependentForecast: Record<string, unknown> | null;
};

export type WeatherResolvedResultInput = {
  stationId: string;
  stationName?: string | null;
  eventDate: string;
  eventFamily?: WeatherHistoryFamily | null;
  eventHourLocal?: number | null;
  resolvedHighF?: number | null;
  resolvedTemperatureF?: number | null;
  resolvedBucket?: string | null;
  notes?: string | null;
};

export type WeatherResolvedResultDocument = {
  id?: string;
  createdAt: unknown;
  updatedAt: unknown;
  stationId: string;
  stationName: string | null;
  eventDate: string;
  eventFamily: WeatherHistoryFamily | null;
  eventHourLocal: number | null;
  resolvedHighF: number | null;
  resolvedTemperatureF: number | null;
  resolvedBucket: string | null;
  notes: string | null;
};

export type WeatherLeadTimeBiasRow = {
  source: string;
  leadTimeBucket: WeatherLeadTimeBucket;
  leadTimeLabel: string;
  sampleCount: number;
  meanErrorF: number | null;
  meanAbsoluteErrorF: number | null;
  exactBucketCount: number;
  withinOneBucketCount: number;
  notes: string;
};

export type WeatherModelBiasRow = {
  source: string;
  sampleCount: number;
  meanErrorF: number | null;
  meanAbsoluteErrorF: number | null;
  warmMissCount: number;
  coolMissCount: number;
  exactBucketCount: number;
  withinOneBucketCount: number;
  notes: string;
};

export type WeatherBiasSummary = {
  stationId: string | null;
  stationName: string | null;
  eventFamily: WeatherHistoryFamily | null;
  sampleCount: number;
  resolvedResultCount: number;
  generatedAt: string;
  rows: WeatherModelBiasRow[];
  leadTimeRows: WeatherLeadTimeBiasRow[];
  notes: string[];
};
