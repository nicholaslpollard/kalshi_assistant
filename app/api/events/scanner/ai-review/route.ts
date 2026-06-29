import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import {
  getDecryptedKalshiCredentials,
  getDecryptedOpenAiCredentials,
} from "@/lib/data/credentialRepository";
import { getKalshiEventWithMarkets } from "@/lib/kalshi/client";
import { runEventAiReview } from "@/lib/openai/eventAiReview";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import {
  getNwsAlerts,
  getNwsForecastFromUrl,
  getNwsPoint,
  getNwsStationObservations,
} from "@/lib/weather/nwsClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import { NextResponse } from "next/server";

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

function normalizeKalshiMarket(market: Record<string, unknown>) {
  const noBid = toNumber(market.no_bid_dollars ?? market.no_bid);
  const yesBid = toNumber(market.yes_bid_dollars ?? market.yes_bid);

  return {
    ticker: market.ticker ?? null,
    title: market.title ?? null,
    subtitle: market.subtitle ?? null,
    yesSubTitle: market.yes_sub_title ?? null,
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

    const parsed = parseWeatherTicker(`${eventTicker}-B0`);

    if (!parsed.marketCode || !parsed.eventDate) {
      return NextResponse.json(
        { error: "Unable to parse weather event ticker." },
        { status: 400 }
      );
    }

    const config = WEATHER_MARKETS[parsed.marketCode];

    if (!config) {
      return NextResponse.json(
        { error: `Unsupported weather market code: ${parsed.marketCode}` },
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

    const [forecast, observations, alerts, openMeteo] = await Promise.all([
      forecastUrl ? getNwsForecastFromUrl(forecastUrl) : Promise.resolve(null),
      getNwsStationObservations(config.nwsObservationStation),
      getNwsAlerts(config.latitude, config.longitude),
      getOpenMeteoForecast({
        latitude: config.latitude,
        longitude: config.longitude,
        timezone: config.timezone,
        startDate: parsed.eventDate,
        endDate: parsed.eventDate,
      }),
    ]);

    const aiReview = await runEventAiReview({
      apiKey: openAiCredentials.apiKey,
      payload: {
        eventTicker,
        seriesTicker,
        eventContext: {
          marketCode: parsed.marketCode,
          eventDate: parsed.eventDate,
          location: config.displayName,
          timezone: config.timezone,
          latitude: config.latitude,
          longitude: config.longitude,
          nwsObservationStation: config.nwsObservationStation,
          settlementNote: config.settlementNote,
        },
        appCandidateBasket,
        kalshiEvent,
        kalshiMarkets,
        nws: {
          point,
          forecast,
          observationsSummary: summarizeObservationsForEventDate(
            observations,
            parsed.eventDate,
            config.timezone
          ),
          alerts,
        },
        openMeteo,
      },
    });

    return NextResponse.json({
      ok: true,
      eventTicker,
      seriesTicker,
      generatedAt: new Date().toISOString(),
      appCandidateBasket,
      aiReview,
    });
  } catch (error) {
    console.error("Independent event AI review failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown event AI review error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}