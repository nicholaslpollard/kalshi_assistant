import type { EventAiReviewResult } from "@/types/eventScanner";

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

type RunEventAiReviewInput = {
  apiKey: string;
  model?: string;
  payload: {
    eventTicker: string;
    seriesTicker: string;
    eventContext: Record<string, unknown>;
    appCandidateBasket: AppCandidateBasket;
    kalshiEvent: Record<string, unknown> | null;
    kalshiMarkets: Record<string, unknown>[];
    nws: Record<string, unknown>;
    openMeteo: Record<string, unknown>;
  };
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

function validateCandidateAssessment(
  value: unknown,
  fallbackCandidate: AppCandidateBasket
): EventAiReviewResult["candidateAssessment"] {
  const candidate =
    value && typeof value === "object"
      ? (value as Partial<EventAiReviewResult["candidateAssessment"]>)
      : null;

  const assessment =
    candidate?.assessment === "agree" ||
    candidate?.assessment === "partially_agree" ||
    candidate?.assessment === "disagree" ||
    candidate?.assessment === "no_candidate"
      ? candidate.assessment
      : fallbackCandidate
        ? "partially_agree"
        : "no_candidate";

  return {
    appCandidateTicker:
      typeof candidate?.appCandidateTicker === "string"
        ? candidate.appCandidateTicker
        : fallbackCandidate?.ticker ?? null,
    appCandidateLabel:
      typeof candidate?.appCandidateLabel === "string"
        ? candidate.appCandidateLabel
        : fallbackCandidate?.label ?? null,
    assessment,
    assessmentReason:
      typeof candidate?.assessmentReason === "string"
        ? candidate.assessmentReason
        : fallbackCandidate
          ? "AI did not provide a specific candidate assessment reason."
          : "No app candidate basket was provided.",
  };
}

function validateEventAiReview(
  value: unknown,
  fallbackCandidate: AppCandidateBasket
): EventAiReviewResult {
  if (!value || typeof value !== "object") {
    throw new Error("AI review response was not an object.");
  }

  const review = value as Partial<EventAiReviewResult>;

  return {
    action:
      review.action === "ENTER_YES" ||
      review.action === "WATCH_ONLY" ||
      review.action === "AVOID" ||
      review.action === "INSUFFICIENT_DATA"
        ? review.action
        : "INSUFFICIENT_DATA",
    recommendedBasketTicker:
      typeof review.recommendedBasketTicker === "string"
        ? review.recommendedBasketTicker
        : null,
    recommendedBasketLabel:
      typeof review.recommendedBasketLabel === "string"
        ? review.recommendedBasketLabel
        : null,
    confidence:
      review.confidence === "high" ||
      review.confidence === "medium" ||
      review.confidence === "low"
        ? review.confidence
        : "low",
    trueConfidencePercent: toNumberOrNull(review.trueConfidencePercent),
    summary:
      typeof review.summary === "string"
        ? review.summary
        : "AI review returned no summary.",
    candidateAssessment: validateCandidateAssessment(
      review.candidateAssessment,
      fallbackCandidate
    ),
    dataRead: {
      nwsInterpretation:
        typeof review.dataRead?.nwsInterpretation === "string"
          ? review.dataRead.nwsInterpretation
          : "No NWS interpretation provided.",
      openMeteoInterpretation:
        typeof review.dataRead?.openMeteoInterpretation === "string"
          ? review.dataRead.openMeteoInterpretation
          : "No Open-Meteo interpretation provided.",
      kalshiMarketInterpretation:
        typeof review.dataRead?.kalshiMarketInterpretation === "string"
          ? review.dataRead.kalshiMarketInterpretation
          : "No Kalshi market interpretation provided.",
      observationInterpretation:
        typeof review.dataRead?.observationInterpretation === "string"
          ? review.dataRead.observationInterpretation
          : "No observation interpretation provided.",
    },
    entryOpinion: {
      shouldEnter: Boolean(review.entryOpinion?.shouldEnter),
      preferredMaxEntryPrice: toNumberOrNull(
        review.entryOpinion?.preferredMaxEntryPrice
      ),
      fairValueEstimate: toNumberOrNull(review.entryOpinion?.fairValueEstimate),
      reasoning:
        typeof review.entryOpinion?.reasoning === "string"
          ? review.entryOpinion.reasoning
          : "No entry reasoning provided.",
    },
    risks: toStringArray(review.risks),
    whatWouldChangeMyMind: toStringArray(review.whatWouldChangeMyMind),
    recommendedMonitoring: toStringArray(review.recommendedMonitoring),
  };
}

export async function runEventAiReview({
  apiKey,
  model = process.env.OPENAI_MODEL || "gpt-4.1-mini",
  payload,
}: RunEventAiReviewInput): Promise<EventAiReviewResult> {
  const systemPrompt = `
You are an independent advisory-only Kalshi weather event analyst.

You do not place trades.
You do not know or use the app's deterministic scanner score.
You must not assume there is an opportunity.
You independently interpret Kalshi market pricing, NWS data, Open-Meteo data, and observations.

For tomorrow or future daily-high events, observations may be unavailable or irrelevant. Do not mark a future event insufficient only because there are no same-day observations. Use NWS forecast highs and Open-Meteo daily maximum forecasts as the primary evidence, compare them to the available Kalshi range baskets, and identify the forecast-supported basket if one exists.

For hourly temperature events, use NWS hourly forecast and Open-Meteo hourly forecast for the target local hour as the primary evidence.

The app may provide one app-selected candidate basket. Treat it only as a candidate to evaluate, not as a conclusion. You may agree, partially agree, disagree, recommend a different basket, recommend watching only, or recommend avoiding the event.

Your job is to explain what the data means and give an opinion on which basket, if any, is worth entering or worth watching.
Your confidence must reflect the reliability of the data and how strong the conclusion is at this moment.
Return only valid JSON matching the requested schema.
`;

  const userPayload = {
    task: "Independently review this Kalshi weather event and decide whether any YES basket is worth entering. Also assess the app-selected candidate basket if one is provided.",
    importantRules: [
      "Do not use any deterministic scanner score, signal, reasons, or risks.",
      "The appCandidateBasket is only a candidate. Do not assume it is correct.",
      "For tomorrow/future daily-high events, use NWS and Open-Meteo forecast highs as primary evidence even when observations are missing.",
      "For future events, identify the forecast-supported basket and compare it to market pricing.",
      "Explicitly assess whether you agree, partially agree, or disagree with the app candidate.",
      "If you disagree with the app candidate, explain why and identify a better basket if one exists.",
      "Do not say to enter unless the forecast agreement, price, and risk/reward are strong enough.",
      "A low-confidence or watch-only answer is acceptable.",
      "Give a true confidence percentage based on data reliability, agreement between sources, timing, and market pricing.",
      "If recommending entry, specify the exact basket ticker and label if identifiable.",
      "Mention a preferred maximum entry price and fair value estimate when possible.",
    ],
    outputSchema: {
      action: "ENTER_YES | WATCH_ONLY | AVOID | INSUFFICIENT_DATA",
      recommendedBasketTicker: "string or null",
      recommendedBasketLabel: "string or null",
      confidence: "low | medium | high",
      trueConfidencePercent: "number from 0 to 100 or null",
      summary: "plain-English independent opinion",
      candidateAssessment: {
        appCandidateTicker: "string or null",
        appCandidateLabel: "string or null",
        assessment: "agree | partially_agree | disagree | no_candidate",
        assessmentReason:
          "explain whether the app candidate is a good entry candidate based on raw data",
      },
      dataRead: {
        nwsInterpretation: "what NWS data means",
        openMeteoInterpretation: "what Open-Meteo data means",
        kalshiMarketInterpretation: "what market pricing means",
        observationInterpretation:
          "what observations mean; for future events, explicitly state that observations are not yet useful and that forecast data is primary",
      },
      entryOpinion: {
        shouldEnter: "boolean",
        preferredMaxEntryPrice: "0.00 to 1.00 or null",
        fairValueEstimate: "0.00 to 1.00 or null",
        reasoning: "entry reasoning",
      },
      risks: ["risk 1", "risk 2"],
      whatWouldChangeMyMind: ["specific condition"],
      recommendedMonitoring: ["specific data to monitor"],
    },
    data: payload,
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
          content: JSON.stringify(userPayload),
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

  return validateEventAiReview(
    extractJsonObject(content),
    payload.appCandidateBasket
  );
}