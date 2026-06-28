import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import { getKalshiPositions } from "@/lib/kalshi/client";
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

function normalizePosition(position: Record<string, unknown>) {
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
    lastUpdatedTs: position.last_updated_ts ?? null,
    raw: position,
  };
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

    return NextResponse.json({
      ok: true,
      count: marketPositions.length,
      positions: marketPositions.map((position) =>
        normalizePosition(position as Record<string, unknown>)
      ),
    });
  } catch (error) {
    console.error("Positions API failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown positions API error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}