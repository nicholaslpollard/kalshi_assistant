import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const snapshot = await adminDb
      .collection("users")
      .doc(user.uid)
      .collection("private")
      .doc("credentials")
      .get();

    if (!snapshot.exists) {
      return NextResponse.json({
        ok: true,
        status: {
          hasKalshiApiKeyId: false,
          hasKalshiPrivateKey: false,
          hasOpenAiApiKey: false,
          updatedAt: null,
        },
      });
    }

    const data = snapshot.data();

    return NextResponse.json({
      ok: true,
      status: {
        hasKalshiApiKeyId: Boolean(data?.hasKalshiApiKeyId),
        hasKalshiPrivateKey: Boolean(data?.hasKalshiPrivateKey),
        hasOpenAiApiKey: Boolean(data?.hasOpenAiApiKey),
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      },
    });
  } catch (error) {
    console.error("Credential status API failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown credential status error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}