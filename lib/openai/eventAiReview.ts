import type {
  AiBucketProbability,
  AiFairValueRead,
  AiModelConsensusRow,
  AiObservationTrigger,
  AiSettlementClockRead,
  EventAiReviewResult,
} from "@/types/eventScanner";

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
    weatherEvidence?: Record<string, unknown> | null;
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

function getNestedObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}


function readWeight(value: unknown): AiModelConsensusRow["weight"] {
  return value === "very_high" ||
    value === "high" ||
    value === "medium_high" ||
    value === "medium" ||
    value === "low" ||
    value === "context"
    ? value
    : "context";
}

function readUrgency(value: unknown): AiObservationTrigger["urgency"] {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function validateModelConsensus(value: unknown): AiModelConsensusRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row = getNestedObject(item);
      if (!row) {
        return null;
      }

      return {
        source: readString(row.source, "Unknown source"),
        forecastHighF: toNumberOrNull(row.forecastHighF),
        bucket: typeof row.bucket === "string" ? row.bucket : null,
        weight: readWeight(row.weight),
        notes: readString(row.notes, "No source notes provided."),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateBucketProbabilities(value: unknown): AiBucketProbability[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const row = getNestedObject(item);
      if (!row) {
        return null;
      }

      const probabilityPercent = toNumberOrNull(row.probabilityPercent);

      return {
        bucket: readString(row.bucket, "Unknown bucket"),
        probabilityPercent:
          probabilityPercent === null ? 0 : Math.max(0, Math.min(100, probabilityPercent)),
        fairValueEstimate: toNumberOrNull(row.fairValueEstimate),
        reasoning: readString(row.reasoning, "No bucket probability reasoning provided."),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateFairValue(value: unknown): AiFairValueRead {
  const read = getNestedObject(value);

  return {
    modelImpliedProbabilityPercent: toNumberOrNull(read?.modelImpliedProbabilityPercent),
    fairYesPrice: toNumberOrNull(read?.fairYesPrice),
    currentYesAsk: toNumberOrNull(read?.currentYesAsk),
    currentYesBid: toNumberOrNull(read?.currentYesBid),
    edgeCents: toNumberOrNull(read?.edgeCents),
    maxEntryPrice: toNumberOrNull(read?.maxEntryPrice),
    priceDiscipline: readString(read?.priceDiscipline, "No price-discipline read was provided."),
  };
}

function validateObservationTriggers(value: unknown): AiObservationTrigger[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const trigger = getNestedObject(item);
      if (!trigger) {
        return null;
      }

      return {
        trigger: readString(trigger.trigger, "Unspecified trigger"),
        action: readString(trigger.action, "Reassess the market."),
        urgency: readUrgency(trigger.urgency),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function validateSettlementClock(value: unknown): AiSettlementClockRead {
  const read = getNestedObject(value);

  return {
    localTimeNow: typeof read?.localTimeNow === "string" ? read.localTimeNow : null,
    remainingHeatingWindow: readString(
      read?.remainingHeatingWindow,
      "No remaining-heating-window read was provided."
    ),
    peakHeatingPassed:
      typeof read?.peakHeatingPassed === "boolean" ? read.peakHeatingPassed : null,
    settlementTimingRead: readString(
      read?.settlementTimingRead,
      "No settlement timing read was provided."
    ),
  };
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
    summary: readString(review.summary, "AI review returned no summary."),
    independentForecast: validateIndependentForecast(review.independentForecast),
    weatherEvidenceRead: validateWeatherEvidenceRead(review.weatherEvidenceRead),
    decisionPlan: validateDecisionPlan(review.decisionPlan),
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
    modelConsensus: validateModelConsensus(review.modelConsensus),
    bucketProbabilities: validateBucketProbabilities(review.bucketProbabilities),
    fairValue: validateFairValue(review.fairValue),
    observationTriggers: validateObservationTriggers(review.observationTriggers),
    settlementClock: validateSettlementClock(review.settlementClock),
    forecastChangeRead: readString(
      review.forecastChangeRead,
      "No forecast-change read was provided."
    ),
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
You independently interpret Kalshi market pricing, NWS data, Open-Meteo data, observations, and the normalized weather evidence packet when available.

When a weatherEvidence packet is provided, use it as the primary structured source for observation trend, observed high so far, remaining heating window, NWS/Open-Meteo forecast highs, NWS raw gridpoint evidence, Open-Meteo model evidence, ensemble spread, atmospheric conditions, bucket analysis, and source agreement. Use the raw NWS/Open-Meteo payloads as supporting detail.

For same-day daily-high events, explicitly evaluate: current winning bucket, observed high so far, latest reading, recent trend, remaining heating window, overshoot risk, cloud cover, wind, humidity, NWS grid maxTemperature, Open-Meteo HRRR/NBM/GFS/ECMWF model agreement, ensemble spread, and storm/outflow risk.

For tomorrow or future daily-high events, observations may be unavailable or irrelevant. Do not mark a future event insufficient only because there are no same-day observations. Use NWS daily/hourly/gridpoint forecast highs, Open-Meteo best-match/HRRR/NBM/GFS/ECMWF highs, and ensemble mean/spread as the primary evidence. Compare them to the available Kalshi range baskets and identify the forecast-supported basket if one exists.

For hourly temperature events, use NWS hourly forecast and Open-Meteo hourly forecast for the target local hour as the primary evidence.

The app may provide one app-selected candidate basket. Treat it only as a candidate to evaluate, not as a conclusion. You may agree, partially agree, disagree, recommend a different basket, recommend watching only, or recommend avoiding the event.

Daily high bucket rule: Kalshi buckets with midpoint tickers are true one-degree ranges. B74.5 means 74° to 75°, B80.5 means 80° to 81°, and B93.5 means 93° to 94°. Do not treat these as above-threshold markets. When translating a forecast temperature into a daily high bucket, floor the temperature to the lower whole degree and add one degree for the upper bound.

Your job is to explain what the data means, make an independent final-temperature/bucket forecast, and give an opinion on which basket, if any, is worth entering or worth watching.
Your confidence must reflect the reliability of the data and how strong the conclusion is at this moment.
Return only valid JSON matching the requested schema.
`;

  const userPayload = {
    task: "Independently review this Kalshi weather event and decide whether any YES basket is worth entering. Also assess the app-selected candidate basket if one is provided.",
    importantRules: [
      "Do not use any deterministic scanner score, signal, reasons, or risks.",
      "The appCandidateBasket is only a candidate. Do not assume it is correct.",
      "Use the weatherEvidence packet when available. It contains normalized observations, NWS daily/hourly/gridpoint highs, Open-Meteo model evidence, ensemble spread, trend, atmosphere, timing, bucket analysis, and model agreement.",
      "Daily high bucket mapping is floor-to-next-degree: 74.5 = 74° to 75°, 80.5 = 80° to 81°, 93.5 = 93° to 94°. Do not describe midpoint-coded daily buckets as above-threshold markets.",
      "For same-day events, discuss observed high so far, whether the candidate bucket is already hit, overshoot risk, recent trend, and remaining heating window.",
      "For tomorrow/future daily-high events, use NWS and Open-Meteo forecast highs as primary evidence even when observations are missing.",
      "For future events, identify the forecast-supported basket and compare it to market pricing.",
      "Explicitly assess whether you agree, partially agree, or disagree with the app candidate.",
      "If you disagree with the app candidate, explain why and identify a better basket if one exists.",
      "Do not say to enter unless the forecast agreement, price, and risk/reward are strong enough.",
      "A low-confidence or watch-only answer is acceptable.",
      "Give a true confidence percentage based on data reliability, agreement between sources, timing, and market pricing.",
      "Build a compact model-consensus table that weights official station observations highest for same-day markets, HRRR/NBM/NWS hourly strongly for near-term markets, and NWS grid/ECMWF/ensemble spread strongly for tomorrow/future markets.",
      "Return a bucket probability distribution across the most realistic buckets, a fair-value estimate, and price discipline. A good forecast is not a good trade if the ask is above fair value.",
      "Include advisory observation triggers and settlement-clock logic: remaining heating window, peak-heating status, and what exact print/model/price condition changes the action.",
      "If recommending entry, specify the exact basket ticker and label if identifiable.",
      "Mention a preferred maximum entry price and fair value estimate when possible.",
      "Give concrete next-observation or forecast-update triggers that would change the decision.",
    ],
    outputSchema: {
      action: "ENTER_YES | WATCH_ONLY | AVOID | INSUFFICIENT_DATA",
      recommendedBasketTicker: "string or null",
      recommendedBasketLabel: "string or null",
      confidence: "low | medium | high",
      trueConfidencePercent: "number from 0 to 100 or null",
      summary: "plain-English independent opinion with your independent most-likely bucket/temperature read",
      independentForecast: {
        predictedHighF: "number or null",
        mostLikelyBucket: "string or null, such as 89° to 90°",
        secondMostLikelyBucket: "string or null",
        probabilityEstimate: "plain-English probability estimate with any meaningful threshold odds, such as 55-60% chance of 91+",
        confidencePercent: "number from 0 to 100 or null",
        reasoning: "explain the independent final-temperature/bucket forecast",
      },
      weatherEvidenceRead: {
        observationTrend: "latest temp, observed high so far, recent trend, and whether any candidate bucket is already hit",
        forecastRead: "NWS/Open-Meteo forecast highs and model agreement/disagreement",
        atmosphericRead: "clouds, wind, humidity, radiation, storm/outflow risk and how they affect heating",
        marketPricingRead: "market pricing, app candidate price, favorite basket, and whether price has already corrected",
        timingRead: "remaining heating window, next obs timing, and settlement timing",
      },
      decisionPlan: {
        immediateAction: "what to do now: enter, watch, avoid, wait, hedge, or no action",
        nextObservationTrigger: "specific next observation/forecast update that would change the action",
        invalidationSignal: "specific evidence that proves this read wrong",
        upsideScenario: "best-case scenario for the candidate/recommended basket",
        downsideScenario: "main way this candidate/recommended basket loses",
      },
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
          "what observations and trend mean; for same-day events include observed high so far, latest reading, and overshoot/undershoot risk; for future events state that observations are not yet useful and forecast data is primary",
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
      modelConsensus: [
        {
          source: "NWS daily | NWS hourly | NWS grid | Station observations | Open-Meteo Best Match | HRRR | NBM | GFS | ECMWF | Ensemble",
          forecastHighF: "number or null",
          bucket: "daily high bucket as true range, such as 93° to 94°, or null",
          weight: "very_high | high | medium_high | medium | low | context",
          notes: "what this source contributes and any caveat",
        },
      ],
      bucketProbabilities: [
        {
          bucket: "bucket label, such as 91° to 92°",
          probabilityPercent: "estimated probability from 0 to 100",
          fairValueEstimate: "fair YES price as decimal dollars, e.g. 0.42, or null",
          reasoning: "why this bucket has this probability",
        },
      ],
      fairValue: {
        modelImpliedProbabilityPercent: "number from 0 to 100 or null",
        fairYesPrice: "decimal dollars 0 to 1 or null",
        currentYesAsk: "decimal dollars 0 to 1 or null",
        currentYesBid: "decimal dollars 0 to 1 or null",
        edgeCents: "fair value minus current ask in cents, or null",
        maxEntryPrice: "maximum reasonable YES entry in decimal dollars or null",
        priceDiscipline: "explain whether the forecast is good but price is bad, or forecast and price both support entry/watch/avoid",
      },
      observationTriggers: [
        {
          trigger: "specific observation/model/price condition",
          action: "what manual action to consider",
          urgency: "low | medium | high",
        },
      ],
      settlementClock: {
        localTimeNow: "string or null",
        remainingHeatingWindow: "plain-English heating-window read",
        peakHeatingPassed: "boolean or null",
        settlementTimingRead: "how timing affects entry/watch/avoid decision",
      },
      forecastChangeRead: "explain whether forecasts/models appear to be warming, cooling, stable, converging, diverging, or unavailable based on the packet",

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
