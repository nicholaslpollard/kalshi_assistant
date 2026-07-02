import { adminDb } from "@/lib/firebase/admin";
import { resolvePendingTrackedWeatherEvents } from "@/lib/weather/weatherSettlementResolver";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CronUserSummary = {
  uid: string;
  checked: number;
  resolved: number;
  needsReview: number;
  errors: number;
  skipped: number;
};

function parseLimit(value: string | null, fallback: number, min: number, max: number) {
  const parsed = value ? Number(value) : fallback;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return {
      ok: false,
      reason:
        "CRON_SECRET is not configured. Add CRON_SECRET in Vercel and call this route with Authorization: Bearer <CRON_SECRET>.",
    };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  return authorization === expected
    ? { ok: true, reason: null }
    : { ok: false, reason: "Unauthorized cron request." };
}

export async function GET(request: Request) {
  const auth = isCronAuthorized(request);

  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const userLimit = parseLimit(url.searchParams.get("userLimit"), 100, 1, 500);
    const perUserLimit = parseLimit(url.searchParams.get("perUserLimit"), 25, 1, 100);

    const userSnapshot = await adminDb.collection("users").limit(userLimit).get();
    const summaries: CronUserSummary[] = [];

    for (const userDoc of userSnapshot.docs) {
      try {
        const summary = await resolvePendingTrackedWeatherEvents(userDoc.id, perUserLimit);
        summaries.push({
          uid: userDoc.id,
          checked: summary.checked,
          resolved: summary.resolved,
          needsReview: summary.needsReview,
          errors: summary.errors,
          skipped: summary.skipped,
        });
      } catch (error) {
        console.error(`Cron weather resolver failed for user ${userDoc.id}:`, error);
        summaries.push({
          uid: userDoc.id,
          checked: 0,
          resolved: 0,
          needsReview: 0,
          errors: 1,
          skipped: 0,
        });
      }
    }

    const totals = summaries.reduce(
      (acc, item) => ({
        users: acc.users + 1,
        checked: acc.checked + item.checked,
        resolved: acc.resolved + item.resolved,
        needsReview: acc.needsReview + item.needsReview,
        errors: acc.errors + item.errors,
        skipped: acc.skipped + item.skipped,
      }),
      { users: 0, checked: 0, resolved: 0, needsReview: 0, errors: 0, skipped: 0 }
    );

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      totals,
      users: summaries,
    });
  } catch (error) {
    console.error("Cron weather settlement tracking failed:", error);
    const message = error instanceof Error ? error.message : "Unknown cron resolver error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
