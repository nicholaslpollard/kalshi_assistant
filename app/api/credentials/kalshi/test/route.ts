import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import { getKalshiBalance } from "@/lib/kalshi/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getDecryptedKalshiCredentials(user.uid);

    if (!credentials) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kalshi credentials are not fully saved. Save both the API Key ID and private key first.",
        },
        { status: 400 }
      );
    }

    const result = await getKalshiBalance(credentials);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          status: result.status,
          statusText: result.statusText,
          error:
            "Kalshi connection test failed. Check that the API Key ID and private key match.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      connected: true,
      status: result.status,
      message: "Kalshi connection test succeeded.",
    });
  } catch (error) {
    console.error("Kalshi credential test failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown Kalshi credential test error";

    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: message,
      },
      { status: 500 }
    );
  }
}