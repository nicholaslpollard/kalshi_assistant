import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import { getNwsForecastFromUrl, getNwsPoint } from "@/lib/weather/nwsClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import type {
  EventScannerFamily,
  EventScannerMarket,
  EventScannerResult,
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

  const rounded = Math.round(tempF);
  const lower = rounded % 2 === 0 ? rounded : rounded - 1;
  const upper = lower + 1;

  return `${lower}° to ${upper}°`;
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
  weatherAgreement: boolean;
}) {
  const {
    marketFavorite,
    weatherFavorite,
    nwsBucket,
    openMeteoBucket,
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

  if (!nwsBucket && !openMeteoBucket) {
    return {
      score: 0,
      signal: "INSUFFICIENT_DATA" as EventScannerSignal,
      reasons: ["No usable forecast bucket was found from NWS or Open-Meteo."],
      risks: ["Forecast data may be unavailable for this event date."],
    };
  }

  if (weatherAgreement && nwsBucket) {
    score += 35;
    reasons.push(`NWS and Open-Meteo agree on forecast bucket ${nwsBucket}.`);
  } else if (nwsBucket || openMeteoBucket) {
    score += 10;
    risks.push(
      `NWS and Open-Meteo do not fully agree. NWS: ${
        nwsBucket ?? "unavailable"
      }, Open-Meteo: ${openMeteoBucket ?? "unavailable"}.`
    );
  }

  if (weatherFavorite) {
    reasons.push(`Forecast-supported weather basket: ${weatherFavorite.label}.`);
  } else {
    risks.push(
      "The forecast-supported bucket could not be matched to an open Kalshi basket."
    );
  }

  reasons.push(`Market favorite: ${marketFavorite.label}.`);

  const forecastDiffersFromMarket =
    Boolean(weatherFavorite) && weatherFavorite?.ticker !== marketFavorite.ticker;

  if (weatherAgreement && weatherFavorite && forecastDiffersFromMarket) {
    score += 30;
    reasons.push(
      "Forecast sources support a basket that is different from the current market favorite."
    );
  }

  if (
    weatherFavorite &&
    forecastDiffersFromMarket &&
    weatherFavorite.impliedProbability !== null &&
    marketFavorite.impliedProbability !== null
  ) {
    const gap = marketFavorite.impliedProbability - weatherFavorite.impliedProbability;

    if (gap >= 0.2) {
      score += 25;
      reasons.push(
        `Forecast-supported basket is priced ${(gap * 100).toFixed(
          1
        )} percentage points below the market favorite.`
      );
    } else if (gap >= 0.1) {
      score += 15;
      reasons.push(
        `Forecast-supported basket is priced ${(gap * 100).toFixed(
          1
        )} percentage points below the market favorite.`
      );
    } else if (gap > 0) {
      score += 5;
      reasons.push(
        `Forecast-supported basket is slightly cheaper than the market favorite.`
      );
    }
  }

  if (weatherFavorite && weatherFavorite.yesAskEstimate === null) {
    risks.push(
      "Forecast-supported basket does not have a usable YES ask estimate."
    );
  }

  if (weatherFavorite && weatherFavorite.yesAskEstimate !== null) {
    if (weatherFavorite.yesAskEstimate <= 0.35) {
      score += 20;
      reasons.push(
        "Forecast-supported basket has an estimated YES ask at or below $0.35."
      );
    } else if (weatherFavorite.yesAskEstimate <= 0.5) {
      score += 10;
      reasons.push(
        "Forecast-supported basket has an estimated YES ask at or below $0.50."
      );
    } else if (weatherFavorite.yesAskEstimate >= 0.75) {
      risks.push("Forecast-supported basket may already be expensive.");
    }
  }

  if (score >= 75) {
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
  const agreedForecastBucket = weatherAgreement ? nwsBucket : null;
  const weatherFavorite =
    findMarketByBucket(markets, agreedForecastBucket) ??
    findMarketByBucket(markets, nwsBucket) ??
    findMarketByBucket(markets, openMeteoBucket);

  const scored = scoreDailyEvent({
    marketFavorite,
    weatherFavorite,
    nwsBucket,
    openMeteoBucket,
    weatherAgreement,
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
