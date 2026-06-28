import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import {
  getKalshiBalance,
  getKalshiPositions,
  type KalshiMarketPosition,
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

  /*
    Kalshi's balance endpoint commonly returns "balance" in cents.
    Example: balance: 1981 means $19.81.
  */
  const balanceInCents = toNumber(data.balance);

  if (balanceInCents !== null) {
    return centsToDollars(balanceInCents);
  }

  /*
    These are fallback names in case Kalshi changes or expands the response.
    If the field name says dollars, treat it as already dollar-denominated.
  */
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

  /*
    These fallback names are likely cent-denominated if they appear without
    "_dollars" in the field name.
  */
  const centKeys = [
    "cash_balance",
    "available_balance",
    "portfolio_value",
  ];

  for (const key of centKeys) {
    const value = toNumber(data[key]);

    if (value !== null) {
      return centsToDollars(value);
    }
  }

  return null;
}

function summarizePositions(positions: KalshiMarketPosition[]) {
  let openPositionCount = 0;
  let totalExposureDollars = 0;
  let totalFeesPaidDollars = 0;
  let totalRealizedPnlDollars = 0;

  for (const position of positions) {
    const positionFp = toNumber(position.position_fp);

    /*
      These fields are named *_dollars, so keep them as dollar values.
      Do not divide these by 100 unless we later confirm Kalshi is returning
      fixed-point cents despite the field name.
    */
    const exposure = toNumber(position.market_exposure_dollars);
    const fees = toNumber(position.fees_paid_dollars);
    const realizedPnl = toNumber(position.realized_pnl_dollars);

    if (positionFp !== null && positionFp !== 0) {
      openPositionCount += 1;
    }

    if (exposure !== null) {
      totalExposureDollars += exposure;
    }

    if (fees !== null) {
      totalFeesPaidDollars += fees;
    }

    if (realizedPnl !== null) {
      totalRealizedPnlDollars += realizedPnl;
    }
  }

  return {
    openPositionCount,
    totalExposureDollars,
    totalFeesPaidDollars,
    totalRealizedPnlDollars,
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
        message: "Kalshi balance check failed.",
      });
    }

    const marketPositions = positionsResult.ok
      ? positionsResult.data?.market_positions ?? []
      : [];

    const positionSummary = summarizePositions(marketPositions);

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