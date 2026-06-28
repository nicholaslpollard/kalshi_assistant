import { createKalshiAuthHeaders } from "@/lib/kalshi/signing";

function getKalshiBaseUrl() {
  return process.env.KALSHI_BASE_URL || "https://external-api.kalshi.com";
}

function getPathForSignature(pathWithQuery: string) {
  return pathWithQuery.split("?")[0];
}

export type KalshiClientCredentials = {
  apiKeyId: string;
  privateKey: string;
};

export async function kalshiGet<TResponse>(
  pathWithQuery: string,
  credentials: KalshiClientCredentials
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  data: TResponse | null;
  rawText: string;
}> {
  const method = "GET";
  const baseUrl = getKalshiBaseUrl();
  const signaturePath = getPathForSignature(pathWithQuery);

  const headers = createKalshiAuthHeaders({
    apiKeyId: credentials.apiKeyId,
    privateKeyPem: credentials.privateKey,
    method,
    path: signaturePath,
  });

  const response = await fetch(`${baseUrl}${pathWithQuery}`, {
    method,
    headers: {
      ...headers,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const rawText = await response.text();

  let data: TResponse | null = null;

  try {
    data = rawText ? (JSON.parse(rawText) as TResponse) : null;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
    rawText,
  };
}

export async function getKalshiBalance(credentials: KalshiClientCredentials) {
  return kalshiGet<Record<string, unknown>>(
    "/trade-api/v2/portfolio/balance",
    credentials
  );
}

export type KalshiMarketPosition = {
  ticker: string;
  market_exposure_dollars?: string | number;
  fees_paid_dollars?: string | number;
  realized_pnl_dollars?: string | number;
  total_traded_dollars?: string | number;
  position?: number;
  position_fp?: string | number;
  yes_count?: number;
  no_count?: number;
  last_updated_ts?: string;
  [key: string]: unknown;
};

export type KalshiPositionsResponse = {
  cursor?: string;
  market_positions?: KalshiMarketPosition[];
  event_positions?: unknown[];
};

export async function getKalshiPositions(credentials: KalshiClientCredentials) {
  return kalshiGet<KalshiPositionsResponse>(
    "/trade-api/v2/portfolio/positions?count_filter=position",
    credentials
  );
}