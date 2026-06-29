import {
  runDeterministicPositionReview,
  type RunPositionReviewInput,
} from "@/lib/strategy/positionReview";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RunPositionReviewInput;

    if (!body.position) {
      return NextResponse.json(
        { error: "Position payload is required." },
        { status: 400 }
      );
    }

    const review = runDeterministicPositionReview({
      position: body.position,
      weather: body.weather ?? null,
      basketMarkets: body.basketMarkets ?? [],
      aiReviewRequested: body.aiReviewRequested ?? false,
    });

    return NextResponse.json({
      ok: true,
      review,
    });
  } catch (error) {
    console.error("Position review API failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown review API error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}