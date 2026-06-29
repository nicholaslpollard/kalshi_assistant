import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import {
  getKalshiEvent,
  getKalshiMarket,
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

function pickMarketPriceDollars(
  market: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    const value = toNumber(market[key]);

    if (value === null) {
      continue;
    }

    if (key.includes("dollars")) {
      return value;
    }

    return value / 100;
  }

  return null;
}

function getMarketLabel(market: Record<string, unknown>) {
  const subtitle = market.subtitle;
  const title = market.title;
  const yesSubtitle = market.yes_sub_title;
  const ticker = market.ticker;

  if (typeof subtitle === "string" && subtitle.trim()) {
    return subtitle;
  }

  if (typeof yesSubtitle === "string" && yesSubtitle.trim()) {
    return yesSubtitle;
  }

  if (typeof title === "string" && title.trim()) {
    return title;
  }

  return typeof ticker === "string" ? ticker : "Unknown basket";
}

function normalizeEventBasketMarket(
  market: Record<string, unknown>,
  heldTicker: string
) {
  const ticker = typeof market.ticker === "string" ? market.ticker : "";

  const yesBid = pickMarketPriceDollars(market, [
    "yes_bid_dollars",
    "yes_bid",
    "yes_price_dollars",
    "yes_price",
    "last_price_dollars",
    "last_price",
  ]);

  const noBid = pickMarketPriceDollars(market, [
    "no_bid_dollars",
    "no_bid",
    "no_price_dollars",
    "no_price",
  ]);

  const yesAskFromNoBid = noBid !== null ? 1 - noBid : null;
  const noAskFromYesBid = yesBid !== null ? 1 - yesBid : null;

  const impliedProbability =
    yesBid !== null
      ? yesBid
      : yesAskFromNoBid !== null
        ? yesAskFromNoBid
        : null;

  return {
    ticker,
    label: getMarketLabel(market),
    yesBid,
    yesAskFromNoBid,
    noBid,
    noAskFromYesBid,
    impliedProbability,
    volume: toNumber(market.volume),
    openInterest: toNumber(market.open_interest),
    status: market.status ?? null,
    isHeld: ticker === heldTicker,
    raw: market,
  };
}

function sortBasketMarkets(
  markets: ReturnType<typeof normalizeEventBasketMarket>[]
) {
  return markets.slice().sort((a, b) => {
    if (a.isHeld && !b.isHeld) {
      return -1;
    }

    if (!a.isHeld && b.isHeld) {
      return 1;
    }

    if (a.impliedProbability !== null && b.impliedProbability !== null) {
      return b.impliedProbability - a.impliedProbability;
    }

    return a.ticker.localeCompare(b.ticker);
  });
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

  const maxPayoutDollars = contractCount;

  const remainingUpsideIfWinDollars =
    maxPayoutDollars !== null && currentExitValueDollars !== null
      ? maxPayoutDollars - currentExitValueDollars
      : null;

  const riskIfHeldInsteadOfSoldDollars = currentExitValueDollars;

  const allInCostDollars =
    marketExposureDollars !== null
      ? marketExposureDollars + (feesPaidDollars ?? 0)
      : null;

  const breakEvenBidPrice =
    contractCount && allInCostDollars !== null && contractCount > 0
      ? allInCostDollars / contractCount
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
    maxPayoutDollars,
    remainingUpsideIfWinDollars,
    riskIfHeldInsteadOfSoldDollars,
    allInCostDollars,
    breakEvenBidPrice,
    lastUpdatedTs: position.last_updated_ts ?? null,
    raw: position,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: encodedTicker } = await context.params;
    const ticker = decodeURIComponent(encodedTicker);

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

    const positionsResult = await getKalshiPositions(credentials);

    if (!positionsResult.ok) {
      return NextResponse.json(
        {
          error: "Unable to fetch Kalshi positions.",
          kalshiStatus: positionsResult.status,
          kalshiStatusText: positionsResult.statusText,
          kalshiBody: getSafeKalshiError(positionsResult.rawText),
        },
        { status: 502 }
      );
    }

    const position = positionsResult.data?.market_positions?.find(
      (item) => item.ticker === ticker
    );

    if (!position) {
      return NextResponse.json(
        { error: "Position not found for this ticker." },
        { status: 404 }
      );
    }

    const [marketResult, orderbookResult] = await Promise.all([
      getKalshiMarket(ticker, credentials),
      getKalshiMarketOrderbook(ticker, credentials),
    ]);

    const orderbook = orderbookResult.ok ? orderbookResult.data : null;
    const market = marketResult.ok ? marketResult.data?.market ?? null : null;

    const eventTicker =
      market && typeof market.event_ticker === "string"
        ? market.event_ticker
        : null;

    const eventResult = eventTicker
      ? await getKalshiEvent(eventTicker, credentials)
      : null;

    const eventMarkets =
      eventResult?.ok && Array.isArray(eventResult.data?.event?.markets)
        ? eventResult.data.event.markets
        : [];

    const basketMarkets = sortBasketMarkets(
      eventMarkets.map((eventMarket) =>
        normalizeEventBasketMarket(eventMarket, ticker)
      )
    );

    return NextResponse.json({
      ok: true,
      ticker,
      position: normalizePosition(
        position as Record<string, unknown>,
        orderbook
      ),
      market,
      event: eventResult?.ok ? eventResult.data?.event ?? null : null,
      basketMarkets,
      orderbook,
      diagnostics: {
        marketStatus: marketResult.status,
        marketOk: marketResult.ok,
        orderbookStatus: orderbookResult.status,
        orderbookOk: orderbookResult.ok,
        eventTicker,
        eventStatus: eventResult?.status ?? null,
        eventOk: eventResult?.ok ?? false,
      },
    });
  } catch (error) {
    console.error("Position detail API failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown position detail error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}