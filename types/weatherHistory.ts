import type {
  AiBucketProbability,
  AiModelConsensusRow,
  AiObservationTrigger,
  AiSettlementClockRead,
} from "@/types/eventScanner";

export type WeatherHistorySourceType = "event_ai_review" | "position_ai_review";

export type WeatherHistoryFamily = "daily_high" | "hourly_temperature";

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
  notes: string[];
};
