import type {
  PositionAiReviewResult,
  PositionReviewResult,
} from "@/types/positionReview";

type RunPositionAiReviewInput = {
  apiKey: string;
  model?: string;
  position: Record<string, unknown>;
  weather: Record<string, unknown> | null;
  weatherEvidence?: Record<string, unknown> | null;
  basketMarkets: Record<string, unknown>[];
  deterministicReview: PositionReviewResult;
};

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("AI response did not contain valid JSON.");
  }
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function getNestedObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function validateIndependentForecast(value: unknown) {
  const forecast = getNestedObject(value);

  return {
    predictedHighF: toNumberOrNull(forecast?.predictedHighF),
    mostLikelyBucket: typeof forecast?.mostLikelyBucket === "string" ? forecast.mostLikelyBucket : null,
    secondMostLikelyBucket:
      typeof forecast?.secondMostLikelyBucket === "string"
        ? forecast.secondMostLikelyBucket
        : null,
    probabilityEstimate: readString(
      forecast?.probabilityEstimate,
      "No probability-style estimate was provided."
    ),
    confidencePercent: toNumberOrNull(forecast?.confidencePercent),
    reasoning: readString(
      forecast?.reasoning,
      "No independent forecast reasoning was provided."
    ),
  };
}

function validateWeatherEvidenceRead(value: unknown) {
  const read = getNestedObject(value);

  return {
    observationTrend: readString(
      read?.observationTrend,
      "No observation-trend read was provided."
    ),
    forecastRead: readString(read?.forecastRead, "No forecast read was provided."),
    atmosphericRead: readString(
      read?.atmosphericRead,
      "No atmospheric read was provided."
    ),
    marketPricingRead: readString(
      read?.marketPricingRead,
      "No market-pricing read was provided."
    ),
    timingRead: readString(read?.timingRead, "No timing read was provided."),
  };
}

function validateDecisionPlan(value: unknown) {
  const plan = getNestedObject(value);

  return {
    immediateAction: readString(
      plan?.immediateAction,
      "No immediate action plan was provided."
    ),
    nextObservationTrigger: readString(
      plan?.nextObservationTrigger,
      "No next-observation trigger was provided."
    ),
    invalidationSignal: readString(
      plan?.invalidationSignal,
      "No invalidation signal was provided."
    ),
    upsideScenario: readString(plan?.upsideScenario, "No upside scenario was provided."),
    downsideScenario: readString(
      plan?.downsideScenario,
      "No downside scenario was provided."
    ),
  };
}

function validateAiReview(value: unknown): PositionAiReviewResult {
  if (!value || typeof value !== "object") {
    throw new Error("AI review response was not an object.");
  }

  const review = value as Partial<PositionAiReviewResult>;

  return {
    action: review.action ?? "WATCH_CLOSELY",
    confidence: review.confidence ?? "low",
    agreementWithDeterministicReview:
      review.agreementWithDeterministicReview ?? "partially_agree",
    summary: readString(review.summary, "AI review returned no summary."),
    independentForecast: validateIndependentForecast(review.independentForecast),
    weatherEvidenceRead: validateWeatherEvidenceRead(review.weatherEvidenceRead),
    decisionPlan: validateDecisionPlan(review.decisionPlan),
    keyReasons: toStringArray(review.keyReasons),
    keyRisks: toStringArray(review.keyRisks),
    sellNowCase: readString(review.sellNowCase, "No sell-now case provided."),
    holdCase: readString(review.holdCase, "No hold case provided."),
    rollCase: typeof review.rollCase === "string" ? review.rollCase : null,
    whatWouldChangeMyMind: toStringArray(review.whatWouldChangeMyMind),
    recommendedMonitoring: toStringArray(review.recommendedMonitoring),
  };
}

export async function runPositionAiReview({
  apiKey,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  position,
  weather,
  basketMarkets,
  deterministicReview,
  weatherEvidence = null,
}: RunPositionAiReviewInput): Promise<PositionAiReviewResult> {
  const systemPrompt = `
You are an advisory-only Kalshi weather position review assistant.

You do not place trades.
You do not tell the user a trade is guaranteed.
You review deterministic math, market pricing, weather data, bucket alignment, recent observations, forecast highs, NWS raw gridpoint evidence, Open-Meteo model evidence, ensemble spread, and atmospheric context.
Daily high bucket rule: Kalshi buckets with midpoint tickers are true one-degree ranges. B74.5 means 74° to 75°, B80.5 means 80° to 81°, and B93.5 means 93° to 94°. Do not treat these as above-threshold markets. When translating a forecast temperature into a daily high bucket, floor the temperature to the lower whole degree and add one degree for the upper bound.

Your goal is to produce the kind of practical trade-management read a sharp weather-market trader would want: current winning bucket, overshoot risk, roll/hedge options, what the next observation would change, and what price/risk tradeoff matters.
You return only valid JSON matching the requested schema.
`;

  const userPrompt = {
    task: "Review this open Kalshi weather position and provide an advisory recommendation using the full weather evidence packet when available.",
    analysisInstructions: [
      "Make an independent final-temperature/bucket read before deciding on the action.",
      "For same-day positions, weigh observed high so far, latest observation, recent trend, remaining heating window, clouds, wind, humidity, storm/outflow risk, NWS grid maxTemperature, Open-Meteo HRRR/NBM/GFS/ECMWF model agreement, ensemble spread, and forecast highs.",
      "Daily high bucket mapping is floor-to-next-degree: 74.5 = 74° to 75°, 80.5 = 80° to 81°, 93.5 = 93° to 94°. Do not describe midpoint-coded daily buckets as above-threshold markets.",
      "If the held bucket is currently winning, focus on overshoot risk and whether selling, holding, trimming, or hedging/rolling is better.",
      "If a neighboring bucket is becoming more likely, explain whether to roll fully or hedge partially and what observation would confirm it.",
      "For future positions, use NWS daily/hourly/gridpoint forecast, Open-Meteo best-match/HRRR/NBM/GFS/ECMWF forecast, ensemble mean/spread, model agreement, forecast spread, and market pricing as primary evidence.",
      "Do not simply repeat the deterministic review. You may agree or disagree with it based on the evidence packet.",
      "Use concrete observation triggers whenever possible, such as: if the next print is 91°F, roll; if two more prints stay 89°F, hold/sell the hedge.",
    ],
    outputSchema: {
      action:
        "HOLD | WATCH_CLOSELY | HOLD_OR_TRIM_PROFIT | SELL_TO_LOCK_PROFIT | SELL_FULL_POSITION | CUT_LOSS | ROLL_TO_BETTER_BUCKET | NO_ACTION",
      confidence: "low | medium | high",
      agreementWithDeterministicReview: "agree | partially_agree | disagree",
      summary: "short plain-English recommendation with independent weather/bucket read",
      independentForecast: {
        predictedHighF: "number or null",
        mostLikelyBucket: "string or null, such as 89° to 90°",
        secondMostLikelyBucket: "string or null",
        probabilityEstimate: "plain-English probability estimate, such as 55-60% chance of 91+ but 89-90 still live",
        confidencePercent: "number from 0 to 100 or null",
        reasoning: "explain the independent final-temperature/bucket forecast",
      },
      weatherEvidenceRead: {
        observationTrend: "latest temp, observed high so far, recent trend, and whether the held bucket is currently winning",
        forecastRead: "NWS/Open-Meteo forecast highs and model agreement/disagreement",
        atmosphericRead: "clouds, wind, humidity, radiation, storm/outflow risk and how they affect heating",
        marketPricingRead: "market pricing, bid/ask, exit value, roll/hedge pricing, and whether price has already corrected",
        timingRead: "remaining heating window, next obs timing, and settlement timing",
      },
      decisionPlan: {
        immediateAction: "what to do now: hold, trim, sell, hedge, roll, or wait",
        nextObservationTrigger: "specific next observation/temperature print that would change the action",
        invalidationSignal: "specific evidence that proves this read wrong",
        upsideScenario: "best-case scenario for the current position/candidate",
        downsideScenario: "main way this position/candidate loses",
      },
      keyReasons: ["reason 1", "reason 2"],
      keyRisks: ["risk 1", "risk 2"],
      sellNowCase: "plain-English case for selling now, including why the current bid is or is not worth taking",
      holdCase: "plain-English case for holding, including current winning bucket and overshoot risk when relevant",
      rollCase: "plain-English roll or hedge discussion, including target/hedge bucket and trigger; null if not relevant",
      whatWouldChangeMyMind: ["specific condition that would change recommendation"],
      recommendedMonitoring: ["specific data to monitor next"],
    },
    deterministicReview,
    position,
    weather,
    weatherEvidence,
    basketMarkets,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(userPrompt),
        },
      ],
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    const message =
      body?.error?.message ??
      `OpenAI request failed with status ${response.status}.`;

    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include text content.");
  }

  return validateAiReview(extractJsonObject(content));
}