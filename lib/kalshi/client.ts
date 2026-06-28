import { createKalshiAuthHeaders } from "@/lib/kalshi/signing";

function getKalshiBaseUrl() {
  return process.env.KALSHI_BASE_URL || "https://external-api.kalshi.com";
}

export type KalshiClientCredentials = {
  apiKeyId: string;
  privateKey: string;
};

export async function kalshiGet<TResponse>(
  path: string,
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

  const headers = createKalshiAuthHeaders({
    apiKeyId: credentials.apiKeyId,
    privateKeyPem: credentials.privateKey,
    method,
    path,
  });

  const response = await fetch(`${baseUrl}${path}`, {
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