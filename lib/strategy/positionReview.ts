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

function buildManualActionPlan(params: {
  action: PositionReviewResult["action"];
  position: ReviewPosition;
  heldBucket: string | null;
  rollCandidate: ReviewBasketMarket | null;
}): PositionReviewResult["manualActionPlan"] {
  const { action, position, heldBucket, rollCandidate } = params;

  const currentSellBid = position.currentBidPrice;
  const targetBuyAskEstimate = rollCandidate?.yesAskFromNoBid ?? null;

  const maxReasonableTargetEntry =
    targetBuyAskEstimate !== null
      ? Math.min(0.99, targetBuyAskEstimate + 0.03)
      : null;

  const minReasonableExit =
    currentSellBid !== null ? Math.max(0.01, currentSellBid - 0.03) : null;

  if (action === "ROLL_TO_BETTER_BUCKET" && rollCandidate) {
    return {
      title: "Manual roll plan",
      summary: `Consider manually rolling from ${heldBucket ?? position.ticker} into ${rollCandidate.label}, but only after confirming the live order book.`,
      urgency: "medium",
      steps: [
        `Review the current order book for your held contract: ${position.ticker}.`,
        `If the bid is still acceptable, consider selling your current ${position.side.toUpperCase()} position near the current bid.`,
        `Review the target basket order book: ${rollCandidate.ticker}.`,
        `Only consider buying the target basket if the ask is still near the estimated target entry range.`,
        "After any manual trade, refresh positions and run the position review again.",
      ],
      priceGuidance: {
        currentSellBid,
        targetBuyAskEstimate,
        maxReasonableTargetEntry,
        minReasonableExit,
      },
      checksBeforeActing: [
        "Confirm the Kalshi order book has not moved materially since this review loaded.",
        "Confirm the NWS and Open-Meteo buckets still favor the target basket.",
        "Confirm the observed floor has not changed if the event date is active.",
        "Avoid rolling if the spread is wide enough that the switch gives up too much value.",
      ],
      afterActionChecks: [
        "Refresh the position dashboard.",
        "Confirm the old position is reduced or closed.",
        "Confirm the new target position appears correctly.",
        "Run Position Review again on the new position.",
      ],
    };
  }

  if (action === "HOLD_OR_TRIM_PROFIT") {
    return {
      title: "Manual hold-or-trim plan",
      summary:
        "Holding remains reasonable, but you may consider trimming part of the position if the bid gives you a useful profit or reduces risk.",
      urgency: "low",
      steps: [
        "Review the current bid and exit value.",
        "Decide whether you want to hold the full position or manually sell a portion to reduce risk.",
        "If trimming, use a limit price near the current bid rather than accepting a poor spread.",
        "After any trim, refresh positions and run the position review again.",
      ],
      priceGuidance: {
        currentSellBid,
        targetBuyAskEstimate: null,
        maxReasonableTargetEntry: null,
        minReasonableExit,
      },
      checksBeforeActing: [
        "Confirm the held bucket is still supported by the latest weather read.",
        "Confirm the remaining upside is worth the risk if you hold.",
        "Check whether the bid is strong enough to justify trimming.",
      ],
      afterActionChecks: [
        "Refresh the position dashboard.",
        "Confirm the remaining contract count is correct.",
        "Run Position Review again.",
      ],
    };
  }

  if (action === "CUT_LOSS" || action === "SELL_FULL_POSITION") {
    return {
      title: "Manual exit plan",
      summary:
        "Consider manually exiting the position if the weather read and market pricing no longer support the held bucket.",
      urgency: "medium",
      steps: [
        `Review the current order book for ${position.ticker}.`,
        "Confirm the current bid is still available.",
        "If exiting, use a limit order near the current bid and avoid selling into an unusually poor spread.",
        "After selling, refresh positions and confirm the position is closed or reduced.",
      ],
      priceGuidance: {
        currentSellBid,
        targetBuyAskEstimate: null,
        maxReasonableTargetEntry: null,
        minReasonableExit,
      },
      checksBeforeActing: [
        "Confirm weather sources still point away from the held bucket.",
        "Confirm there is enough liquidity to exit without excessive slippage.",
        "Confirm you are comfortable giving up any remaining upside.",
      ],
      afterActionChecks: [
        "Refresh the position dashboard.",
        "Confirm the position is closed or reduced.",
        "Review whether another basket is worth entering separately.",
      ],
    };
  }

  if (action === "SELL_TO_LOCK_PROFIT") {
    return {
      title: "Manual profit-lock plan",
      summary:
        "Consider manually selling to lock profit if the current bid gives you enough return compared with the remaining upside.",
      urgency: "medium",
      steps: [
        "Review the current bid and sell-now value.",
        "Compare the secured profit against the remaining upside if the contract settles correctly.",
        "If locking profit, place a limit order near the current bid.",
        "Refresh positions after the order fills or partially fills.",
      ],
      priceGuidance: {
        currentSellBid,
        targetBuyAskEstimate: null,
        maxReasonableTargetEntry: null,
        minReasonableExit,
      },
      checksBeforeActing: [
        "Confirm the current bid is still available.",
        "Confirm whether holding still has a strong weather edge.",
        "Avoid selling if the spread widened and the bid is temporarily weak.",
      ],
      afterActionChecks: [
        "Refresh the position dashboard.",
        "Confirm realized and remaining exposure.",
        "Run Position Review again if any contracts remain.",
      ],
    };
  }

  if (action === "HOLD") {
    return {
      title: "Manual hold plan",
      summary:
        "No immediate manual trade is suggested. Continue monitoring the weather read and market price.",
      urgency: "low",
      steps: [
        "Do not place a trade based on the current deterministic review.",
        "Monitor NWS, Open-Meteo, observed floor status, and the sibling basket table.",
        "Refresh the position review when forecast or order-book conditions change.",
      ],
      priceGuidance: {
        currentSellBid,
        targetBuyAskEstimate: null,
        maxReasonableTargetEntry: null,
        minReasonableExit,
      },
      checksBeforeActing: [
        "Watch for NWS or Open-Meteo moving away from the held bucket.",
        "Watch for another basket becoming materially favored.",
        "Watch the observed floor once the event date starts.",
      ],
      afterActionChecks: [
        "No post-trade check is needed unless you manually act.",
        "Re-run review after material forecast or price changes.",
      ],
    };
  }

  return {
    title: "Manual watch plan",
    summary:
      "No clear manual action is suggested. The position should be monitored until the signal becomes stronger.",
    urgency: "low",
    steps: [
      "Do not place a trade based only on the current mixed signal.",
      "Refresh weather and Kalshi data periodically.",
      "Run Position Review again after meaningful market or forecast movement.",
    ],
    priceGuidance: {
      currentSellBid,
      targetBuyAskEstimate: null,
      maxReasonableTargetEntry: null,
      minReasonableExit,
    },
    checksBeforeActing: [
      "Wait for either stronger weather alignment or a better price opportunity.",
      "Check whether the order book has enough liquidity.",
      "Avoid acting on stale weather or stale bid/ask data.",
    ],
    afterActionChecks: [
      "If you manually trade later, refresh positions and run review again.",
    ],
  };
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
      manualActionPlan: buildManualActionPlan({
        action,
        position,
        heldBucket,
        rollCandidate,
    }),
    aiReviewRequested,
    aiReviewNote: null,
  };
}