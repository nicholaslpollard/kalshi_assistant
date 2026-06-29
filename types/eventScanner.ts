export type EventScannerSignal =
  | "POTENTIAL_ENTRY"
  | "WATCH_CLOSELY"
  | "NO_CLEAR_EDGE"
  | "INSUFFICIENT_DATA";

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
  rawEvent?: Record<string, unknown>;
};

export type EventScannerResponse = {
  ok: boolean;
  generatedAt: string;
  results: EventScannerResult[];
  diagnostics: {
    scannedSeries: string[];
    eventCount: number;
    resultCount: number;
    errors: string[];
  };
};