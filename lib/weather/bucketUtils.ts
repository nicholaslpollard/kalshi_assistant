export type ParsedDailyHighBucket = {
  kind: "daily_high_range";
  raw: string;
  lowerF: number;
  upperF: number;
  label: string;
  kalshiCode: string;
};

export type ParsedHourlyThreshold = {
  kind: "hourly_threshold";
  raw: string;
  thresholdF: number;
  label: string;
  kalshiCode: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stripTrailingZero(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function dailyHighBucketFromTemperatureF(value: unknown): string | null {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!isFiniteNumber(numeric)) {
    return null;
  }

  const lower = Math.floor(numeric);
  return `${lower}° to ${lower + 1}°`;
}

export function dailyHighBucketCodeFromTemperatureF(value: unknown): string | null {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (!isFiniteNumber(numeric)) {
    return null;
  }

  const lower = Math.floor(numeric);
  return `B${stripTrailingZero(lower + 0.5)}`;
}

export function parseDailyHighBucketCode(value: unknown): ParsedDailyHighBucket | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(/^B(-?\d+(?:\.\d+)?)$/i);
  const tickerMatch = trimmed.match(/(?:^|[-_])B(-?\d+(?:\.\d+)?)(?:$|[-_])/i);
  const match = directMatch ?? tickerMatch;

  if (!match) {
    return null;
  }

  const midpoint = Number(match[1]);
  if (!Number.isFinite(midpoint)) {
    return null;
  }

  const lower = Math.floor(midpoint);
  const upper = lower + 1;
  const code = `B${stripTrailingZero(midpoint)}`;

  return {
    kind: "daily_high_range",
    raw: trimmed,
    lowerF: lower,
    upperF: upper,
    label: `${lower}° to ${upper}°`,
    kalshiCode: code,
  };
}

export function parseHourlyThresholdCode(value: unknown): ParsedHourlyThreshold | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(/^T(-?\d+(?:\.\d+)?)$/i);
  const tickerMatch = trimmed.match(/(?:^|[-_])T(-?\d+(?:\.\d+)?)(?:$|[-_])/i);
  const match = directMatch ?? tickerMatch;

  if (!match) {
    return null;
  }

  const rawThreshold = Number(match[1]);
  if (!Number.isFinite(rawThreshold)) {
    return null;
  }

  // Kalshi hourly temperature contracts often encode 69.99 to mean 70° or above.
  const threshold = Number.isInteger(rawThreshold) ? rawThreshold : Math.ceil(rawThreshold);
  const code = `T${stripTrailingZero(rawThreshold)}`;

  return {
    kind: "hourly_threshold",
    raw: trimmed,
    thresholdF: threshold,
    label: `${threshold}° or above`,
    kalshiCode: code,
  };
}

export function normalizeDailyHighBucketLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return dailyHighBucketFromTemperatureF(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedCode = parseDailyHighBucketCode(trimmed);
  if (parsedCode) {
    return parsedCode.label;
  }

  const rangeMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*(?:°|deg|degrees)?\s*(?:to|-|–|—)\s*(-?\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const lower = Math.floor(Number(rangeMatch[1]));
    const upper = Math.ceil(Number(rangeMatch[2]));
    if (Number.isFinite(lower) && Number.isFinite(upper)) {
      return `${lower}° to ${upper}°`;
    }
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return dailyHighBucketFromTemperatureF(numeric);
  }

  return trimmed;
}

export function inferResolvedBucket(input: {
  eventFamily?: string | null;
  resolvedBucket?: unknown;
  resolvedHighF?: unknown;
  resolvedTemperatureF?: unknown;
  marketTicker?: unknown;
}) {
  const explicitBucket =
    typeof input.resolvedBucket === "string" && input.resolvedBucket.trim()
      ? input.resolvedBucket.trim()
      : null;

  if (explicitBucket) {
    if (input.eventFamily === "hourly_temperature") {
      return parseHourlyThresholdCode(explicitBucket)?.label ?? explicitBucket;
    }

    return normalizeDailyHighBucketLabel(explicitBucket);
  }

  if (input.eventFamily === "hourly_temperature") {
    const fromTicker = parseHourlyThresholdCode(input.marketTicker);
    if (fromTicker) {
      return fromTicker.label;
    }

    const temp =
      typeof input.resolvedTemperatureF === "string"
        ? Number(input.resolvedTemperatureF)
        : input.resolvedTemperatureF;

    return isFiniteNumber(temp) ? `${Math.round(temp)}° observed` : null;
  }

  const fromTicker = parseDailyHighBucketCode(input.marketTicker);
  if (fromTicker) {
    return fromTicker.label;
  }

  return dailyHighBucketFromTemperatureF(input.resolvedHighF);
}

