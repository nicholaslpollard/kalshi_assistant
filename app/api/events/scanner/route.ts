import { getServerUserFromRequest } from "@/lib/auth/getServerUser";
import { getDecryptedKalshiCredentials } from "@/lib/data/credentialRepository";
import { getKalshiEventsBySeriesList } from "@/lib/kalshi/client";
import { scanKalshiWeatherEvent } from "@/lib/strategy/eventScanner";
import type { EventScannerResponse } from "@/types/eventScanner";
import { NextResponse } from "next/server";

const HIGH_TEMP_SERIES = [
  "KXHIGHCHI",
  "KXHIGHDCA",
  "KXHIGHNYC",
  "KXHIGHAUS",
  "KXHIGHMIA",
  "KXHIGHLAX",
  "KXHIGHPHL",
  "KXHIGHBOS",
  "KXHIGHATL",
  "KXHIGHDEN",
];

export async function GET(request: Request) {
  try {
    const user = await getServerUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getDecryptedKalshiCredentials(user.uid);

    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "Kalshi credentials are not saved. Add them under Settings → Credentials.",
        },
        { status: 400 }
      );
    }

    const seriesResults = await getKalshiEventsBySeriesList(
      HIGH_TEMP_SERIES,
      credentials
    );

    const errors: string[] = [];
    const scanJobs: Array<Promise<Awaited<ReturnType<typeof scanKalshiWeatherEvent>>>> = [];

    for (const seriesResult of seriesResults) {
      if (!seriesResult.result.ok) {
        errors.push(
          `${seriesResult.seriesTicker}: ${seriesResult.result.status} ${seriesResult.result.statusText}`
        );
        continue;
      }

      const events = seriesResult.result.data?.events ?? [];

      for (const event of events) {
        scanJobs.push(scanKalshiWeatherEvent(event, seriesResult.seriesTicker));
      }
    }

    const scanned = await Promise.all(scanJobs);
    const results = scanned
      .filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((a, b) => b.score - a.score);

    const response: EventScannerResponse = {
      ok: true,
      generatedAt: new Date().toISOString(),
      results,
      diagnostics: {
        scannedSeries: HIGH_TEMP_SERIES,
        eventCount: scanJobs.length,
        resultCount: results.length,
        errors,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Event scanner failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown event scanner error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}