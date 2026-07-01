import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import { getDecryptedOpenAiCredentials } from "@/lib/data/credentialRepository";
import { runPositionAiReview } from "@/lib/openai/positionAiReview";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import { buildWeatherEvidencePacket } from "@/lib/weather/weatherEvidence";
import {
  getNwsAlerts,
  getNwsForecastFromUrl,
  getNwsPoint,
  getNwsStationObservations,
} from "@/lib/weather/nwsClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import type { PositionReviewResult } from "@/types/positionReview";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type WeatherEvidenceResult = Record<string, unknown> | null;

function getTickerFromRequestUrl(request: Request) {
  const pathname = new URL(request.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const tickerIndex = parts.findIndex((part) => part === "positions") + 1;
  const encodedTicker = tickerIndex > 0 ? parts[tickerIndex] : null;

  if (!encodedTicker) {
    return null;
  }

  try {
    return decodeURIComponent(encodedTicker);
  } catch {
    return encodedTicker;
  }
}

function getTickerFromBodyPosition(body: Record<string, unknown>) {
  const position =
    body.position && typeof body.position === "object" && !Array.isArray(body.position)
      ? (body.position as Record<string, unknown>)
      : null;

  return typeof position?.ticker === "string" ? position.ticker : null;
}

async function buildPositionWeatherEvidence(params: {
  requestTicker: string | null;
  body: Record<string, unknown>;
}): Promise<WeatherEvidenceResult> {
  try {
    const ticker = params.requestTicker ?? getTickerFromBodyPosition(params.body);

    if (!ticker) {
      return null;
    }

    const parsed = parseWeatherTicker(ticker);

    if (!parsed.marketCode || !parsed.eventDate) {
      return null;
    }

    const config = WEATHER_MARKETS[parsed.marketCode];

    if (!config) {
      return null;
    }

    const point = await getNwsPoint(config.latitude, config.longitude);
    const pointProperties = point.properties as Record<string, unknown> | undefined;

    const forecastUrl =
      typeof pointProperties?.forecast === "string" ? pointProperties.forecast : null;

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
          startDate: parsed.eventDate,
          endDate: parsed.eventDate,
        }),
      ]);

    return buildWeatherEvidencePacket({
      stationId: config.nwsObservationStation,
      stationName: config.displayName,
      timezone: config.timezone,
      latitude: config.latitude,
      longitude: config.longitude,
      eventDate: parsed.eventDate,
      nwsPoint: point,
      nwsDailyForecast: forecast,
      nwsHourlyForecast: hourlyForecast,
      nwsObservations: observations,
      nwsAlerts: alerts,
      openMeteo,
    }) as WeatherEvidenceResult;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to build weather evidence packet.",
    };
  }
}

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getDecryptedOpenAiCredentials(user.uid);

    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not saved. Add it under Settings → Credentials before using AI review.",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!body.position || !body.deterministicReview) {
      return NextResponse.json(
        {
          error:
            "Position and deterministic review payloads are required for AI review.",
        },
        { status: 400 }
      );
    }

    const requestTicker = getTickerFromRequestUrl(request);
    const suppliedWeatherEvidence =
      body.weatherEvidence &&
      typeof body.weatherEvidence === "object" &&
      !Array.isArray(body.weatherEvidence)
        ? (body.weatherEvidence as Record<string, unknown>)
        : null;

    const weatherEvidence =
      suppliedWeatherEvidence ??
      (await buildPositionWeatherEvidence({ requestTicker, body }));

    const aiReview = await runPositionAiReview({
      apiKey: credentials.apiKey,
      position: body.position as Record<string, unknown>,
      weather: (body.weather as Record<string, unknown> | null) ?? null,
      weatherEvidence,
      basketMarkets: Array.isArray(body.basketMarkets)
        ? (body.basketMarkets as Record<string, unknown>[])
        : [],
      deterministicReview: body.deterministicReview as PositionReviewResult,
    });

    return NextResponse.json({
      ok: true,
      weatherEvidence,
      aiReview,
    });
  } catch (error) {
    console.error("AI position review failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown AI review error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
