import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { encryptText } from "@/lib/crypto/encryption";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";

const saveCredentialsSchema = z.object({
  kalshiApiKeyId: z.string().trim().min(1).optional(),
  kalshiPrivateKey: z.string().trim().min(1).optional(),
  openAiApiKey: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const user = await getServerUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const parsed = saveCredentialsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid credential payload" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (parsed.data.kalshiApiKeyId) {
    updates.kalshiApiKeyId = encryptText(parsed.data.kalshiApiKeyId);
    updates.hasKalshiApiKeyId = true;
  }

  if (parsed.data.kalshiPrivateKey) {
    updates.kalshiPrivateKey = encryptText(parsed.data.kalshiPrivateKey);
    updates.hasKalshiPrivateKey = true;
  }

  if (parsed.data.openAiApiKey) {
    updates.openAiApiKey = encryptText(parsed.data.openAiApiKey);
    updates.hasOpenAiApiKey = true;
  }

  await adminDb
    .collection("users")
    .doc(user.uid)
    .collection("private")
    .doc("credentials")
    .set(updates, { merge: true });

  return NextResponse.json({
    ok: true,
    saved: {
      kalshiApiKeyId: Boolean(parsed.data.kalshiApiKeyId),
      kalshiPrivateKey: Boolean(parsed.data.kalshiPrivateKey),
      openAiApiKey: Boolean(parsed.data.openAiApiKey),
    },
  });
}