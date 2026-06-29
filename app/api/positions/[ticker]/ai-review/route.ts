import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedOpenAiCredentials } from "@/lib/data/credentialRepository";
import { runPositionAiReview } from "@/lib/openai/positionAiReview";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getDecryptedOpenAiCredentials(user.uid);

    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is not saved. Add it under Settings → Credentials before using AI review.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.position || !body.deterministicReview) {
      return NextResponse.json(
        {
          error:
            "Position and deterministic review payloads are required for AI review.",
        },
        { status: 400 }
      );
    }

    const aiReview = await runPositionAiReview({
      apiKey: credentials.apiKey,
      position: body.position,
      weather: body.weather ?? null,
      basketMarkets: body.basketMarkets ?? [],
      deterministicReview: body.deterministicReview,
    });

    return NextResponse.json({
      ok: true,
      aiReview,
    });
  } catch (error) {
    console.error("AI position review failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown AI review error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}