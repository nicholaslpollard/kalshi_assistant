import crypto from "crypto";

export class KalshiPrivateKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KalshiPrivateKeyError";
  }
}

function normalizePrivateKey(privateKeyPem: string) {
  return privateKeyPem.trim();
}

function validatePrivateKeyShape(privateKeyPem: string) {
  const normalized = normalizePrivateKey(privateKeyPem);

  const hasBeginMarker =
    normalized.includes("-----BEGIN PRIVATE KEY-----") ||
    normalized.includes("-----BEGIN RSA PRIVATE KEY-----");

  const hasEndMarker =
    normalized.includes("-----END PRIVATE KEY-----") ||
    normalized.includes("-----END RSA PRIVATE KEY-----");

  if (!hasBeginMarker || !hasEndMarker) {
    throw new KalshiPrivateKeyError(
      "Saved Kalshi private key is not a valid PEM private key. Paste the full private key, including the BEGIN and END lines."
    );
  }

  return normalized;
}

export function createKalshiSignature(params: {
  privateKeyPem: string;
  timestampMs: string;
  method: string;
  path: string;
}) {
  const method = params.method.toUpperCase();
  const message = `${params.timestampMs}${method}${params.path}`;
  const normalizedPrivateKey = validatePrivateKeyShape(params.privateKeyPem);

  try {
    const privateKey = crypto.createPrivateKey({
      key: normalizedPrivateKey,
      format: "pem",
    });

    const signature = crypto.sign("sha256", Buffer.from(message, "utf8"), {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    return signature.toString("base64");
  } catch {
    throw new KalshiPrivateKeyError(
      "Saved Kalshi private key could not be parsed. Confirm that the full private key was pasted correctly."
    );
  }
}

export function createKalshiAuthHeaders(params: {
  apiKeyId: string;
  privateKeyPem: string;
  method: string;
  path: string;
}) {
  const timestampMs = Date.now().toString();

  const signature = createKalshiSignature({
    privateKeyPem: params.privateKeyPem,
    timestampMs,
    method: params.method,
    path: params.path,
  });

  return {
    "KALSHI-ACCESS-KEY": params.apiKeyId,
    "KALSHI-ACCESS-TIMESTAMP": timestampMs,
    "KALSHI-ACCESS-SIGNATURE": signature,
  };
}