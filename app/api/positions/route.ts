import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import {
  getKalshiMarketOrderbook,
  getKalshiPositions,
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

function getSafeKalshiError(rawText: string) {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText.slice(0, 500);
  }
}

function getBestBidPriceDollars(
  orderbookResponse: KalshiOrderbookResponse | null | undefined,
  side: "yes" | "no" | "flat" | "unknown"
) {
  if (!orderbookResponse || (side !== "yes" && side !== "no")) {
    return null;
  }

  const fixedPointLevels =
    side === "yes"
      ? orderbookResponse.orderbook_fp?.yes_dollars
      : orderbookResponse.orderbook_fp?.no_dollars;

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
      ? orderbookResponse.orderbook?.yes
      : orderbookResponse.orderbook?.no;

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

function normalizePosition(
  position: Record<string, unknown>,
  orderbookResponse?: KalshiOrderbookResponse | null
) {
  const positionFp = toNumber(position.position_fp);
  const marketExposureDollars = toNumber(position.market_exposure_dollars);
  const feesPaidDollars = toNumber(position.fees_paid_dollars);
  const realizedPnlDollars = toNumber(position.realized_pnl_dollars);
  const totalTradedDollars = toNumber(position.total_traded_dollars);

  const contractCount =
    positionFp !== null && Number.isFinite(positionFp)
      ? Math.abs(positionFp)
      : null;

  const estimatedEntryPrice =
    contractCount && marketExposureDollars !== null && contractCount > 0
      ? marketExposureDollars / contractCount
      : null;

  const side =
    positionFp === null
      ? "unknown"
      : positionFp > 0
        ? "yes"
        : positionFp < 0
          ? "no"
          : "flat";

  const currentBidPrice = getBestBidPriceDollars(orderbookResponse, side);

  const currentExitValueDollars =
    contractCount !== null && currentBidPrice !== null
      ? contractCount * currentBidPrice
      : currentBidPrice === null && contractCount !== null
        ? 0
        : null;

  const unrealizedPnlBeforeFeesDollars =
    currentExitValueDollars !== null && marketExposureDollars !== null
      ? currentExitValueDollars - marketExposureDollars
      : null;

  const unrealizedPnlAfterFeesDollars =
    unrealizedPnlBeforeFeesDollars !== null
      ? unrealizedPnlBeforeFeesDollars - (feesPaidDollars ?? 0)
      : null;

  const totalPnlDollars =
    unrealizedPnlAfterFeesDollars !== null
      ? unrealizedPnlAfterFeesDollars + (realizedPnlDollars ?? 0)
      : null;

  return {
    ticker: String(position.ticker ?? ""),
    side,
    positionFp,
    contractCount,
    marketExposureDollars,
    feesPaidDollars,
    realizedPnlDollars,
    totalTradedDollars,
    estimatedEntryPrice,
    currentBidPrice,
    hasCurrentBid: currentBidPrice !== null,
    currentExitValueDollars,
    unrealizedPnlBeforeFeesDollars,
    unrealizedPnlAfterFeesDollars,
    totalPnlDollars,
    lastUpdatedTs: position.last_updated_ts ?? null,
    raw: position,
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
      return NextResponse.json(
        {
          error:
            "Kalshi credentials are not fully saved. Save and test credentials first.",
        },
        { status: 400 }
      );
    }

    const result = await getKalshiPositions(credentials);

    if (!result.ok) {
      console.error("Kalshi positions request failed:", {
        status: result.status,
        statusText: result.statusText,
        body: getSafeKalshiError(result.rawText),
      });

      return NextResponse.json(
        {
          error: "Unable to fetch Kalshi positions.",
          kalshiStatus: result.status,
          kalshiStatusText: result.statusText,
          kalshiBody: getSafeKalshiError(result.rawText),
        },
        { status: 502 }
      );
    }

    const marketPositions = result.data?.market_positions ?? [];

    const enrichedPositions = await Promise.all(
      marketPositions.map(async (position) => {
        const ticker = position.ticker;

        if (!ticker) {
          return normalizePosition(position as Record<string, unknown>);
        }

        const orderbookResult = await getKalshiMarketOrderbook(
          ticker,
          credentials
        );

        if (!orderbookResult.ok) {
          console.error("Kalshi orderbook request failed:", {
            ticker,
            status: orderbookResult.status,
            statusText: orderbookResult.statusText,
            body: getSafeKalshiError(orderbookResult.rawText),
          });

          return normalizePosition(position as Record<string, unknown>);
        }

        return normalizePosition(
          position as Record<string, unknown>,
          orderbookResult.data
        );
      })
    );

    return NextResponse.json({
      ok: true,
      count: enrichedPositions.length,
      positions: enrichedPositions,
    });
  } catch (error) {
    console.error("Positions API failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown positions API error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}