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

export type EventScannerWeatherRead = {
  heldOrFavoriteBucket: string | null;
  nwsBucket: string | null;
  openMeteoBucket: string | null;
  nwsTemperatureF: number | null;
  openMeteoTemperatureF: number | null;
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

export type EventScannerResult = {
  eventTicker: string;
  seriesTicker: string;
  marketCode: string | null;
  locationName: string | null;
  eventDate: string | null;
  title: string;
  signal: EventScannerSignal;
  score: number;
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