import type { EncryptedPayload } from "@/lib/crypto/encryption";

export type EncryptedCredentialDocument = {
  kalshiApiKeyId?: EncryptedPayload;
  kalshiPrivateKey?: EncryptedPayload;
  openAiApiKey?: EncryptedPayload;
  hasKalshiApiKeyId?: boolean;
  hasKalshiPrivateKey?: boolean;
  hasOpenAiApiKey?: boolean;
  updatedAt?: unknown;
};

export type DecryptedKalshiCredentials = {
  apiKeyId: string;
  privateKey: string;
};

export type DecryptedOpenAiCredentials = {
  apiKey: string;
};