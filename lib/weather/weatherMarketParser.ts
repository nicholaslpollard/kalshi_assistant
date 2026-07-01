import { WEATHER_MARKETS, type WeatherMarketConfig } from "@/lib/config/weatherMarkets";

export type ParsedWeatherTicker = {
  ticker: string;
  eventTicker: string | null;
  marketCode: string | null;
  eventDate: string | null;
  bucketToken: string | null;
  bucketLabel: string | null;
  marketConfig: WeatherMarketConfig | null;
};

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function parseDateToken(dateToken: string) {
  const match = dateToken.match(/^(\d{2})([A-Z]{3})(\d{2})$/i);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const month = MONTHS[monthText.toUpperCase()];

  if (!month) {
    return null;
  }

  return `20${yearText}-${month}-${dayText}`;
}

function getMarketCodeFromSeries(seriesTicker: string) {
  const highMatch = seriesTicker.match(/^KXHIGH([A-Z]{3})$/i);

  if (highMatch) {
    return highMatch[1].toUpperCase();
  }

  const hourlyNycMatch = seriesTicker.match(/^KXTEMPNYCH$/i);

  if (hourlyNycMatch) {
    return "NYC";
  }

  return null;
}

function getBucketLabel(bucketToken: string | null) {
  if (!bucketToken) {
    return null;
  }

  const rangeMatch = bucketToken.match(/^B(\d+(?:\.\d+)?)$/i);

  if (rangeMatch) {
    const midpoint = Number(rangeMatch[1]);

    if (!Number.isFinite(midpoint)) {
      return null;
    }

    const lower = Math.floor(midpoint - 0.5);
    const upper = lower + 1;

    return `${lower}° to ${upper}°`;
  }

  const thresholdMatch = bucketToken.match(/^T(\d+(?:\.\d+)?)$/i);

  if (thresholdMatch) {
    const threshold = Number(thresholdMatch[1]);

    if (!Number.isFinite(threshold)) {
      return null;
    }

    return `${Math.ceil(threshold)}° or above`;
  }

  return null;
}

export function parseWeatherTicker(ticker: string): ParsedWeatherTicker {
  const normalizedTicker = ticker.trim().toUpperCase();
  const parts = normalizedTicker.split("-").filter(Boolean);
  const seriesTicker = parts[0] ?? "";
  const dateToken = parts[1] ?? null;
  const bucketToken = parts[2] ?? null;
  const eventTicker = dateToken ? `${seriesTicker}-${dateToken}` : null;

  const marketCode = getMarketCodeFromSeries(seriesTicker);

  return {
    ticker: normalizedTicker,
    eventTicker,
    marketCode,
    eventDate: dateToken ? parseDateToken(dateToken) : null,
    bucketToken,
    bucketLabel: getBucketLabel(bucketToken),
    marketConfig: marketCode ? WEATHER_MARKETS[marketCode] ?? null : null,
  };
}
