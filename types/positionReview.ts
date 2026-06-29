export type PositionReviewAction =
  | "HOLD"
  | "WATCH_CLOSELY"
  | "HOLD_OR_TRIM_PROFIT"
  | "SELL_TO_LOCK_PROFIT"
  | "SELL_FULL_POSITION"
  | "CUT_LOSS"
  | "ROLL_TO_BETTER_BUCKET"
  | "NO_ACTION";

export type PositionReviewResult = {
  action: PositionReviewAction;
  confidence: "low" | "medium" | "high";
  summary: string;
  reasons: string[];
  risks: string[];
  sellNow: {
    exitValueDollars: number | null;
    currentBidPrice: number | null;
    unrealizedPnlAfterFeesDollars: number | null;
  };
  holdToExpiration: {
    maxPayoutDollars: number | null;
    remainingUpsideIfWinDollars: number | null;
    riskIfHeldInsteadOfSoldDollars: number | null;
  };
  weatherRead: {
    heldBucket: string | null;
    observedBucket: string | null;
    nwsBucket: string | null;
    openMeteoBucket: string | null;
    observedFloorStatus: string | null;
    supportedBy: string[];
    conflictCount: number;
  };
  rollCandidate: {
    ticker: string;
    label: string;
    impliedProbability: number | null;
    yesBid: number | null;
    yesAskFromNoBid: number | null;
  } | null;
  aiReviewRequested: boolean;
  aiReviewNote: string | null;
};