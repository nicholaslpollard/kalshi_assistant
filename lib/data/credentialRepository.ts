import { decryptText } from "@/lib/crypto/encryption";
import { adminDb } from "@/lib/firebase/admin";
import type {
  DecryptedKalshiCredentials,
  DecryptedOpenAiCredentials,
  EncryptedCredentialDocument,
} from "@/types/credentials";

export async function getEncryptedCredentialDocument(uid: string) {
  const snapshot = await adminDb
    .collection("users")
    .doc(uid)
    .collection("private")
    .doc("credentials")
    .get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data() as EncryptedCredentialDocument;
}

export async function getDecryptedKalshiCredentials(
  uid: string
): Promise<DecryptedKalshiCredentials | null> {
  const credentials = await getEncryptedCredentialDocument(uid);

  if (
    !credentials?.kalshiApiKeyId ||
    !credentials?.kalshiPrivateKey ||
    !credentials.hasKalshiApiKeyId ||
    !credentials.hasKalshiPrivateKey
  ) {
    return null;
  }

  return {
    apiKeyId: decryptText(credentials.kalshiApiKeyId),
    privateKey: decryptText(credentials.kalshiPrivateKey),
  };
}

export async function getDecryptedOpenAiCredentials(
  uid: string
): Promise<DecryptedOpenAiCredentials | null> {
  const credentials = await getEncryptedCredentialDocument(uid);

  if (!credentials?.openAiApiKey || !credentials.hasOpenAiApiKey) {
    return null;
  }

  return {
    apiKey: decryptText(credentials.openAiApiKey),
  };
}