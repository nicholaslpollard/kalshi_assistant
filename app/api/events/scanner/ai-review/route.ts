import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import {
  getDecryptedKalshiCredentials,
  getDecryptedOpenAiCredentials,
} from "@/lib/data/credentialRepository";
import { getKalshiEventWithMarkets } from "@/lib/kalshi/client";
import { runEventAiReview } from "@/lib/openai/eventAiReview";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import { buildWeatherEvidencePacket } from "@/lib/weather/weatherEvidence";
import {
  getNwsAlerts,
  getNwsForecastFromUrl,
  getNwsPoint,
  getNwsStationObservations,
} from "@/lib/weather/nwsClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AppCandidateBasket = {
  ticker: string | null;
  label: string | null;
  yesBid: number | null;
  yesAskEstimate: number | null;
  noBid: number | null;
  impliedProbability: number | null;
  volume: number | null;
  openInterest: number | null;
  status: string | null;
} | null;

const HOURLY_TEMPERATURE_SERIES_CONFIG: Record<
  string,
  {
    marketCode: string;
    displayName: string;
    timezone: string;
  }
> = {
  KXTEMPNYCH: {
    marketCode: "NYC",
    displayName: "New York, NY hourly temperature",
    timezone: "America/New_York",
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

function celsiusToFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32;
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

function getObservationTemperatureF(observation: Record<string, unknown>) {
  const properties = observation.properties as Record<string, unknown> | undefined;
  const temperature = properties?.temperature as Record<string, unknown> | undefined;
  const value = toNumber(temperature?.value);

  if (value === null) {
    return null;
  }

  return celsiusToFahrenheit(value);
}

function summarizeObservationsForEventDate(
  data: Record<string, unknown>,
  eventDate: string,
  timezone: string
) {
  const features = Array.isArray(data.features)
    ? (data.features as Record<string, unknown>[])
    : [];

  const eventDateReadings = features
    .map((feature) => {
      const properties = feature.properties as Record<string, unknown> | undefined;
      const timestamp =
        typeof properties?.timestamp === "string" ? properties.timestamp : null;

      if (!timestamp) {
        return null;
      }

      const localDate = getLocalDateFromIso(timestamp, timezone);

      if (localDate !== eventDate) {
        return null;
      }

      const tempF = getObservationTemperatureF(feature);

      if (tempF === null) {
        return null;
      }

      return {
        timestamp,
        localDate,
        tempF,
      };
    })
    .filter(
      (
        item
      ): item is {
        timestamp: string;
        localDate: string;
        tempF: number;
      } => item !== null
    );

  const observedMaxF =
    eventDateReadings.length > 0
      ? Math.max(...eventDateReadings.map((item) => item.tempF))
      : null;

  return {
    eventDate,
    observationCount: eventDateReadings.length,
    observedMaxF,
    latestEventObservation: eventDateReadings[0] ?? null,
    recentEventObservations: eventDateReadings.slice(0, 24),
  };
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

function normalizeKalshiMarket(market: Record<string, unknown>) {
  const noBid = toNumber(market.no_bid_dollars ?? market.no_bid);
  const yesBid = toNumber(market.yes_bid_dollars ?? market.yes_bid);

  return {
    ticker: market.ticker ?? null,
    title: market.title ?? null,
    subtitle: market.subtitle ?? null,
    yesSubTitle: market.yes_sub_title ?? null,
    label: getMarketLabel(market),
    status: market.status ?? null,
    yesBid,
    noBid,
    yesAskEstimate: noBid !== null ? Math.max(0, 1 - noBid) : null,
    impliedMid:
      yesBid !== null && noBid !== null
        ? (yesBid + Math.max(0, 1 - noBid)) / 2
        : yesBid,
    volume: market.volume ?? null,
    openInterest: market.open_interest ?? null,
    raw: market,
  };
}

function normalizeAppCandidateBasket(value: unknown): AppCandidateBasket {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return {
    ticker: typeof candidate.ticker === "string" ? candidate.ticker : null,
    label: typeof candidate.label === "string" ? candidate.label : null,
    yesBid: toNumber(candidate.yesBid),
    yesAskEstimate: toNumber(candidate.yesAskEstimate),
    noBid: toNumber(candidate.noBid),
    impliedProbability: toNumber(candidate.impliedProbability),
    volume: toNumber(candidate.volume),
    openInterest: toNumber(candidate.openInterest),
    status: typeof candidate.status === "string" ? candidate.status : null,
  };
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

function getDailyEventContext(eventTicker: string) {
  const parsed = parseWeatherTicker(`${eventTicker}-B0`);

  if (!parsed.marketCode || !parsed.eventDate) {
    return null;
  }

  return {
    family: "daily_high",
    marketCode: parsed.marketCode,
    eventDate: parsed.eventDate,
    eventHourLocal: null as number | null,
    eventDateTimeLocalLabel: null as string | null,
  };
}

function getHourlyEventContext(eventTicker: string, seriesTicker: string) {
  const hourlyConfig = HOURLY_TEMPERATURE_SERIES_CONFIG[seriesTicker];

  if (!hourlyConfig) {
    return null;
  }

  const parsed = parseHourlyEventTicker(eventTicker, seriesTicker);

  if (!parsed) {
    return null;
  }

  return {
    family: "hourly_temperature",
    marketCode: hourlyConfig.marketCode,
    eventDate: parsed.eventDate,
    eventHourLocal: parsed.eventHourLocal,
    eventDateTimeLocalLabel: parsed.eventDateTimeLocalLabel,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [kalshiCredentials, openAiCredentials] = await Promise.all([
      getDecryptedKalshiCredentials(user.uid),
      getDecryptedOpenAiCredentials(user.uid),
    ]);

    if (!kalshiCredentials) {
      return NextResponse.json(
        {
          error:
            "Kalshi credentials are not saved. Add them under Settings → Credentials.",
        },
        { status: 400 }
      );
    }

    if (!openAiCredentials) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not saved. Add it under Settings → Credentials before using AI review.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const eventTicker =
      typeof body.eventTicker === "string" ? body.eventTicker : null;

    const seriesTicker =
      typeof body.seriesTicker === "string" ? body.seriesTicker : null;

    const appCandidateBasket = normalizeAppCandidateBasket(
      body.appCandidateBasket
    );

    if (!eventTicker || !seriesTicker) {
      return NextResponse.json(
        { error: "eventTicker and seriesTicker are required." },
        { status: 400 }
      );
    }

    const eventContext =
      getHourlyEventContext(eventTicker, seriesTicker) ??
      getDailyEventContext(eventTicker);

    if (!eventContext) {
      return NextResponse.json(
        { error: "Unable to parse weather event ticker." },
        { status: 400 }
      );
    }

    const config = WEATHER_MARKETS[eventContext.marketCode];

    if (!config) {
      return NextResponse.json(
        { error: `Unsupported weather market code: ${eventContext.marketCode}` },
        { status: 400 }
      );
    }

    const eventResult = await getKalshiEventWithMarkets(
      eventTicker,
      kalshiCredentials
    );

    if (!eventResult.ok) {
      return NextResponse.json(
        {
          error: `Kalshi event request failed: ${eventResult.status} ${eventResult.statusText}`,
        },
        { status: 502 }
      );
    }

    const kalshiEvent = eventResult.data?.events?.[0] ?? null;

    const kalshiMarkets = Array.isArray(kalshiEvent?.markets)
      ? kalshiEvent.markets
          .filter(
            (market): market is Record<string, unknown> =>
              typeof market === "object" &&
              market !== null &&
              !Array.isArray(market)
          )
          .map(normalizeKalshiMarket)
      : [];

    const point = await getNwsPoint(config.latitude, config.longitude);
    const pointProperties = point.properties as Record<string, unknown> | undefined;

    const forecastUrl =
      typeof pointProperties?.forecast === "string"
        ? pointProperties.forecast
        : null;

    const hourlyForecastUrl =
      typeof pointProperties?.forecastHourly === "string"
        ? pointProperties.forecastHourly
        : null;

    const [forecast, hourlyForecast, observations, alerts, openMeteo] =
      await Promise.all([
        forecastUrl ? getNwsForecastFromUrl(forecastUrl) : Promise.resolve(null),
        hourlyForecastUrl
          ? getNwsForecastFromUrl(hourlyForecastUrl)
          : Promise.resolve(null),
        getNwsStationObservations(config.nwsObservationStation),
        getNwsAlerts(config.latitude, config.longitude),
        getOpenMeteoForecast({
          latitude: config.latitude,
          longitude: config.longitude,
          timezone: config.timezone,
          startDate: eventContext.eventDate,
          endDate: eventContext.eventDate,
        }),
      ]);

    const weatherEvidence = buildWeatherEvidencePacket({
      stationId: config.nwsObservationStation,
      stationName: config.displayName,
      timezone: config.timezone,
      latitude: config.latitude,
      longitude: config.longitude,
      eventDate: eventContext.eventDate,
      nwsPoint: point,
      nwsDailyForecast: forecast,
      nwsHourlyForecast: hourlyForecast,
      nwsObservations: observations,
      nwsAlerts: alerts,
      openMeteo,
    });

    const aiReview = await runEventAiReview({
      apiKey: openAiCredentials.apiKey,
      payload: {
        eventTicker,
        seriesTicker,
        eventContext: {
          family: eventContext.family,
          marketCode: eventContext.marketCode,
          eventDate: eventContext.eventDate,
          eventHourLocal: eventContext.eventHourLocal,
          eventDateTimeLocalLabel: eventContext.eventDateTimeLocalLabel,
          location: config.displayName,
          timezone: config.timezone,
          latitude: config.latitude,
          longitude: config.longitude,
          nwsObservationStation: config.nwsObservationStation,
          settlementNote: config.settlementNote,
          analysisMode:
            eventContext.family === "hourly_temperature"
              ? "hourly_temperature_forecast_threshold_review"
              : "daily_high_forecast_bucket_review",
          forecastGuidance:
            eventContext.family === "daily_high"
              ? "For tomorrow or future daily-high events, observations may be unavailable. Use NWS and Open-Meteo forecast highs as the primary evidence and evaluate which Kalshi range basket those forecasts support."
              : "For hourly events, use NWS hourly forecast and Open-Meteo hourly forecast for the target local hour as the primary evidence.",
        },
        appCandidateBasket,
        kalshiEvent,
        kalshiMarkets,
        nws: {
          point,
          forecast,
          hourlyForecast,
          observationsSummary: summarizeObservationsForEventDate(
            observations,
            eventContext.eventDate,
            config.timezone
          ),
          alerts,
        },
        openMeteo,
        weatherEvidence,
      },
    });

    return NextResponse.json({
      ok: true,
      eventTicker,
      seriesTicker,
      generatedAt: new Date().toISOString(),
      appCandidateBasket,
      weatherEvidence,
      aiReview,
    });
  } catch (error) {
    console.error("Independent event AI review failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown event AI review error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
