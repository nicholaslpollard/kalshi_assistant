import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import { getNwsForecastFromUrl, getNwsPoint } from "@/lib/weather/nwsClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import type {
  EventScannerMarket,
  EventScannerResult,
  EventScannerSignal,
} from "@/types/eventScanner";

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

function getForecastDate(period: Record<string, unknown>, timezone: string) {
  const startTime = typeof period.startTime === "string" ? period.startTime : null;

  if (!startTime) {
    return null;
  }

  return getLocalDateFromIso(startTime, timezone);
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

function getMarketLabel(market: Record<string, unknown>) {
  const title =
    typeof market.title === "string"
      ? market.title
      : typeof market.subtitle === "string"
        ? market.subtitle
        : typeof market.yes_sub_title === "string"
          ? market.yes_sub_title
          : typeof market.ticker === "string"
            ? market.ticker
            : "Unknown basket";

  const match = title.match(/(\d+)\s*(?:°|degrees?)?\s*(?:to|-)\s*(\d+)/i);

  if (match) {
    return `${match[1]}° to ${match[2]}°`;
  }

  const aboveMatch = title.match(/(\d+)\s*(?:°|degrees?)?\s*(?:or more|or above|above|\+)/i);

  if (aboveMatch) {
    return `${aboveMatch[1]}° or above`;
  }

  const belowMatch = title.match(/(?:under|below|less than|or below).*?(\d+)/i);

  if (belowMatch) {
    return `${belowMatch[1]}° or below`;
  }

  return title;
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

function scoreEvent(params: {
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
      reasons: ["No usable weather bucket was found from NWS or Open-Meteo."],
      risks: ["Weather data may be unavailable for this event date."],
    };
  }

  if (weatherAgreement && nwsBucket) {
    score += 25;
    reasons.push(`NWS and Open-Meteo agree on ${nwsBucket}.`);
  } else {
    risks.push("NWS and Open-Meteo do not fully agree.");
  }

  if (weatherFavorite) {
    reasons.push(`Weather-supported basket: ${weatherFavorite.label}.`);
  } else {
    risks.push("The weather-supported bucket could not be matched to an event basket.");
  }

  reasons.push(`Market favorite: ${marketFavorite.label}.`);

  if (
    weatherFavorite &&
    weatherFavorite.ticker !== marketFavorite.ticker &&
    weatherAgreement
  ) {
    score += 50;
    reasons.push("Weather agrees on a basket that is not the market favorite.");
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
        `Weather basket is priced ${(gap * 100).toFixed(
          1
        )} percentage points below the market favorite.`
      );
    }
  }

  if (weatherFavorite && weatherFavorite.yesAskEstimate === null) {
    risks.push("Weather-supported basket does not have a usable YES ask estimate.");
  }

  if (weatherFavorite && weatherFavorite.yesAskEstimate !== null) {
    if (weatherFavorite.yesAskEstimate <= 0.45) {
      score += 10;
      reasons.push("Weather-supported basket has an estimated YES ask at or below $0.45.");
    } else if (weatherFavorite.yesAskEstimate >= 0.75) {
      risks.push("Weather-supported basket may already be expensive.");
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
  const weatherFavorite =
    findMarketByBucket(markets, nwsBucket) ??
    findMarketByBucket(markets, openMeteoBucket);

  const scored = scoreEvent({
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
    eventTicker,
    seriesTicker,
    marketCode,
    locationName: config.displayName,
    eventDate,
    title,
    signal: scored.signal,
    score: scored.score,
    summary:
      scored.signal === "POTENTIAL_ENTRY"
        ? "Possible entry candidate based on weather-market disagreement."
        : scored.signal === "WATCH_CLOSELY"
          ? "Worth watching, but not a strong entry candidate yet."
          : scored.signal === "INSUFFICIENT_DATA"
            ? "Insufficient data to score this event."
            : "No clear event edge from the current read.",
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
      weatherAgreement,
    },
    rawEvent: event,
  };
}