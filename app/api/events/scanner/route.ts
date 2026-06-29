import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
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

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
    const today = getTodayIsoDate();
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
