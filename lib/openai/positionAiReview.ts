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
    summary: review.summary ?? "AI review returned no summary.",
    keyReasons: Array.isArray(review.keyReasons) ? review.keyReasons : [],
    keyRisks: Array.isArray(review.keyRisks) ? review.keyRisks : [],
    sellNowCase: review.sellNowCase ?? "No sell-now case provided.",
    holdCase: review.holdCase ?? "No hold case provided.",
    rollCase: review.rollCase ?? null,
    whatWouldChangeMyMind: Array.isArray(review.whatWouldChangeMyMind)
      ? review.whatWouldChangeMyMind
      : [],
    recommendedMonitoring: Array.isArray(review.recommendedMonitoring)
      ? review.recommendedMonitoring
      : [],
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
You review deterministic math, market pricing, weather data, bucket alignment, recent observations, forecast highs, and atmospheric context.
Your goal is to produce the kind of practical trade-management read a sharp weather-market trader would want: current winning bucket, overshoot risk, roll/hedge options, what the next observation would change, and what price/risk tradeoff matters.
You return only valid JSON matching the requested schema.
`;

  const userPrompt = {
    task: "Review this open Kalshi weather position and provide an advisory recommendation using the full weather evidence packet when available.",
    analysisInstructions: [
      "Make an independent final-temperature/bucket read before deciding on the action.",
      "For same-day positions, weigh observed high so far, latest observation, recent trend, remaining heating window, clouds, wind, humidity, storm/outflow risk, and forecast highs.",
      "If the held bucket is currently winning, focus on overshoot risk and whether selling, holding, trimming, or hedging/rolling is better.",
      "If a neighboring bucket is becoming more likely, explain whether to roll fully or hedge partially and what observation would confirm it.",
      "For future positions, use NWS hourly forecast, Open-Meteo hourly forecast, model agreement, forecast spread, and market pricing as primary evidence.",
      "Do not simply repeat the deterministic review. You may agree or disagree with it based on the evidence packet.",
      "Use concrete observation triggers whenever possible, such as: if the next print is 91°F, roll; if two more prints stay 89°F, hold/sell the hedge.",
    ],
    outputSchema: {
      action:
        "HOLD | WATCH_CLOSELY | HOLD_OR_TRIM_PROFIT | SELL_TO_LOCK_PROFIT | SELL_FULL_POSITION | CUT_LOSS | ROLL_TO_BETTER_BUCKET | NO_ACTION",
      confidence: "low | medium | high",
      agreementWithDeterministicReview: "agree | partially_agree | disagree",
      summary: "short plain-English recommendation with independent weather/bucket read",
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