import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import {
  getKalshiBalance,
  getKalshiMarketOrderbook,
  getKalshiPositions,
  type KalshiMarketPosition,
  type KalshiOrderbookResponse,
} from "@/lib/kalshi/client";
import { NextResponse } from "next/server";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function centsToDollars(value: number) {
  return value / 100;
}

function pickBalanceValue(data: Record<string, unknown> | null) {
  if (!data) {
    return null;
  }

  const balanceInCents = toNumber(data.balance);

  if (balanceInCents !== null) {
    return centsToDollars(balanceInCents);
  }

  const dollarKeys = [
    "balance_dollars",
    "cash_balance_dollars",
    "available_balance_dollars",
    "portfolio_value_dollars",
  ];

  for (const key of dollarKeys) {
    const value = toNumber(data[key]);

    if (value !== null) {
      return value;
    }
  }

  const centKeys = ["cash_balance", "available_balance", "portfolio_value"];

  for (const key of centKeys) {
    const value = toNumber(data[key]);

    if (value !== null) {
      return centsToDollars(value);
    }
  }

  return null;
}

function getBestBidPriceDollars(
  orderbookResponse: KalshiOrderbookResponse | null | undefined,
  side: "yes" | "no"
) {
  const fixedPointLevels =
    side === "yes"
      ? orderbookResponse?.orderbook_fp?.yes_dollars
      : orderbookResponse?.orderbook_fp?.no_dollars;

  if (Array.isArray(fixedPointLevels) && fixedPointLevels.length > 0) {
    const prices = fixedPointLevels
      .map((level) => toNumber(level[0]))
      .filter((price): price is number => price !== null);

    if (prices.length > 0) {
      return Math.max(...prices);
    }
  }

  const legacyLevels =
    side === "yes"
      ? orderbookResponse?.orderbook?.yes
      : orderbookResponse?.orderbook?.no;

  if (Array.isArray(legacyLevels) && legacyLevels.length > 0) {
    const prices = legacyLevels
      .map((level) => toNumber(level[0]))
      .filter((price): price is number => price !== null);

    if (prices.length > 0) {
      return Math.max(...prices) / 100;
    }
  }

  return null;
}

async function summarizePositionsWithPricing(
  positions: KalshiMarketPosition[],
  credentials: {
    apiKeyId: string;
    privateKey: string;
  }
) {
  let openPositionCount = 0;
  let totalExposureDollars = 0;
  let totalFeesPaidDollars = 0;
  let totalRealizedPnlDollars = 0;
  let totalCurrentExitValueDollars = 0;
  let totalUnrealizedPnlBeforeFeesDollars = 0;
  let totalUnrealizedPnlAfterFeesDollars = 0;

  for (const position of positions) {
    const positionFp = toNumber(position.position_fp);

    if (positionFp === null || positionFp === 0) {
      continue;
    }

    openPositionCount += 1;

    const side = positionFp > 0 ? "yes" : "no";
    const contractCount = Math.abs(positionFp);
    const exposure = toNumber(position.market_exposure_dollars) ?? 0;
    const fees = toNumber(position.fees_paid_dollars) ?? 0;
    const realizedPnl = toNumber(position.realized_pnl_dollars) ?? 0;

    totalExposureDollars += exposure;
    totalFeesPaidDollars += fees;
    totalRealizedPnlDollars += realizedPnl;

    let currentExitValue = 0;

    if (position.ticker) {
      const orderbookResult = await getKalshiMarketOrderbook(
        position.ticker,
        credentials
      );

      if (orderbookResult.ok) {
        const currentBidPrice = getBestBidPriceDollars(
          orderbookResult.data,
          side
        );

        if (currentBidPrice !== null) {
          currentExitValue = contractCount * currentBidPrice;
        }
      }
    }

    const unrealizedBeforeFees = currentExitValue - exposure;
    const unrealizedAfterFees = unrealizedBeforeFees - fees;

    totalCurrentExitValueDollars += currentExitValue;
    totalUnrealizedPnlBeforeFeesDollars += unrealizedBeforeFees;
    totalUnrealizedPnlAfterFeesDollars += unrealizedAfterFees;
  }

  return {
    openPositionCount,
    totalExposureDollars,
    totalFeesPaidDollars,
    totalRealizedPnlDollars,
    totalCurrentExitValueDollars,
    totalUnrealizedPnlBeforeFeesDollars,
    totalUnrealizedPnlAfterFeesDollars,
    totalPnlDollars:
      totalRealizedPnlDollars + totalUnrealizedPnlAfterFeesDollars,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getDecryptedKalshiCredentials(user.uid);

    if (!credentials) {
      return NextResponse.json({
        ok: true,
        kalshiConnected: false,
        balanceDollars: null,
        openPositionCount: null,
        totalExposureDollars: null,
        totalFeesPaidDollars: null,
        totalRealizedPnlDollars: null,
        totalCurrentExitValueDollars: null,
        totalUnrealizedPnlBeforeFeesDollars: null,
        totalUnrealizedPnlAfterFeesDollars: null,
        totalPnlDollars: null,
        message: "Kalshi credentials are not saved.",
      });
    }

    const [balanceResult, positionsResult] = await Promise.all([
      getKalshiBalance(credentials),
      getKalshiPositions(credentials),
    ]);

    if (!balanceResult.ok) {
      return NextResponse.json({
        ok: true,
        kalshiConnected: false,
        balanceDollars: null,
        openPositionCount: null,
        totalExposureDollars: null,
        totalFeesPaidDollars: null,
        totalRealizedPnlDollars: null,
        totalCurrentExitValueDollars: null,
        totalUnrealizedPnlBeforeFeesDollars: null,
        totalUnrealizedPnlAfterFeesDollars: null,
        totalPnlDollars: null,
        message: "Kalshi balance check failed.",
      });
    }

    const marketPositions = positionsResult.ok
      ? positionsResult.data?.market_positions ?? []
      : [];

    const positionSummary = await summarizePositionsWithPricing(
      marketPositions,
      credentials
    );

    return NextResponse.json({
      ok: true,
      kalshiConnected: true,
      balanceDollars: pickBalanceValue(balanceResult.data),
      ...positionSummary,
      message: "Kalshi account summary loaded.",
    });
  } catch (error) {
    console.error("Account summary API failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown account summary error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}