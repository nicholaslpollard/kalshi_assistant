import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import { saveWeatherForecastSnapshot } from "@/lib/data/weatherHistoryRepository";
import {
  getKalshiEventsBySeriesList,
  getKalshiPositions,
  type KalshiMarketPosition,
} from "@/lib/kalshi/client";
import { scanKalshiWeatherEvent } from "@/lib/strategy/eventScanner";
import type {
  EventScannerMatchingPosition,
  EventScannerResponse,
  EventScannerResult,
  EventScannerScope,
} from "@/types/eventScanner";
import { NextResponse } from "next/server";

const HIGH_TEMP_SERIES = [
  "KXHIGHCHI",
  "KXHIGHDCA",
  "KXHIGHNYC",
  "KXHIGHAUS",
  "KXHIGHMIA",
  "KXHIGHLAX",
  "KXHIGHPHL",
  "KXHIGHBOS",
  "KXHIGHATL",
  "KXHIGHDEN",
];

const HOURLY_TEMP_SERIES = [
  // Experimental hourly temperature series. Verify through live Kalshi API output.
  "KXTEMPNYCH",
];

const SCANNER_SERIES = [...HIGH_TEMP_SERIES, ...HOURLY_TEMP_SERIES];

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

const SCANNER_DATE_TIMEZONE = "America/New_York";

function getIsoDateInTimezone(date: Date, timezone: string) {
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
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function getTodayIsoDate(timezone = SCANNER_DATE_TIMEZONE) {
  return getIsoDateInTimezone(new Date(), timezone);
}

function addDaysIsoDate(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getScopeFromRequest(request: Request): EventScannerScope {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");

  if (
    scope === "today" ||
    scope === "tomorrow" ||
    scope === "today_tomorrow" ||
    scope === "all"
  ) {
    return scope;
  }

  return "today_tomorrow";
}

function eventMatchesScope(params: {
  eventDate: string | null;
  scope: EventScannerScope;
  today: string;
  tomorrow: string;
}) {
  const { eventDate, scope, today, tomorrow } = params;

  if (scope === "all") {
    return true;
  }

  if (!eventDate) {
    return false;
  }

  if (scope === "today") {
    return eventDate === today;
  }

  if (scope === "tomorrow") {
    return eventDate === tomorrow;
  }

  return eventDate === today || eventDate === tomorrow;
}

function normalizeMatchingPosition(
  position: KalshiMarketPosition
): EventScannerMatchingPosition {
  const yesCount = toNumber(position.yes_count);
  const noCount = toNumber(position.no_count);
  const positionFp = toNumber(position.position_fp);
  const legacyPosition = toNumber(position.position);

  let side: EventScannerMatchingPosition["side"] = "unknown";
  let contractCount: number | null = null;

  if (yesCount !== null && yesCount > 0) {
    side = "yes";
    contractCount = yesCount;
  } else if (noCount !== null && noCount > 0) {
    side = "no";
    contractCount = noCount;
  } else if (positionFp !== null && positionFp > 0) {
    side = "yes";
    contractCount = positionFp;
  } else if (positionFp !== null && positionFp < 0) {
    side = "no";
    contractCount = Math.abs(positionFp);
  } else if (legacyPosition !== null && legacyPosition > 0) {
    side = "yes";
    contractCount = legacyPosition;
  } else if (legacyPosition !== null && legacyPosition < 0) {
    side = "no";
    contractCount = Math.abs(legacyPosition);
  } else {
    side = "flat";
    contractCount = 0;
  }

  return {
    ticker: position.ticker,
    side,
    contractCount,
    positionFp,
  };
}

function buildPositionMap(positions: KalshiMarketPosition[]) {
  const map = new Map<string, EventScannerMatchingPosition>();

  for (const position of positions) {
    if (!position.ticker) {
      continue;
    }

    const normalized = normalizeMatchingPosition(position);

    if (normalized.side === "flat") {
      continue;
    }

    map.set(position.ticker, normalized);
  }

  return map;
}

function attachMatchingPosition(
  result: EventScannerResult,
  positionMap: Map<string, EventScannerMatchingPosition>
): EventScannerResult {
  const matchingMarket = result.markets.find((market) =>
    positionMap.has(market.ticker)
  );

  if (!matchingMarket) {
    return {
      ...result,
      matchingPosition: null,
    };
  }

  return {
    ...result,
    matchingPosition: positionMap.get(matchingMarket.ticker) ?? null,
  };
}


const SCANNER_AUTO_SNAPSHOT_LIMIT = 12;

const SCANNER_STATION_BY_SERIES: Record<
  string,
  { id: string; name: string; timezone: string; targetPeakHourLocal: number }
> = {
  KXHIGHCHI: {
    id: "KORD",
    name: "Chicago O'Hare International Airport",
    timezone: "America/Chicago",
    targetPeakHourLocal: 16,
  },
  KXHIGHDCA: {
    id: "KDCA",
    name: "Washington/Reagan National Airport",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
  KXHIGHNYC: {
    id: "KNYC",
    name: "New York City/Central Park",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
  KXHIGHAUS: {
    id: "KAUS",
    name: "Austin-Bergstrom International Airport",
    timezone: "America/Chicago",
    targetPeakHourLocal: 16,
  },
  KXHIGHMIA: {
    id: "KMIA",
    name: "Miami International Airport",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
  KXHIGHLAX: {
    id: "KLAX",
    name: "Los Angeles International Airport",
    timezone: "America/Los_Angeles",
    targetPeakHourLocal: 16,
  },
  KXHIGHPHL: {
    id: "KPHL",
    name: "Philadelphia International Airport",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
  KXHIGHBOS: {
    id: "KBOS",
    name: "Boston Logan International Airport",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
  KXHIGHATL: {
    id: "KATL",
    name: "Atlanta Hartsfield-Jackson International Airport",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
  KXHIGHDEN: {
    id: "KDEN",
    name: "Denver International Airport",
    timezone: "America/Denver",
    targetPeakHourLocal: 16,
  },
  KXTEMPNYCH: {
    id: "KNYC",
    name: "New York City/Central Park",
    timezone: "America/New_York",
    targetPeakHourLocal: 16,
  },
};

type ScannerConsensusWeight =
  | "very_high"
  | "high"
  | "medium_high"
  | "medium"
  | "low"
  | "context";

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function scannerBucketFromTemperatureF(value: number | null) {
  if (value === null) return null;
  const lower = Math.floor(value);
  return `${lower}° to ${lower + 1}°`;
}

function getScannerStationMetadata(result: EventScannerResult) {
  const station = SCANNER_STATION_BY_SERIES[result.seriesTicker];

  if (!station || !result.eventDate) {
    return null;
  }

  return station;
}

function buildScannerModelConsensus(result: EventScannerResult) {
  const inputs = result.forecastSynthesis?.inputs;
  const rows: Array<{
    source: string;
    forecastHighF: number | null;
    bucket: string | null;
    weight: ScannerConsensusWeight;
    notes: string;
  }> = [];

  const addRow = (params: {
    source: string;
    forecastHighF: number | null;
    bucket: string | null;
    weight: ScannerConsensusWeight;
    notes: string;
  }) => {
    if (params.forecastHighF === null && !params.bucket) return;
    rows.push(params);
  };

  const nwsHigh = numberOrNull(
    result.weather.nwsTemperatureF ?? inputs?.nwsForecastHighF
  );
  addRow({
    source: "NWS",
    forecastHighF: nwsHigh,
    bucket: result.weather.nwsBucket ?? scannerBucketFromTemperatureF(nwsHigh),
    weight: result.family === "daily_high" ? "high" : "medium_high",
    notes: "Scanner-captured official NWS forecast read.",
  });

  const openMeteoHigh = numberOrNull(
    result.weather.openMeteoTemperatureF ?? inputs?.openMeteoForecastHighF
  );
  addRow({
    source: "Open-Meteo",
    forecastHighF: openMeteoHigh,
    bucket: result.weather.openMeteoBucket ?? scannerBucketFromTemperatureF(openMeteoHigh),
    weight: "medium_high",
    notes: "Scanner-captured Open-Meteo forecast read.",
  });

  const ensembleMean = numberOrNull(inputs?.openMeteoEnsembleMeanHighF);
  addRow({
    source: "Open-Meteo ensemble mean",
    forecastHighF: ensembleMean,
    bucket: scannerBucketFromTemperatureF(ensembleMean),
    weight: "medium",
    notes: inputs?.openMeteoEnsembleSpreadF !== null && inputs?.openMeteoEnsembleSpreadF !== undefined
      ? `Ensemble spread near ${inputs.openMeteoEnsembleSpreadF}°F.`
      : "Scanner-captured ensemble mean read.",
  });

  const consensusHigh = numberOrNull(result.forecastSynthesis?.predictedHighF);
  addRow({
    source: "Scanner weighted consensus",
    forecastHighF: consensusHigh,
    bucket: result.forecastSynthesis?.likelyBucket ?? scannerBucketFromTemperatureF(consensusHigh),
    weight: "context",
    notes: result.forecastSynthesis?.sourceAgreement
      ? `App scanner consensus with ${result.forecastSynthesis.sourceAgreement} source agreement.`
      : "App scanner consensus read.",
  });

  return rows;
}

function buildScannerBucketProbabilities(result: EventScannerResult) {
  const likelyBucket = result.forecastSynthesis?.likelyBucket ?? result.weatherFavorite?.label ?? null;
  const alternateBuckets = result.forecastSynthesis?.alternateBuckets ?? [];
  const confidence = numberOrNull(result.forecastSynthesis?.confidencePercent) ?? result.score;
  const fairValueEstimate = Math.min(99, Math.max(1, Math.round(confidence)));

  const rows: Array<{
    bucket: string;
    probabilityPercent: number;
    fairValueEstimate: number | null;
    reasoning: string;
  }> = [];

  if (likelyBucket) {
    rows.push({
      bucket: likelyBucket,
      probabilityPercent: fairValueEstimate,
      fairValueEstimate,
      reasoning: "Top scanner-captured forecast bucket from deterministic scan.",
    });
  }

  for (const [index, bucket] of alternateBuckets.slice(0, 3).entries()) {
    if (!bucket || bucket === likelyBucket) continue;
    const probabilityPercent = Math.max(5, Math.round(fairValueEstimate * (0.55 - index * 0.12)));
    rows.push({
      bucket,
      probabilityPercent,
      fairValueEstimate: probabilityPercent,
      reasoning: "Alternate scanner-captured bucket from forecast spread/neighbor risk.",
    });
  }

  return rows;
}

function buildScannerObservationTriggers(result: EventScannerResult) {
  const triggers: Array<{
    trigger: string;
    action: string;
    urgency: "low" | "medium" | "high";
  }> = [];

  if (result.family === "daily_high") {
    triggers.push({
      trigger: "New official station observation changes the observed high or reaches the next adjacent bucket.",
      action: "Re-run the scanner or AI review and reassess hold/entry/hedge logic.",
      urgency: result.eventDate === getTodayIsoDate() ? "high" : "medium",
    });
  } else {
    triggers.push({
      trigger: "Target hourly temperature window approaches or latest observation moves through the threshold.",
      action: "Re-check threshold distance and market pricing before entering.",
      urgency: "high",
    });
  }

  if (result.risks.length) {
    triggers.push({
      trigger: result.risks[0],
      action: "Treat this as the primary risk to the scanner thesis.",
      urgency: "medium",
    });
  }

  return triggers;
}

function buildScannerWeatherEvidence(result: EventScannerResult) {
  const station = getScannerStationMetadata(result);
  const targetPeakHourLocal = result.family === "hourly_temperature"
    ? result.eventHourLocal ?? station?.targetPeakHourLocal ?? null
    : station?.targetPeakHourLocal ?? 16;

  return {
    station: {
      id: station?.id ?? result.seriesTicker,
      name: station?.name ?? result.locationName,
      timezone: station?.timezone ?? "America/New_York",
      latitude: null,
      longitude: null,
    },
    event: {
      family: result.family,
      date: result.eventDate,
      localNow: new Date().toISOString(),
      eventHourLocal: result.eventHourLocal,
      targetPeakHourLocal,
      settlementAnchor: "official_station_observation",
    },
    decisionSupport: {
      modelConsensus: buildScannerModelConsensus(result),
      bucketProbabilities: buildScannerBucketProbabilities(result),
      observationTriggers: buildScannerObservationTriggers(result),
      settlementClock: {
        localTimeNow: new Date().toISOString(),
        remainingHeatingWindow: result.eventDate === getTodayIsoDate()
          ? "Same-day scanner snapshot; official observations should dominate as peak heating approaches."
          : "Future scanner snapshot; model agreement and lead-time bias should dominate until same-day observations exist.",
        peakHeatingPassed: null,
        settlementTimingRead: result.eventDateTimeLocalLabel ?? "Scanner snapshot timing unavailable.",
      },
      forecastChangeRead: result.forecastSynthesis?.reasoning?.[0] ?? result.summary,
    },
    reasoning: {
      summary: result.summary,
      supportiveFactors: result.reasons,
      limitingFactors: result.risks,
      watchTriggers: buildScannerObservationTriggers(result).map((trigger) => trigger.trigger),
      invalidationSignals: result.risks,
    },
    scannerContext: {
      signal: result.signal,
      score: result.score,
      scoreBreakdown: result.scoreBreakdown,
      marketFavorite: result.marketFavorite,
      weatherFavorite: result.weatherFavorite,
      matchingPosition: result.matchingPosition,
    },
  };
}

function shouldAutoCaptureScannerSnapshots(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("track") !== "0";
}

async function saveScannerForecastSnapshots(uid: string, results: EventScannerResult[]) {
  const candidates = results
    .filter((result) => result.eventDate)
    .filter((result) => getScannerStationMetadata(result) !== null)
    .filter(
      (result) =>
        result.signal === "POTENTIAL_ENTRY" ||
        result.signal === "WATCH_CLOSELY" ||
        result.matchingPosition !== null ||
        result.score >= 45
    )
    .slice(0, SCANNER_AUTO_SNAPSHOT_LIMIT);

  if (!candidates.length) {
    return 0;
  }

  const saved = await Promise.allSettled(
    candidates.map((result) => {
      const station = getScannerStationMetadata(result);
      const weatherEvidence = buildScannerWeatherEvidence(result);

      return saveWeatherForecastSnapshot(uid, {
        sourceType: "event_scanner",
        eventTicker: result.eventTicker,
        seriesTicker: result.seriesTicker,
        positionTicker: result.matchingPosition?.ticker ?? null,
        marketCode: result.marketCode,
        stationId: station?.id ?? null,
        stationName: station?.name ?? result.locationName,
        eventDate: result.eventDate,
        eventFamily: result.family,
        eventHourLocal: result.eventHourLocal,
        targetPeakHourLocal:
          result.family === "hourly_temperature"
            ? result.eventHourLocal ?? station?.targetPeakHourLocal ?? null
            : station?.targetPeakHourLocal ?? 16,
        weatherEvidence,
        aiReview: {
          summary: result.summary,
          action: result.signal,
          confidence: result.forecastSynthesis?.confidenceLabel ?? null,
          independentForecast: {
            predictedHighF: result.forecastSynthesis?.predictedHighF ?? null,
            mostLikelyBucket: result.forecastSynthesis?.likelyBucket ?? null,
            secondMostLikelyBucket: result.forecastSynthesis?.alternateBuckets?.[0] ?? null,
            confidencePercent: result.forecastSynthesis?.confidencePercent ?? null,
            reasoning: result.forecastSynthesis?.reasoning?.join(" ") ?? result.summary,
          },
        },
      });
    })
  );

  return saved.filter((result) => result.status === "fulfilled").length;
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getDecryptedKalshiCredentials(user.uid);

    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "Kalshi credentials are not saved. Add them under Settings → Credentials.",
        },
        { status: 400 }
      );
    }

    const scope = getScopeFromRequest(request);
    const today = getTodayIsoDate(SCANNER_DATE_TIMEZONE);
    const tomorrow = addDaysIsoDate(today, 1);

    const [seriesResults, positionsResult] = await Promise.all([
      getKalshiEventsBySeriesList(SCANNER_SERIES, credentials),
      getKalshiPositions(credentials),
    ]);

    const positionMap = buildPositionMap(
      positionsResult.ok ? positionsResult.data?.market_positions ?? [] : []
    );

    const errors: string[] = [];

    if (!positionsResult.ok) {
      errors.push(
        `positions: ${positionsResult.status} ${positionsResult.statusText}`
      );
    }

    const scanJobs: Array<
      Promise<Awaited<ReturnType<typeof scanKalshiWeatherEvent>>>
    > = [];

    for (const seriesResult of seriesResults) {
      if (!seriesResult.result.ok) {
        errors.push(
          `${seriesResult.seriesTicker}: ${seriesResult.result.status} ${seriesResult.result.statusText}`
        );
        continue;
      }

      const events = seriesResult.result.data?.events ?? [];

      for (const event of events) {
        scanJobs.push(scanKalshiWeatherEvent(event, seriesResult.seriesTicker));
      }
    }

    const scanned = await Promise.all(scanJobs);

    const unfilteredResults = scanned
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .map((result) => attachMatchingPosition(result, positionMap))
      .sort((a, b) => b.score - a.score);

    const results = unfilteredResults.filter((result) =>
      eventMatchesScope({
        eventDate: result.eventDate,
        scope,
        today,
        tomorrow,
      })
    );

    const matchingPositionCount = results.filter(
      (result) => result.matchingPosition !== null
    ).length;

    if (shouldAutoCaptureScannerSnapshots(request)) {
      try {
        await saveScannerForecastSnapshots(user.uid, results);
      } catch (snapshotError) {
        console.error("Failed to save automatic scanner forecast snapshots:", snapshotError);
      }
    }

    const response: EventScannerResponse = {
      ok: true,
      generatedAt: new Date().toISOString(),
      scope,
      today,
      tomorrow,
      results,
      diagnostics: {
        scannedSeries: SCANNER_SERIES,
        eventCount: scanJobs.length,
        resultCount: results.length,
        filteredOutByScope: unfilteredResults.length - results.length,
        matchingPositionCount,
        dateTimezone: SCANNER_DATE_TIMEZONE,
        errors,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Event scanner failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown event scanner error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
