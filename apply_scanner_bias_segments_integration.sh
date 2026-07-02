#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
TARGET="$ROOT/components/events/EventScannerClient.tsx"

if [[ ! -f "$ROOT/package.json" ]]; then
  echo "Run this script from the repo root where package.json exists."
  exit 1
fi

if [[ ! -f "$TARGET" ]]; then
  echo "Missing $TARGET"
  exit 1
fi

python - <<'PY'
from pathlib import Path

path = Path("components/events/EventScannerClient.tsx")
text = path.read_text()

old = '''type ScannerLeadTimeBiasRow = {
  source: string;
  leadTimeBucket: LeadTimeBucket;
  leadTimeLabel: string;
  sampleCount: number;
  meanErrorF: number | null;
  meanAbsoluteErrorF: number | null;
  exactBucketCount: number;
  withinOneBucketCount: number;
  notes: string;
};'''
new = '''type ScannerLeadTimeBiasRow = {
  source: string;
  leadTimeBucket: LeadTimeBucket | string;
  leadTimeLabel?: string | null;
  stationId?: string | null;
  stationName?: string | null;
  eventFamily?: EventScannerFamily | string | null;
  sampleCount: number;
  meanErrorF: number | null;
  meanAbsoluteErrorF: number | null;
  meanLeadTimeHours?: number | null;
  exactBucketCount: number;
  exactBucketRate?: number | null;
  withinOneBucketCount: number;
  withinOneBucketRate?: number | null;
  notes?: string | null;
  read?: string | null;
};'''
if old not in text:
    raise SystemExit("Could not find ScannerLeadTimeBiasRow type block to replace.")
text = text.replace(old, new)

old = '''function normalizeLeadTimeBucket(value: LeadTimeBucket): LeadTimeBucket {
  // Older generated clients may have rendered the 18–30h label with a unicode dash.
  return value;
}'''
new = '''function normalizeLeadTimeBucket(value: unknown): LeadTimeBucket {
  if (typeof value !== "string") {
    return "unknown";
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/\s+/g, " ");

  if (!normalized) return "unknown";
  if (normalized.includes("after")) return "after_peak";
  if (normalized.includes("0-3") || normalized.includes("0_3")) return "0_3h_before_peak";
  if (normalized.includes("3-6") || normalized.includes("3_6")) return "3_6h_before_peak";
  if (normalized.includes("6-12") || normalized.includes("6_12")) return "6_12h_before_peak";
  if (normalized.includes("12-18") || normalized.includes("12_18")) return "12_18h_before_peak";
  if (normalized.includes("18-30") || normalized.includes("18_30")) return "18_30h_before_peak";
  if (normalized.includes("30-48") || normalized.includes("30_48")) return "30_48h_before_peak";
  if (normalized.includes("2-5d") || normalized.includes("2_5d") || normalized.includes("2-5 d")) return "2_5d_before_peak";

  return "unknown";
}'''
if old not in text:
    raise SystemExit("Could not find normalizeLeadTimeBucket function to replace.")
text = text.replace(old, new)

marker = '''function dailyHighBucketLabelFromTemperature(tempF: number | null) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const lower = Math.floor(tempF);
  return `${lower}° to ${lower + 1}°`;
}
'''
insert = '''function normalizedText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function biasRowMatchesEvent(row: ScannerLeadTimeBiasRow, event: EventScannerResult) {
  const family = row.eventFamily ? String(row.eventFamily) : null;
  if (family && family !== event.family) {
    return false;
  }

  return true;
}

function biasRowMatchesLocation(row: ScannerLeadTimeBiasRow, event: EventScannerResult) {
  const rowStation = normalizedText(row.stationName ?? row.stationId ?? null);
  const eventLocation = normalizedText(event.locationName);

  if (!rowStation || !eventLocation) {
    return false;
  }

  if (rowStation.includes(eventLocation) || eventLocation.includes(rowStation)) {
    return true;
  }

  const eventTokens = eventLocation.split(" ").filter((token) => token.length >= 4);
  return eventTokens.some((token) => rowStation.includes(token));
}

'''
if marker not in text:
    raise SystemExit("Could not find dailyHighBucketLabelFromTemperature marker.")
text = text.replace(marker, marker + insert)

old = '''  const rows = (biasSummary?.leadTimeRows ?? []).filter((row) => normalizeLeadTimeBucket(row.leadTimeBucket) === leadBucket);
  const usableRows = rows.filter((row) => row.sampleCount >= 2 && row.meanAbsoluteErrorF !== null);'''
new = '''  const sameLeadRows = (biasSummary?.leadTimeRows ?? []).filter((row) => normalizeLeadTimeBucket(row.leadTimeBucket) === leadBucket);
  const sameFamilyRows = sameLeadRows.filter((row) => biasRowMatchesEvent(row, event));
  const sameLocationRows = sameFamilyRows.filter((row) => biasRowMatchesLocation(row, event));
  const rows = sameLocationRows.length ? sameLocationRows : sameFamilyRows.length ? sameFamilyRows : sameLeadRows;
  const usableRows = rows.filter((row) => row.sampleCount >= 2 && row.meanAbsoluteErrorF !== null);'''
if old not in text:
    raise SystemExit("Could not find lead-time rows filter to replace.")
text = text.replace(old, new)

old = '''      note: `No resolved samples are available for scans run ${lead.label.toLowerCase()}. Ranking is using live forecast evidence only.`,'''
new = '''      note: `No resolved lead-time segment samples are available for scans run ${lead.label.toLowerCase()}. Ranking is using live forecast evidence only.`,'''
text = text.replace(old, new)

old = '''    headline: best ? `${best.source} has been strongest ${lead.label.toLowerCase()}` : `Lead-time samples exist for ${lead.label.toLowerCase()}`,
    note: `Historical forecasts at this lead time are ${direction}. ${adjustedText}`,'''
new = '''    headline: best ? `${best.source} has been strongest ${lead.label.toLowerCase()}` : `Lead-time samples exist for ${lead.label.toLowerCase()}`,
    note: `${best?.read ?? `Historical forecasts at this lead time are ${direction}.`} ${adjustedText}`,'''
if old not in text:
    raise SystemExit("Could not find bias read headline/note block to replace.")
text = text.replace(old, new)

old = '''      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ limit: "500" });
      const response = await fetch(`/api/weather/history/bias?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to load bias summary.");
      }

      setScannerBiasSummary(body.summary ?? null);
      setScannerBiasStatus("Lead-time bias loaded");'''
new = '''      const idToken = await user.getIdToken();
      const segmentParams = new URLSearchParams({ limit: "1500" });
      const segmentResponse = await fetch(`/api/weather/history/bias/segments?${segmentParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const segmentBody = await segmentResponse.json();

      if (segmentResponse.ok && Array.isArray(segmentBody.rows)) {
        const segmentRows = segmentBody.rows.map((row: ScannerLeadTimeBiasRow) => ({
          ...row,
          leadTimeBucket: normalizeLeadTimeBucket(row.leadTimeBucket),
          leadTimeLabel: row.leadTimeLabel ?? String(row.leadTimeBucket ?? "Unknown lead time"),
          notes: row.notes ?? row.read ?? "Lead-time segment sample.",
        }));

        setScannerBiasSummary({ leadTimeRows: segmentRows });
        setScannerBiasStatus(`${segmentRows.length} lead-time bias segments loaded`);
        return;
      }

      const params = new URLSearchParams({ limit: "500" });
      const response = await fetch(`/api/weather/history/bias?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? segmentBody?.error ?? "Unable to load bias summary.");
      }

      setScannerBiasSummary(body.summary ?? null);
      setScannerBiasStatus("Broad bias summary loaded");'''
if old not in text:
    raise SystemExit("Could not find loadScannerBiasSummary fetch block to replace.")
text = text.replace(old, new)

path.write_text(text)
print("Updated components/events/EventScannerClient.tsx to use lead-time bias segments.")
PY

echo "Scanner lead-time bias segment integration applied. Run npm run build next."
