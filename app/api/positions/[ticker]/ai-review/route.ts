import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import { getDecryptedOpenAiCredentials } from "@/lib/data/credentialRepository";
import { runPositionAiReview } from "@/lib/openai/positionAiReview";
import { fetchWeatherEvidencePacket } from "@/lib/weather/weatherEvidence";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import type { PositionReviewResult } from "@/types/positionReview";
import { NextResponse } from "next/server";

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

async function buildPositionWeatherEvidence(params: {
  requestTicker: string | null;
  body: Record<string, unknown>;
}) {
  try {
    const bodyPosition =
      params.body.position && typeof params.body.position === "object"
        ? (params.body.position as Record<string, unknown>)
        : null;

    const ticker =
      params.requestTicker ??
      (typeof bodyPosition?.ticker === "string" ? bodyPosition.ticker : null);

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

    return await fetchWeatherEvidencePacket({
      stationId: config.nwsObservationStation,
      stationName: config.displayName,
      timezone: config.timezone,
      latitude: config.latitude,
      longitude: config.longitude,
      eventDate: parsed.eventDate,
    });
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
    const weatherEvidence =
      (body.weatherEvidence as Record<string, unknown> | undefined) ??
      (await buildPositionWeatherEvidence({ requestTicker, body }));

    const aiReview = await runPositionAiReview({
      apiKey: credentials.apiKey,
      position: body.position as Record<string, unknown>,
      weather: (body.weather as Record<string, unknown> | null) ?? null,
      weatherEvidence: weatherEvidence as Record<string, unknown> | null,
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
