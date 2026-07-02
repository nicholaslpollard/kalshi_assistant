import type { WeatherHistoryFamily, WeatherLeadTimeBucket } from "@/types/weatherHistory";

export type TrackedWeatherEventStatus = "tracking" | "resolved" | "needs_review" | "error";

export type TrackedWeatherEventInput = {
  sourceSnapshotId?: string | null;
  sourceType?: string | null;
  eventTicker?: string | null;
  seriesTicker?: string | null;
  positionTicker?: string | null;
  marketCode?: string | null;
  stationId: string;
  stationName?: string | null;
  eventDate: string;
  eventFamily?: WeatherHistoryFamily | null;
  eventHourLocal?: number | null;
  candidateBucket?: string | null;
  candidateBucketCode?: string | null;
  marketTicker?: string | null;
  leadTimeHours?: number | null;
  leadTimeBucket?: WeatherLeadTimeBucket | null;
  targetPeakHourLocal?: number | null;
  temporalContextLabel?: string | null;
};

export type TrackedWeatherEventDocument = {
  id?: string;
  createdAt: unknown;
  updatedAt: unknown;
  lastCheckedAt: unknown | null;
  resolvedAt: unknown | null;
  sourceSnapshotIds: string[];
  sourceTypes: string[];
  eventTicker: string | null;
  seriesTicker: string | null;
  positionTicker: string | null;
  marketCode: string | null;
  stationId: string;
  stationName: string | null;
  eventDate: string;
  eventFamily: WeatherHistoryFamily;
  eventHourLocal: number | null;
  candidateBucket: string | null;
  candidateBucketCode: string | null;
  marketTicker: string | null;
  status: TrackedWeatherEventStatus;
  actualHighF: number | null;
  actualTemperatureF: number | null;
  resolvedBucket: string | null;
  resolvedBucketCode: string | null;
  observationCount: number;
  resolverNotes: string[];
  errorMessage: string | null;
};

export type TrackedWeatherResolveSummary = {
  checked: number;
  resolved: number;
  needsReview: number;
  errors: number;
  skipped: number;
  results: Array<{
    id: string;
    status: TrackedWeatherEventStatus;
    stationId: string;
    eventDate: string;
    eventFamily: WeatherHistoryFamily;
    resolvedBucket: string | null;
    actualHighF: number | null;
    actualTemperatureF: number | null;
    notes: string[];
    errorMessage?: string | null;
  }>;
};
