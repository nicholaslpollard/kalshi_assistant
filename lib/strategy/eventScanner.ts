import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import { getNwsForecastFromUrl, getNwsPoint } from "@/lib/weather/nwsClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import type {
  EventForecastSynthesis,
  EventScannerFamily,
  EventScannerMarket,
  EventScannerResult,
  EventScannerScoreBreakdown,
  EventScannerSignal,
} from "@/types/eventScanner";

const HOURLY_TEMPERATURE_SERIES_CONFIG: Record<
  string,
  {
    family: EventScannerFamily;
    marketCode: string;
    displayName: string;
    timezone: string;
    note: string;
  }
> = {
  KXTEMPNYCH: {
    family: "hourly_temperature",
    marketCode: "NYC",
    displayName: "New York, NY hourly temperature",
    timezone: "America/New_York",
    note:
      "Experimental hourly temperature series. Verify the exact Kalshi settlement location and series ticker before relying on this for trading.",
  },
};

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

function getLocalDateFromIso(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

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
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getLocalHourFromIso(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(date);

  const parsed = Number(hour);

  return Number.isFinite(parsed) ? parsed : null;
}

function getForecastDate(period: Record<string, unknown>, timezone: string) {
  const startTime = typeof period.startTime === "string" ? period.startTime : null;

  if (!startTime) {
    return null;
  }

  return getLocalDateFromIso(startTime, timezone);
}

function getForecastHour(period: Record<string, unknown>, timezone: string) {
  const startTime = typeof period.startTime === "string" ? period.startTime : null;

  if (!startTime) {
    return null;
  }

  return getLocalHourFromIso(startTime, timezone);
}

function summarizeNwsDailyForecastForEventDate(
  data: Record<string, unknown>,
  eventDate: string,
  timezone: string
) {
  const properties = data.properties as Record<string, unknown> | undefined;
  const periods = Array.isArray(properties?.periods)
    ? (properties.periods as Record<string, unknown>[])
    : [];

  const matchingPeriods = periods.filter(
    (period) => getForecastDate(period, timezone) === eventDate
  );

  const selected =
    matchingPeriods.find((period) => period.isDaytime === true) ??
    matchingPeriods[0] ??
    periods.find((period) => period.isDaytime === true) ??
    periods[0] ??
    null;

  return {
    temperatureF: toNumber(selected?.temperature),
    periodName: selected?.name ?? null,
    selectedForecastDate: selected ? getForecastDate(selected, timezone) : null,
  };
}

function summarizeNwsHourlyForecastForEventHour(params: {
  data: Record<string, unknown>;
  eventDate: string;
  eventHourLocal: number;
  timezone: string;
}) {
  const { data, eventDate, eventHourLocal, timezone } = params;
  const properties = data.properties as Record<string, unknown> | undefined;
  const periods = Array.isArray(properties?.periods)
    ? (properties.periods as Record<string, unknown>[])
    : [];

  const selected =
    periods.find(
      (period) =>
        getForecastDate(period, timezone) === eventDate &&
        getForecastHour(period, timezone) === eventHourLocal
    ) ?? null;

  return {
    temperatureF: toNumber(selected?.temperature),
    periodName: selected?.name ?? null,
    selectedForecastDate: selected ? getForecastDate(selected, timezone) : null,
    selectedForecastHour: selected ? getForecastHour(selected, timezone) : null,
  };
}

function summarizeOpenMeteo(data: Record<string, unknown>, eventDate: string) {
  const daily = data.daily as Record<string, unknown> | undefined;
  const times = Array.isArray(daily?.time) ? daily.time : [];
  const maxes = Array.isArray(daily?.temperature_2m_max)
    ? daily.temperature_2m_max
    : [];

  const index = times.findIndex((time) => time === eventDate);

  return {
    dailyMaxF: index >= 0 ? toNumber(maxes[index]) : toNumber(maxes[0]),
  };
}

function summarizeOpenMeteoHourly(params: {
  data: Record<string, unknown>;
  eventDate: string;
  eventHourLocal: number;
}) {
  const { data, eventDate, eventHourLocal } = params;
  const hourly = data.hourly as Record<string, unknown> | undefined;
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  const temps = Array.isArray(hourly?.temperature_2m)
    ? hourly.temperature_2m
    : [];

  const eventHourText = `${eventDate}T${String(eventHourLocal).padStart(2, "0")}:00`;
  const index = times.findIndex((time) => time === eventHourText);

  return {
    temperatureF: index >= 0 ? toNumber(temps[index]) : null,
    time: index >= 0 ? String(times[index]) : null,
  };
}

function getBucketRead(tempF: number | null) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  // Kalshi daily high range buckets are midpoint-coded in tickers: B74.5 = 74° to 75°,
  // B80.5 = 80° to 81°, B93.5 = 93° to 94°. Forecast temperatures should be
  // mapped by flooring to the lower bound and adding one degree for the upper bound.
  const lower = Math.floor(tempF);
  const upper = lower + 1;

  return `${lower}° to ${upper}°`;
}


function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getConfidenceLabel(score: number): EventForecastSynthesis["confidenceLabel"] {
  if (score >= 70) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

function getSignalFromScore(score: number): EventScannerSignal {
  if (score >= 65) {
    return "POTENTIAL_ENTRY";
  }

  if (score >= 40) {
    return "WATCH_CLOSELY";
  }

  return "NO_CLEAR_EDGE";
}

function getRangeBucket(label: string | null) {
  if (!label) {
    return null;
  }

  const match = label.match(/(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*(?:to|-)\s*(\d+(?:\.\d+)?)/i);

  if (!match) {
    return null;
  }

  const lower = Number(match[1]);
  const upper = Number(match[2]);

  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return null;
  }

  return {
    lower,
    upper,
    midpoint: (lower + upper) / 2,
  };
}

function getBucketDistance(bucketA: string | null, bucketB: string | null) {
  const parsedA = getRangeBucket(bucketA);
  const parsedB = getRangeBucket(bucketB);

  if (!parsedA || !parsedB) {
    return null;
  }

  return Math.round(Math.abs(parsedA.midpoint - parsedB.midpoint) / 2);
}

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function averageNumbers(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => value !== null && Number.isFinite(value));

  if (numbers.length === 0) {
    return null;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function findForecastFavoriteMarket(params: {
  markets: EventScannerMarket[];
  nwsBucket: string | null;
  openMeteoBucket: string | null;
}) {
  const { markets, nwsBucket, openMeteoBucket } = params;

  if (nwsBucket && openMeteoBucket) {
    const distance = getBucketDistance(nwsBucket, openMeteoBucket);

    if (distance === 0) {
      return findMarketByBucket(markets, nwsBucket);
    }

    if (distance === 1) {
      const nwsRange = getRangeBucket(nwsBucket);
      const openMeteoRange = getRangeBucket(openMeteoBucket);

      if (nwsRange && openMeteoRange) {
        const midpoint = (nwsRange.midpoint + openMeteoRange.midpoint) / 2;
        const sorted = markets
          .map((market) => ({ market, range: getRangeBucket(market.label) }))
          .filter(
            (item): item is { market: EventScannerMarket; range: NonNullable<ReturnType<typeof getRangeBucket>> } =>
              item.range !== null
          )
          .sort(
            (a, b) =>
              Math.abs(a.range.midpoint - midpoint) -
              Math.abs(b.range.midpoint - midpoint)
          );

        return sorted[0]?.market ?? null;
      }
    }

    return null;
  }

  return findMarketByBucket(markets, nwsBucket) ?? findMarketByBucket(markets, openMeteoBucket);
}

function buildForecastSynthesis(params: {
  likelyBucket: string | null;
  scoreBreakdown: EventScannerScoreBreakdown;
  nwsTemperatureF: number | null;
  openMeteoTemperatureF: number | null;
  recentObservedMaxF?: number | null;
  sourceAgreement: EventForecastSynthesis["sourceAgreement"];
  reasoning: string[];
  dataQualityNotes: string[];
}): EventForecastSynthesis {
  const {
    likelyBucket,
    scoreBreakdown,
    nwsTemperatureF,
    openMeteoTemperatureF,
    recentObservedMaxF = null,
    sourceAgreement,
    reasoning,
    dataQualityNotes,
  } = params;

  return {
    predictedHighF: averageNumbers([nwsTemperatureF, openMeteoTemperatureF]),
    likelyBucket,
    alternateBuckets: uniqueStrings([getBucketRead(nwsTemperatureF), getBucketRead(openMeteoTemperatureF)]),
    confidencePercent: scoreBreakdown.total,
    confidenceLabel: getConfidenceLabel(scoreBreakdown.total),
    sourceAgreement,
    uncertaintyF:
      nwsTemperatureF !== null && openMeteoTemperatureF !== null
        ? Math.abs(nwsTemperatureF - openMeteoTemperatureF)
        : null,
    reasoning,
    dataQualityNotes,
    inputs: {
      nwsForecastHighF: nwsTemperatureF,
      openMeteoForecastHighF: openMeteoTemperatureF,
      openMeteoEnsembleMeanHighF: null,
      openMeteoEnsembleSpreadF: null,
      recentObservedMaxF,
    },
  };
}

function pickNumber(market: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(market[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getDailyBucketLabelFromTicker(ticker: string) {
  const match = ticker.match(/-B(\d+(?:\.\d+)?)$/i);

  if (!match) {
    return null;
  }

  const midpoint = Number(match[1]);

  if (!Number.isFinite(midpoint)) {
    return null;
  }

  const lower = Math.floor(midpoint - 0.5);
  const upper = lower + 1;

  return `${lower}° to ${upper}°`;
}

function getMarketLabel(market: Record<string, unknown>) {
  const descriptiveText = [
    market.yes_sub_title,
    market.subtitle,
    market.title,
  ].filter((value): value is string => typeof value === "string");

  for (const text of descriptiveText) {
    const match = text.match(/(\d+)\s*(?:°|degrees?)?\s*(?:to|-)\s*(\d+)/i);

    if (match) {
      return `${match[1]}° to ${match[2]}°`;
    }
  }

  const ticker = typeof market.ticker === "string" ? market.ticker : null;
  const tickerBucket = ticker ? getDailyBucketLabelFromTicker(ticker) : null;

  if (tickerBucket) {
    return tickerBucket;
  }

  const candidateText = ticker ? [...descriptiveText, ticker] : descriptiveText;

  for (const text of candidateText) {
    const aboveMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*(?:or more|or above|above|\+)/i);

    if (aboveMatch) {
      return `${aboveMatch[1]}° or above`;
    }

    const belowMatch = text.match(/(?:under|below|less than|or below).*?(\d+(?:\.\d+)?)/i);

    if (belowMatch) {
      return `${belowMatch[1]}° or below`;
    }
  }

  return candidateText[0] ?? "Unknown basket";
}

function normalizeMarket(market: Record<string, unknown>): EventScannerMarket {
  const ticker = typeof market.ticker === "string" ? market.ticker : "UNKNOWN";
  const yesBid = pickNumber(market, ["yes_bid_dollars", "yes_bid"]);
  const noBid = pickNumber(market, ["no_bid_dollars", "no_bid"]);

  const yesAskEstimate = noBid !== null ? Math.max(0, 1 - noBid) : null;

  const impliedProbability =
    yesBid !== null && yesAskEstimate !== null
      ? (yesBid + yesAskEstimate) / 2
      : yesBid ?? yesAskEstimate;

  return {
    ticker,
    label: getMarketLabel(market),
    yesBid,
    yesAskEstimate,
    noBid,
    impliedProbability,
    volume: pickNumber(market, ["volume", "volume_24h"]),
    openInterest: pickNumber(market, ["open_interest"]),
    status: typeof market.status === "string" ? market.status : null,
  };
}

function findMarketByBucket(markets: EventScannerMarket[], bucket: string | null) {
  if (!bucket) {
    return null;
  }

  return (
    markets.find(
      (market) => market.label.trim().toLowerCase() === bucket.trim().toLowerCase()
    ) ?? null
  );
}

function getMarketFavorite(markets: EventScannerMarket[]) {
  const priced = markets
    .filter((market) => market.impliedProbability !== null)
    .sort(
      (a, b) =>
        (b.impliedProbability ?? 0) - (a.impliedProbability ?? 0)
    );

  return priced[0] ?? null;
}

function parseHourlyEventTicker(eventTicker: string, seriesTicker: string) {
  const escapedSeries = seriesTicker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = eventTicker.match(
    new RegExp(`^${escapedSeries}-(\\d{2})([A-Z]{3})(\\d{2})(\\d{2})$`, "i")
  );

  if (!match) {
    return null;
  }

  const [, yearText, monthTextRaw, dayText, hourText] = match;
  const monthText = monthTextRaw.toUpperCase();

  const monthMap: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  const month = monthMap[monthText];

  if (!month) {
    return null;
  }

  const eventHourLocal = Number(hourText);

  if (!Number.isFinite(eventHourLocal)) {
    return null;
  }

  return {
    eventDate: `20${yearText}-${month}-${dayText}`,
    eventHourLocal,
    eventDateTimeLocalLabel: `20${yearText}-${month}-${dayText} ${String(
      eventHourLocal
    ).padStart(2, "0")}:00 local`,
  };
}

function thresholdFromMarketLabel(label: string) {
  const aboveMatch = label.match(/(\d+)\s*(?:°|degrees?)?\s*(?:or more|or above|above|\+)/i);

  if (aboveMatch) {
    return {
      kind: "above" as const,
      threshold: Number(aboveMatch[1]),
    };
  }

  const belowMatch = label.match(/(?:under|below|less than|or below).*?(\d+)/i);

  if (belowMatch) {
    return {
      kind: "below" as const,
      threshold: Number(belowMatch[1]),
    };
  }

  return null;
}

function findHourlyWeatherFavorite(
  markets: EventScannerMarket[],
  temperatureF: number | null
) {
  if (temperatureF === null || !Number.isFinite(temperatureF)) {
    return null;
  }

  const candidates = markets
    .map((market) => ({
      market,
      threshold: thresholdFromMarketLabel(market.label),
    }))
    .filter(
      (
        item
      ): item is {
        market: EventScannerMarket;
        threshold: { kind: "above" | "below"; threshold: number };
      } => item.threshold !== null && Number.isFinite(item.threshold.threshold)
    );

  const yesLikelyAbove = candidates
    .filter(
      (item) =>
        item.threshold.kind === "above" && temperatureF >= item.threshold.threshold
    )
    .sort((a, b) => b.threshold.threshold - a.threshold.threshold);

  if (yesLikelyAbove[0]) {
    return yesLikelyAbove[0].market;
  }

  const yesLikelyBelow = candidates
    .filter(
      (item) =>
        item.threshold.kind === "below" && temperatureF <= item.threshold.threshold
    )
    .sort((a, b) => a.threshold.threshold - b.threshold.threshold);

  if (yesLikelyBelow[0]) {
    return yesLikelyBelow[0].market;
  }

  return null;
}

function scoreDailyEvent(params: {
  marketFavorite: EventScannerMarket | null;
  weatherFavorite: EventScannerMarket | null;
  nwsBucket: string | null;
  openMeteoBucket: string | null;
  nwsTemperatureF: number | null;
  openMeteoTemperatureF: number | null;
}) {
  const {
    marketFavorite,
    weatherFavorite,
    nwsBucket,
    openMeteoBucket,
    nwsTemperatureF,
    openMeteoTemperatureF,
  } = params;

  const reasons: string[] = [];
  const risks: string[] = [];
  const dataQualityNotes: string[] = [];

  const emptyBreakdown: EventScannerScoreBreakdown = {
    forecastAgreement: 0,
    marketMismatch: 0,
    priceAttractiveness: 0,
    forecastStrength: 0,
    dataQuality: 0,
    total: 0,
  };

  if (!marketFavorite) {
    return {
      score: 0,
      signal: "INSUFFICIENT_DATA" as EventScannerSignal,
      reasons: ["No priced market favorite was found."],
      risks: ["Market data may be missing or illiquid."],
      scoreBreakdown: emptyBreakdown,
      forecastSynthesis: buildForecastSynthesis({
        likelyBucket: null,
        scoreBreakdown: emptyBreakdown,
        nwsTemperatureF,
        openMeteoTemperatureF,
        sourceAgreement: "insufficient",
        reasoning: ["No priced market favorite was found."],
        dataQualityNotes: ["Market pricing data was incomplete."],
      }),
    };
  }

  if (!nwsBucket && !openMeteoBucket) {
    return {
      score: 0,
      signal: "INSUFFICIENT_DATA" as EventScannerSignal,
      reasons: ["No usable forecast bucket was found from NWS or Open-Meteo."],
      risks: ["Forecast data may be unavailable for this event date."],
      scoreBreakdown: emptyBreakdown,
      forecastSynthesis: buildForecastSynthesis({
        likelyBucket: null,
        scoreBreakdown: emptyBreakdown,
        nwsTemperatureF,
        openMeteoTemperatureF,
        sourceAgreement: "insufficient",
        reasoning: ["No usable forecast bucket was found from NWS or Open-Meteo."],
        dataQualityNotes: ["No usable forecast bucket was found."],
      }),
    };
  }

  const bucketDistance = getBucketDistance(nwsBucket, openMeteoBucket);
  const marketDistance = getBucketDistance(weatherFavorite?.label ?? null, marketFavorite.label);
  const sourceCount = [nwsTemperatureF, openMeteoTemperatureF].filter(
    (value) => value !== null && Number.isFinite(value)
  ).length;

  let sourceAgreement: EventForecastSynthesis["sourceAgreement"] = "insufficient";
  let forecastAgreement = 0;

  if (nwsBucket && openMeteoBucket && bucketDistance === 0) {
    sourceAgreement = "strong";
    forecastAgreement = 25;
    reasons.push(`NWS and Open-Meteo agree on forecast bucket ${nwsBucket}.`);
  } else if (nwsBucket && openMeteoBucket && bucketDistance === 1) {
    sourceAgreement = "moderate";
    forecastAgreement = 16;
    reasons.push(`NWS and Open-Meteo are one bucket apart: ${nwsBucket} vs ${openMeteoBucket}.`);
    risks.push("Forecast sources are close, but they do not agree on the exact bucket.");
  } else if (nwsBucket && openMeteoBucket) {
    sourceAgreement = "weak";
    forecastAgreement = 6;
    risks.push(`NWS and Open-Meteo disagree meaningfully. NWS: ${nwsBucket}, Open-Meteo: ${openMeteoBucket}.`);
  } else {
    sourceAgreement = "insufficient";
    forecastAgreement = 8;
    dataQualityNotes.push(
      `Only one forecast bucket is available. NWS: ${nwsBucket ?? "unavailable"}, Open-Meteo: ${openMeteoBucket ?? "unavailable"}.`
    );
  }

  if (weatherFavorite) {
    reasons.push(`Forecast-supported weather basket: ${weatherFavorite.label}.`);
  } else {
    risks.push("No single forecast-supported basket could be selected from the current forecast read.");
  }

  reasons.push(`Market favorite: ${marketFavorite.label}.`);

  let marketMismatch = 0;

  if (weatherFavorite && marketDistance !== null) {
    if (marketDistance >= 4) {
      marketMismatch = 25;
    } else if (marketDistance === 3) {
      marketMismatch = 21;
    } else if (marketDistance === 2) {
      marketMismatch = 15;
    } else if (marketDistance === 1) {
      marketMismatch = 8;
    } else {
      marketMismatch = 0;
    }

    if (marketDistance > 0) {
      reasons.push(
        `Forecast basket is ${marketDistance} bucket${marketDistance === 1 ? "" : "s"} away from the current market favorite.`
      );
    }
  }

  let priceAttractiveness = 0;

  if (weatherFavorite?.yesAskEstimate !== null && weatherFavorite?.yesAskEstimate !== undefined) {
    const ask = weatherFavorite.yesAskEstimate;

    if (ask <= 0.25) {
      priceAttractiveness += 14;
    } else if (ask <= 0.4) {
      priceAttractiveness += 11;
    } else if (ask <= 0.55) {
      priceAttractiveness += 7;
    } else if (ask <= 0.7) {
      priceAttractiveness += 3;
    } else {
      risks.push("Forecast-supported basket may already be expensive.");
    }

    if (ask <= 0.55) {
      reasons.push(`Forecast-supported basket has an estimated YES ask of $${ask.toFixed(2)}.`);
    }
  } else if (weatherFavorite) {
    risks.push("Forecast-supported basket does not have a usable YES ask estimate.");
  }

  if (
    weatherFavorite &&
    weatherFavorite.ticker !== marketFavorite.ticker &&
    weatherFavorite.impliedProbability !== null &&
    marketFavorite.impliedProbability !== null
  ) {
    const gap = marketFavorite.impliedProbability - weatherFavorite.impliedProbability;

    if (gap >= 0.25) {
      priceAttractiveness += 6;
      reasons.push(
        `Forecast basket is priced ${(gap * 100).toFixed(1)} percentage points below the market favorite.`
      );
    } else if (gap >= 0.12) {
      priceAttractiveness += 4;
      reasons.push(
        `Forecast basket is priced ${(gap * 100).toFixed(1)} percentage points below the market favorite.`
      );
    } else if (gap > 0) {
      priceAttractiveness += 2;
      reasons.push("Forecast basket is slightly cheaper than the market favorite.");
    }
  }

  priceAttractiveness = Math.min(20, priceAttractiveness);

  let forecastStrength = 0;
  const temperatureSpread =
    nwsTemperatureF !== null && openMeteoTemperatureF !== null
      ? Math.abs(nwsTemperatureF - openMeteoTemperatureF)
      : null;

  if (temperatureSpread !== null) {
    if (temperatureSpread <= 1) {
      forecastStrength = 15;
      reasons.push("Forecast temperatures are tightly clustered within 1°F.");
    } else if (temperatureSpread <= 2) {
      forecastStrength = 12;
      reasons.push("Forecast temperatures are clustered within 2°F.");
    } else if (temperatureSpread <= 4) {
      forecastStrength = 7;
    } else {
      forecastStrength = 2;
      risks.push("Forecast temperature spread is wide enough to reduce confidence.");
    }
  } else if (sourceCount === 1) {
    forecastStrength = 5;
  }

  let dataQuality = 0;

  if (sourceCount === 2) {
    dataQuality = 15;
  } else if (sourceCount === 1) {
    dataQuality = 7;
  }

  if (sourceCount < 2) {
    dataQualityNotes.push("Only one forecast source produced a usable temperature.");
  }

  if (!weatherFavorite) {
    dataQualityNotes.push("No matched Kalshi basket was selected from the forecast read.");
  }

  const scoreBreakdown: EventScannerScoreBreakdown = {
    forecastAgreement,
    marketMismatch,
    priceAttractiveness,
    forecastStrength,
    dataQuality,
    total: clampScore(
      forecastAgreement +
        marketMismatch +
        priceAttractiveness +
        forecastStrength +
        dataQuality
    ),
  };

  const signal = getSignalFromScore(scoreBreakdown.total);

  return {
    score: scoreBreakdown.total,
    signal,
    reasons,
    risks,
    scoreBreakdown,
    forecastSynthesis: buildForecastSynthesis({
      likelyBucket: weatherFavorite?.label ?? null,
      scoreBreakdown,
      nwsTemperatureF,
      openMeteoTemperatureF,
      sourceAgreement,
      reasoning: reasons,
      dataQualityNotes,
    }),
  };
}

function scoreHourlyEvent(params: {
  marketFavorite: EventScannerMarket | null;
  weatherFavorite: EventScannerMarket | null;
  nwsTemperatureF: number | null;
  openMeteoTemperatureF: number | null;
  weatherAgreement: boolean;
}) {
  const {
    marketFavorite,
    weatherFavorite,
    nwsTemperatureF,
    openMeteoTemperatureF,
    weatherAgreement,
  } = params;

  const reasons: string[] = [];
  const risks: string[] = [];

  let score = 0;
  let signal: EventScannerSignal = "NO_CLEAR_EDGE";

  if (!marketFavorite) {
    return {
      score: 0,
      signal: "INSUFFICIENT_DATA" as EventScannerSignal,
      reasons: ["No priced market favorite was found."],
      risks: ["Market data may be missing or illiquid."],
    };
  }

  if (nwsTemperatureF === null && openMeteoTemperatureF === null) {
    return {
      score: 0,
      signal: "INSUFFICIENT_DATA" as EventScannerSignal,
      reasons: ["No usable hourly temperature was found from NWS or Open-Meteo."],
      risks: ["Hourly weather data may be unavailable for this event hour."],
    };
  }

  if (weatherAgreement) {
    score += 25;
    reasons.push("NWS and Open-Meteo hourly temperatures are within 2°F.");
  } else {
    risks.push("NWS and Open-Meteo hourly temperatures are not tightly aligned.");
  }

  if (weatherFavorite) {
    reasons.push(`Forecast-supported threshold candidate: ${weatherFavorite.label}.`);
  } else {
    risks.push("No threshold contract could be matched to the hourly forecast.");
  }

  reasons.push(`Market favorite: ${marketFavorite.label}.`);

  if (
    weatherFavorite &&
    weatherFavorite.ticker !== marketFavorite.ticker &&
    weatherAgreement
  ) {
    score += 45;
    reasons.push("Hourly forecast supports a threshold that is not the market favorite.");
  }

  if (
    weatherFavorite &&
    weatherFavorite.ticker !== marketFavorite.ticker &&
    weatherFavorite.impliedProbability !== null &&
    marketFavorite.impliedProbability !== null
  ) {
    const gap = marketFavorite.impliedProbability - weatherFavorite.impliedProbability;

    if (gap >= 0.1) {
      score += 25;
      reasons.push(
        `Forecast-supported threshold is priced ${(gap * 100).toFixed(
          1
        )} percentage points below the market favorite.`
      );
    }
  }

  if (weatherFavorite?.yesAskEstimate !== null && weatherFavorite?.yesAskEstimate !== undefined) {
    if (weatherFavorite.yesAskEstimate <= 0.45) {
      score += 10;
      reasons.push("Forecast-supported threshold has an estimated YES ask at or below $0.45.");
    } else if (weatherFavorite.yesAskEstimate >= 0.75) {
      risks.push("Forecast-supported threshold may already be expensive.");
    }
  }

  if (score >= 70) {
    signal = "POTENTIAL_ENTRY";
  } else if (score >= 35) {
    signal = "WATCH_CLOSELY";
  } else {
    signal = "NO_CLEAR_EDGE";
  }

  return {
    score,
    signal,
    reasons,
    risks,
  };
}

async function scanDailyHighEvent(
  event: Record<string, unknown>,
  seriesTicker: string,
  eventTicker: string,
  markets: EventScannerMarket[]
): Promise<EventScannerResult | null> {
  const parsed = parseWeatherTicker(`${eventTicker}-B0`);
  const marketCode = parsed.marketCode;
  const eventDate = parsed.eventDate;

  if (!marketCode || !eventDate) {
    return null;
  }

  const config = WEATHER_MARKETS[marketCode];

  if (!config) {
    return null;
  }

  const [point, openMeteo] = await Promise.all([
    getNwsPoint(config.latitude, config.longitude),
    getOpenMeteoForecast({
      latitude: config.latitude,
      longitude: config.longitude,
      timezone: config.timezone,
      startDate: eventDate,
      endDate: eventDate,
    }),
  ]);

  const pointProperties = point.properties as Record<string, unknown> | undefined;
  const forecastUrl =
    typeof pointProperties?.forecast === "string" ? pointProperties.forecast : null;

  const nwsForecast = forecastUrl ? await getNwsForecastFromUrl(forecastUrl) : null;

  const nwsSummary = nwsForecast
    ? summarizeNwsDailyForecastForEventDate(
        nwsForecast,
        eventDate,
        config.timezone
      )
    : { temperatureF: null, periodName: null, selectedForecastDate: null };

  const openMeteoSummary = summarizeOpenMeteo(openMeteo, eventDate);

  const nwsBucket = getBucketRead(nwsSummary.temperatureF);
  const openMeteoBucket = getBucketRead(openMeteoSummary.dailyMaxF);
  const weatherAgreement =
    Boolean(nwsBucket && openMeteoBucket && nwsBucket === openMeteoBucket);

  const marketFavorite = getMarketFavorite(markets);
  const weatherFavorite = findForecastFavoriteMarket({
    markets,
    nwsBucket,
    openMeteoBucket,
  });

  const scored = scoreDailyEvent({
    marketFavorite,
    weatherFavorite,
    nwsBucket,
    openMeteoBucket,
    nwsTemperatureF: nwsSummary.temperatureF,
    openMeteoTemperatureF: openMeteoSummary.dailyMaxF,
  });

  const title =
    typeof event.title === "string"
      ? event.title
      : `${config.displayName} high temperature ${eventDate}`;

  return {
    family: "daily_high",
    eventTicker,
    seriesTicker,
    marketCode,
    locationName: config.displayName,
    eventDate,
    eventHourLocal: null,
    eventDateTimeLocalLabel: null,
    title,
    signal: scored.signal,
    score: scored.score,
    scoreBreakdown: scored.scoreBreakdown,
    forecastSynthesis: scored.forecastSynthesis,
    summary:
      scored.signal === "POTENTIAL_ENTRY"
        ? "Forecast-supported entry candidate based on weather-market disagreement."
        : scored.signal === "WATCH_CLOSELY"
          ? "Forecast data supports a basket worth watching, but pricing may not be attractive enough yet."
          : scored.signal === "INSUFFICIENT_DATA"
            ? "Insufficient forecast data to score this event."
            : "No clear event edge from the current forecast read.",
    reasons: scored.reasons,
    risks: scored.risks,
    marketFavorite,
    weatherFavorite,
    markets,
    weather: {
      heldOrFavoriteBucket: marketFavorite?.label ?? null,
      nwsBucket,
      openMeteoBucket,
      nwsTemperatureF: nwsSummary.temperatureF,
      openMeteoTemperatureF: openMeteoSummary.dailyMaxF,
      hourlyTemperatureF: null,
      hourlyThresholdCandidate: null,
      weatherAgreement,
    },
    matchingPosition: null,
    rawEvent: event,
  };
}

async function scanHourlyTemperatureEvent(
  event: Record<string, unknown>,
  seriesTicker: string,
  eventTicker: string,
  markets: EventScannerMarket[]
): Promise<EventScannerResult | null> {
  const hourlyConfig = HOURLY_TEMPERATURE_SERIES_CONFIG[seriesTicker];

  if (!hourlyConfig) {
    return null;
  }

  const parsedHourly = parseHourlyEventTicker(eventTicker, seriesTicker);

  if (!parsedHourly) {
    return null;
  }

  const config = WEATHER_MARKETS[hourlyConfig.marketCode];

  if (!config) {
    return null;
  }

  const eventDate = parsedHourly.eventDate;
  const eventHourLocal = parsedHourly.eventHourLocal;

  const [point, openMeteo] = await Promise.all([
    getNwsPoint(config.latitude, config.longitude),
    getOpenMeteoForecast({
      latitude: config.latitude,
      longitude: config.longitude,
      timezone: config.timezone,
      startDate: eventDate,
      endDate: eventDate,
    }),
  ]);

  const pointProperties = point.properties as Record<string, unknown> | undefined;
  const hourlyForecastUrl =
    typeof pointProperties?.forecastHourly === "string"
      ? pointProperties.forecastHourly
      : null;

  const nwsHourlyForecast = hourlyForecastUrl
    ? await getNwsForecastFromUrl(hourlyForecastUrl)
    : null;

  const nwsHourlySummary = nwsHourlyForecast
    ? summarizeNwsHourlyForecastForEventHour({
        data: nwsHourlyForecast,
        eventDate,
        eventHourLocal,
        timezone: config.timezone,
      })
    : {
        temperatureF: null,
        periodName: null,
        selectedForecastDate: null,
        selectedForecastHour: null,
      };

  const openMeteoHourlySummary = summarizeOpenMeteoHourly({
    data: openMeteo,
    eventDate,
    eventHourLocal,
  });

  const availableTemperatures = [
    nwsHourlySummary.temperatureF,
    openMeteoHourlySummary.temperatureF,
  ].filter((value): value is number => value !== null);

  const blendedHourlyTemperatureF =
    availableTemperatures.length > 0
      ? availableTemperatures.reduce((sum, value) => sum + value, 0) /
        availableTemperatures.length
      : null;

  const weatherAgreement =
    nwsHourlySummary.temperatureF !== null &&
    openMeteoHourlySummary.temperatureF !== null
      ? Math.abs(
          nwsHourlySummary.temperatureF - openMeteoHourlySummary.temperatureF
        ) <= 2
      : false;

  const marketFavorite = getMarketFavorite(markets);
  const weatherFavorite = findHourlyWeatherFavorite(
    markets,
    blendedHourlyTemperatureF
  );

  const scored = scoreHourlyEvent({
    marketFavorite,
    weatherFavorite,
    nwsTemperatureF: nwsHourlySummary.temperatureF,
    openMeteoTemperatureF: openMeteoHourlySummary.temperatureF,
    weatherAgreement,
  });

  const title =
    typeof event.title === "string"
      ? event.title
      : `${hourlyConfig.displayName} ${parsedHourly.eventDateTimeLocalLabel}`;

  return {
    family: "hourly_temperature",
    eventTicker,
    seriesTicker,
    marketCode: hourlyConfig.marketCode,
    locationName: hourlyConfig.displayName,
    eventDate,
    eventHourLocal,
    eventDateTimeLocalLabel: parsedHourly.eventDateTimeLocalLabel,
    title,
    signal: scored.signal,
    score: scored.score,
    scoreBreakdown: null,
    forecastSynthesis: null,
    summary:
      scored.signal === "POTENTIAL_ENTRY"
        ? "Possible hourly entry candidate based on forecast-threshold disagreement."
        : scored.signal === "WATCH_CLOSELY"
          ? "Hourly event is worth watching, but not a strong entry candidate yet."
          : scored.signal === "INSUFFICIENT_DATA"
            ? "Insufficient hourly data to score this event."
            : "No clear hourly event edge from the current read.",
    reasons: [...scored.reasons, hourlyConfig.note],
    risks: scored.risks,
    marketFavorite,
    weatherFavorite,
    markets,
    weather: {
      heldOrFavoriteBucket: marketFavorite?.label ?? null,
      nwsBucket: null,
      openMeteoBucket: null,
      nwsTemperatureF: nwsHourlySummary.temperatureF,
      openMeteoTemperatureF: openMeteoHourlySummary.temperatureF,
      hourlyTemperatureF: blendedHourlyTemperatureF,
      hourlyThresholdCandidate: weatherFavorite?.label ?? null,
      weatherAgreement,
    },
    matchingPosition: null,
    rawEvent: event,
  };
}

export async function scanKalshiWeatherEvent(
  event: Record<string, unknown>,
  seriesTicker: string
): Promise<EventScannerResult | null> {
  const eventTicker =
    typeof event.event_ticker === "string"
      ? event.event_ticker
      : typeof event.ticker === "string"
        ? event.ticker
        : null;

  if (!eventTicker) {
    return null;
  }

  const markets = Array.isArray(event.markets)
    ? event.markets
        .filter(
          (market): market is Record<string, unknown> =>
            typeof market === "object" && market !== null && !Array.isArray(market)
        )
        .map(normalizeMarket)
    : [];

  if (markets.length === 0) {
    return null;
  }

  if (HOURLY_TEMPERATURE_SERIES_CONFIG[seriesTicker]) {
    return scanHourlyTemperatureEvent(event, seriesTicker, eventTicker, markets);
  }

  return scanDailyHighEvent(event, seriesTicker, eventTicker, markets);
}
