import type {
  PositionAiReviewResult,
  PositionReviewResult,
} from "@/types/positionReview";

type RunPositionAiReviewInput = {
  apiKey: string;
  model?: string;
  position: Record<string, unknown>;
  weather: Record<string, unknown> | null;
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
}: RunPositionAiReviewInput): Promise<PositionAiReviewResult> {
  const systemPrompt = `
You are an advisory-only Kalshi weather position review assistant.

You do not place trades.
You do not tell the user a trade is guaranteed.
You review the deterministic math, market pricing, weather data, and bucket alignment.
You return only valid JSON matching the requested schema.
`;

  const userPrompt = {
    task: "Review this open Kalshi weather position and provide an advisory recommendation.",
    outputSchema: {
      action:
        "HOLD | WATCH_CLOSELY | HOLD_OR_TRIM_PROFIT | SELL_TO_LOCK_PROFIT | SELL_FULL_POSITION | CUT_LOSS | ROLL_TO_BETTER_BUCKET | NO_ACTION",
      confidence: "low | medium | high",
      agreementWithDeterministicReview: "agree | partially_agree | disagree",
      summary: "short plain-English recommendation",
      keyReasons: ["reason 1", "reason 2"],
      keyRisks: ["risk 1", "risk 2"],
      sellNowCase: "plain-English case for selling now",
      holdCase: "plain-English case for holding",
      rollCase: "plain-English roll discussion or null",
      whatWouldChangeMyMind: ["specific condition that would change recommendation"],
      recommendedMonitoring: ["specific data to monitor next"],
    },
    deterministicReview,
    position,
    weather,
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