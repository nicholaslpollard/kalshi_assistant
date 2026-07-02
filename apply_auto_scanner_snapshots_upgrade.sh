#!/usr/bin/env bash
set -euo pipefail

python - <<'PY'
from pathlib import Path

root = Path('.')

# 1) Extend WeatherHistorySourceType so normal scanner runs can save lightweight snapshots.
types_path = root / 'types' / 'weatherHistory.ts'
if types_path.exists():
    text = types_path.read_text()
    old = 'export type WeatherHistorySourceType = "event_ai_review" | "position_ai_review";'
    new = 'export type WeatherHistorySourceType = "event_ai_review" | "position_ai_review" | "event_scanner";'
    if old in text:
        text = text.replace(old, new)
    elif 'export type WeatherHistorySourceType' in text and '"event_scanner"' not in text:
        text = text.replace('"position_ai_review"', '"position_ai_review" | "event_scanner"', 1)
    types_path.write_text(text)
else:
    raise SystemExit('types/weatherHistory.ts not found')

# 2) Patch the scanner API route to save top scanner result snapshots automatically.
route_path = root / 'app' / 'api' / 'events' / 'scanner' / 'route.ts'
if not route_path.exists():
    raise SystemExit('app/api/events/scanner/route.ts not found')

text = route_path.read_text()

if 'saveWeatherForecastSnapshot' not in text:
    anchor = 'import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";\n'
    replacement = anchor + 'import { saveWeatherForecastSnapshot } from "@/lib/data/weatherHistoryRepository";\n'
    if anchor not in text:
        raise SystemExit('Could not find credentialRepository import anchor in scanner route')
    text = text.replace(anchor, replacement, 1)

helper_marker = 'const SCANNER_AUTO_SNAPSHOT_LIMIT = 12;'
if helper_marker not in text:
    helper_code = r'''
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
'''
    insert_before = 'export async function GET(request: Request) {'
    if insert_before not in text:
        raise SystemExit('Could not find GET export anchor in scanner route')
    text = text.replace(insert_before, helper_code + '\n' + insert_before, 1)

snapshot_call_marker = 'await saveScannerForecastSnapshots(user.uid, results);'
if snapshot_call_marker not in text:
    anchor = '''    const matchingPositionCount = results.filter(
      (result) => result.matchingPosition !== null
    ).length;

'''
    insertion = anchor + '''    if (shouldAutoCaptureScannerSnapshots(request)) {
      try {
        await saveScannerForecastSnapshots(user.uid, results);
      } catch (snapshotError) {
        console.error("Failed to save automatic scanner forecast snapshots:", snapshotError);
      }
    }

'''
    if anchor not in text:
        raise SystemExit('Could not find matchingPositionCount anchor in scanner route')
    text = text.replace(anchor, insertion, 1)

route_path.write_text(text)
print('Applied automatic scanner snapshot capture update.')
PY
