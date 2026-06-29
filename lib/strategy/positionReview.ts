import type { PositionReviewResult } from "@/types/positionReview";

type ReviewPosition = {
  ticker: string;
  side: "yes" | "no" | "flat" | "unknown";
  contractCount: number | null;
  marketExposureDollars: number | null;
  feesPaidDollars: number | null;
  estimatedEntryPrice: number | null;
  currentBidPrice: number | null;
  hasCurrentBid: boolean;
  currentExitValueDollars: number | null;
  unrealizedPnlAfterFeesDollars: number | null;
  totalPnlDollars: number | null;
  maxPayoutDollars: number | null;
  remainingUpsideIfWinDollars: number | null;
  riskIfHeldInsteadOfSoldDollars: number | null;
  allInCostDollars: number | null;
  breakEvenBidPrice: number | null;
};

type ReviewWeather = {
  bucketRead?: {
    heldBucket?: string | null;
    observedBucket?: string | null;
    nwsBucket?: string | null;
    openMeteoBucket?: string | null;
    effectiveObservedFloorF?: number | null;
    observedFloorStatus?: string | null;
  };
};

type ReviewBasketMarket = {
  ticker: string;
  label: string;
  yesBid: number | null;
  yesAskFromNoBid: number | null;
  impliedProbability: number | null;
  isHeld: boolean;
};

export type RunPositionReviewInput = {
  position: ReviewPosition;
  weather: ReviewWeather | null;
  basketMarkets: ReviewBasketMarket[];
  aiReviewRequested?: boolean;
};

function formatDollars(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "unknown";
  }

  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "unknown";
  }

  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isSameBucket(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) {
    return false;
  }

  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function getBestRollCandidate(
  basketMarkets: ReviewBasketMarket[],
  heldTicker: string
) {
  const candidates = basketMarkets
    .filter((market) => market.ticker !== heldTicker)
    .filter((market) => market.impliedProbability !== null)
    .sort(
      (a, b) =>
        (b.impliedProbability ?? 0) - (a.impliedProbability ?? 0)
    );

  return candidates[0] ?? null;
}

function getHeldMarket(basketMarkets: ReviewBasketMarket[]) {
  return basketMarkets.find((market) => market.isHeld) ?? null;
}

export function runDeterministicPositionReview(
  input: RunPositionReviewInput
): PositionReviewResult {
  const position = input.position;
  const weather = input.weather;
  const aiReviewRequested = Boolean(input.aiReviewRequested);

  const heldBucket = weather?.bucketRead?.heldBucket ?? null;
  const observedBucket = weather?.bucketRead?.observedBucket ?? null;
  const nwsBucket = weather?.bucketRead?.nwsBucket ?? null;
  const openMeteoBucket = weather?.bucketRead?.openMeteoBucket ?? null;
  const observedFloorStatus =
    weather?.bucketRead?.observedFloorStatus ?? null;

  const supportedBy: string[] = [];
  let conflictCount = 0;

  if (observedFloorStatus === "active" || observedFloorStatus === "complete") {
    if (isSameBucket(observedBucket, heldBucket)) {
      supportedBy.push("Observed floor");
    } else if (observedBucket) {
      conflictCount += 1;
    }
  }

  if (isSameBucket(nwsBucket, heldBucket)) {
    supportedBy.push("NWS");
  } else if (nwsBucket) {
    conflictCount += 1;
  }

  if (isSameBucket(openMeteoBucket, heldBucket)) {
    supportedBy.push("Open-Meteo");
  } else if (openMeteoBucket) {
    conflictCount += 1;
  }

  const heldMarket = getHeldMarket(input.basketMarkets);
  const rollCandidate = getBestRollCandidate(
    input.basketMarkets,
    position.ticker
  );

  const heldProbability = heldMarket?.impliedProbability ?? null;
  const bestOtherProbability = rollCandidate?.impliedProbability ?? null;
  const betterBasketEdge =
    heldProbability !== null && bestOtherProbability !== null
      ? bestOtherProbability - heldProbability
      : null;

  const pnl = position.unrealizedPnlAfterFeesDollars;
  const exposure = position.marketExposureDollars ?? 0;
  const hasProfit = pnl !== null && pnl > 0;
  const hasMeaningfulLoss =
    pnl !== null && exposure > 0 && pnl <= -0.25 * exposure;

  const reasons: string[] = [];
  const risks: string[] = [];

  reasons.push(
    `You hold ${position.side.toUpperCase()} on ${heldBucket ?? position.ticker}.`
  );

  reasons.push(
    `Selling now is estimated at ${formatDollars(
      position.currentExitValueDollars
    )} using a current bid of ${formatPrice(position.currentBidPrice)}.`
  );

  reasons.push(
    `Current unrealized P/L after fees is ${formatDollars(pnl)}.`
  );

  if (supportedBy.length > 0) {
    reasons.push(`The held bucket is currently supported by: ${supportedBy.join(", ")}.`);
  } else {
    reasons.push("The held bucket is not currently supported by the available weather reads.");
  }

  if (nwsBucket) {
    reasons.push(`NWS currently supports ${nwsBucket}.`);
  }

  if (openMeteoBucket) {
    reasons.push(`Open-Meteo currently supports ${openMeteoBucket}.`);
  }

  if (observedFloorStatus === "not_started") {
    reasons.push("Observed-floor data is not active yet because the event date has not started.");
  }

  if (!position.hasCurrentBid) {
    risks.push("There is no current bid on the held side, so the sell-now value may be effectively zero until liquidity appears.");
  }

  if (conflictCount > 0) {
    risks.push("At least one weather source currently points away from the held bucket.");
  }

  if (betterBasketEdge !== null && betterBasketEdge >= 0.1 && rollCandidate) {
    risks.push(
      `Another basket appears materially favored by market pricing: ${rollCandidate.label}.`
    );
  }

  let action: PositionReviewResult["action"] = "WATCH_CLOSELY";
  let confidence: PositionReviewResult["confidence"] = "medium";

  if (position.side !== "yes" && position.side !== "no") {
    action = "NO_ACTION";
    confidence = "low";
    reasons.push("The position side is not clearly YES or NO.");
  } else if (supportedBy.length >= 2 && hasProfit) {
    action = "HOLD_OR_TRIM_PROFIT";
    confidence = "medium";
    reasons.push("The position is profitable and multiple weather reads support the held bucket.");
  } else if (supportedBy.length >= 2) {
    action = "HOLD";
    confidence = "medium";
    reasons.push("Multiple weather reads support the held bucket.");
  } else if (
    betterBasketEdge !== null &&
    betterBasketEdge >= 0.1 &&
    rollCandidate
  ) {
    action = "ROLL_TO_BETTER_BUCKET";
    confidence = "medium";
    reasons.push(
      `Market pricing favors ${rollCandidate.label} by about ${(betterBasketEdge * 100).toFixed(
        1
      )} percentage points over the held basket.`
    );
  } else if (hasMeaningfulLoss && supportedBy.length === 0) {
    action = "CUT_LOSS";
    confidence = "medium";
    reasons.push("The position is down meaningfully and current weather reads do not support the held bucket.");
  } else if (hasProfit && supportedBy.length === 1) {
    action = "HOLD_OR_TRIM_PROFIT";
    confidence = "low";
    reasons.push("The position is profitable, but only one weather read currently supports the held bucket.");
  } else {
    action = "WATCH_CLOSELY";
    confidence = "low";
    reasons.push("The signal is mixed or incomplete, so this should be monitored closely rather than treated as a strong action.");
  }

  const summary =
    action === "HOLD"
      ? "Hold is reasonable based on the current deterministic read."
      : action === "HOLD_OR_TRIM_PROFIT"
        ? "Holding is still reasonable, but trimming profit may be worth considering."
        : action === "ROLL_TO_BETTER_BUCKET"
          ? "A roll may be worth considering because another basket looks better supported."
          : action === "CUT_LOSS"
            ? "Cutting the loss may be worth considering because the held bucket is not currently supported."
            : action === "NO_ACTION"
              ? "No action recommendation is available for this position."
              : "Watch closely. The current read is not strong enough for a confident hold or exit.";

  return {
    action,
    confidence,
    summary,
    reasons,
    risks,
    sellNow: {
      exitValueDollars: position.currentExitValueDollars,
      currentBidPrice: position.currentBidPrice,
      unrealizedPnlAfterFeesDollars: position.unrealizedPnlAfterFeesDollars,
    },
    holdToExpiration: {
      maxPayoutDollars: position.maxPayoutDollars,
      remainingUpsideIfWinDollars: position.remainingUpsideIfWinDollars,
      riskIfHeldInsteadOfSoldDollars:
        position.riskIfHeldInsteadOfSoldDollars,
    },
    weatherRead: {
      heldBucket,
      observedBucket:
        observedFloorStatus === "not_started" ? null : observedBucket,
      nwsBucket,
      openMeteoBucket,
      observedFloorStatus,
      supportedBy,
      conflictCount,
    },
    rollCandidate: rollCandidate
      ? {
          ticker: rollCandidate.ticker,
          label: rollCandidate.label,
          impliedProbability: rollCandidate.impliedProbability,
          yesBid: rollCandidate.yesBid,
          yesAskFromNoBid: rollCandidate.yesAskFromNoBid,
        }
      : null,
    aiReviewRequested,
    aiReviewNote: aiReviewRequested
      ? "AI review is toggled on, but this milestone only returns the deterministic review. The next milestone will send this structured review package to OpenAI."
      : null,
  };
}