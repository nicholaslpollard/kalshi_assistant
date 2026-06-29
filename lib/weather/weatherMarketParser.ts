import { WEATHER_MARKETS, type WeatherMarketConfig } from "@/lib/config/weatherMarkets";

export type ParsedWeatherTicker = {
  ticker: string;
  eventTicker: string | null;
  marketCode: string | null;
  marketConfig: WeatherMarketConfig | null;
  dateToken: string | null;
  eventDate: string | null;
  bucketToken: string | null;
  bucketLabel: string | null;
};

function parseDateToken(dateToken: string | null) {
  if (!dateToken) {
    return null;
  }

  const match = dateToken.match(/^(\d{2})([A-Z]{3})(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;

  const monthMap: Record<string, string> = {
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

  const month = monthMap[monthText];

  if (!month) {
    return null;
  }

  return `20${yearText}-${month}-${dayText}`;
}

function bucketTokenToLabel(bucketToken: string | null) {
  if (!bucketToken) {
    return null;
  }

  if (bucketToken.startsWith("B")) {
    const rawValue = Number(bucketToken.slice(1));

    if (!Number.isFinite(rawValue)) {
      return bucketToken;
    }

    const lower = Math.ceil(rawValue - 0.5);
    const upper = Math.floor(rawValue + 0.5);

    return `${lower}° to ${upper}°`;
  }

  if (bucketToken.startsWith("T")) {
    const rawValue = Number(bucketToken.slice(1));

    if (!Number.isFinite(rawValue)) {
      return bucketToken;
    }

    return `${rawValue - 1}° or below`;
  }

  if (bucketToken.startsWith("U")) {
    const rawValue = Number(bucketToken.slice(1));

    if (!Number.isFinite(rawValue)) {
      return bucketToken;
    }

    return `${rawValue}° or above`;
  }

  return bucketToken;
}

export function parseWeatherTicker(ticker: string): ParsedWeatherTicker {
  const parts = ticker.split("-");
  const eventTicker = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : null;
  const seriesToken = parts[0] ?? null;
  const dateToken = parts[1] ?? null;
  const bucketToken = parts[2] ?? null;

  let marketCode: string | null = null;

  if (seriesToken?.startsWith("KXHIGH")) {
    marketCode = seriesToken.replace("KXHIGH", "");
  }

  const marketConfig =
    marketCode && WEATHER_MARKETS[marketCode]
      ? WEATHER_MARKETS[marketCode]
      : null;

  return {
    ticker,
    eventTicker,
    marketCode,
    marketConfig,
    dateToken,
    eventDate: parseDateToken(dateToken),
    bucketToken,
    bucketLabel: bucketTokenToLabel(bucketToken),
  };
}