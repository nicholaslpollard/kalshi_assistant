import { WEATHER_MARKETS } from "@/lib/config/weatherMarkets";
import {
  getNwsAlerts,
  getNwsForecastFromUrl,
  getNwsPoint,
  getNwsStationObservations,
} from "@/lib/weather/nwsClient";
import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import { parseWeatherTicker } from "@/lib/weather/weatherMarketParser";
import { NextResponse } from "next/server";

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function celsiusToFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32;
}

function getLocalDateFromIso(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getTodayInTimezone(timezone: string) {
  return getLocalDateFromIso(new Date().toISOString(), timezone);
}

function getObservedFloorStatus(eventDate: string, timezone: string) {
  const today = getTodayInTimezone(timezone);

  if (!today) {
    return "unknown";
  }

  if (eventDate > today) {
    return "not_started";
  }

  if (eventDate === today) {
    return "active";
  }

  return "complete";
}

function getObservationTemperatureF(observation: Record<string, unknown>) {
  const properties = observation.properties as Record<string, unknown> | undefined;
  const temperature = properties?.temperature as Record<string, unknown> | undefined;
  const value = toNumber(temperature?.value);

  if (value === null) {
    return null;
  }

  return celsiusToFahrenheit(value);
}

function summarizeObservationsForEventDate(
  data: Record<string, unknown>,
  eventDate: string,
  timezone: string
) {
  const features = Array.isArray(data.features)
    ? (data.features as Record<string, unknown>[])
    : [];

  const temperatures = features
    .map((feature) => {
      const properties = feature.properties as Record<string, unknown> | undefined;
      const timestamp =
        typeof properties?.timestamp === "string" ? properties.timestamp : null;

      if (!timestamp) {
        return null;
      }

      const localDate = getLocalDateFromIso(timestamp, timezone);

      if (localDate !== eventDate) {
        return null;
      }

      const tempF = getObservationTemperatureF(feature);

      if (tempF === null) {
        return null;
      }

      return {
        tempF,
        timestamp,
        localDate,
      };
    })
    .filter(
      (
        item
      ): item is {
        tempF: number;
        timestamp: string;
        localDate: string;
      } => item !== null
    );

  const observedMaxF =
    temperatures.length > 0
      ? Math.max(...temperatures.map((item) => item.tempF))
      : null;

  const latest = temperatures[0] ?? null;

  return {
    observedMaxF,
    latestTempF: latest?.tempF ?? null,
    latestTimestamp: latest?.timestamp ?? null,
    observationCount: temperatures.length,
    eventDate,
  };
}

function getForecastDate(period: Record<string, unknown>, timezone: string) {
  const startTime = typeof period.startTime === "string" ? period.startTime : null;

  if (!startTime) {
    return null;
  }

  return getLocalDateFromIso(startTime, timezone);
}

function summarizeNwsDailyForecastForEventDate(
  data: Record<string, unknown>,
  eventDate: string,
  timezone: string
) {
  const properties = data.properties as Record<string, unknown> | undefined;
  const periods = Array.isArray(properties?.periods)
    ? (properties.periods as Record<string, unknown>[])
    : [];

  const matchingPeriods = periods.filter(
    (period) => getForecastDate(period, timezone) === eventDate
  );

  const daytimeMatch =
    matchingPeriods.find((period) => period.isDaytime === true) ??
    matchingPeriods[0] ??
    null;

  const fallbackDaytime =
    periods.find((period) => period.isDaytime === true) ?? periods[0] ?? null;

  const selected = daytimeMatch ?? fallbackDaytime;

  return {
    periodName: selected?.name ?? null,
    temperatureF: toNumber(selected?.temperature),
    shortForecast: selected?.shortForecast ?? null,
    detailedForecast: selected?.detailedForecast ?? null,
    selectedForecastDate: selected ? getForecastDate(selected, timezone) : null,
    matchedEventDate: Boolean(daytimeMatch),
    rawPeriods: periods.slice(0, 10),
  };
}

function summarizeOpenMeteo(data: Record<string, unknown>, eventDate: string) {
  const daily = data.daily as Record<string, unknown> | undefined;
  const times = Array.isArray(daily?.time) ? daily.time : [];
  const maxes = Array.isArray(daily?.temperature_2m_max)
    ? daily.temperature_2m_max
    : [];

  const index = times.findIndex((time) => time === eventDate);

  const dailyMaxF = index >= 0 ? toNumber(maxes[index]) : toNumber(maxes[0]);

  const hourly = data.hourly as Record<string, unknown> | undefined;
  const hourlyTimes = Array.isArray(hourly?.time) ? hourly.time : [];
  const hourlyTemps = Array.isArray(hourly?.temperature_2m)
    ? hourly.temperature_2m
    : [];

  const eventHourly = hourlyTimes
    .map((time, idx) => ({
      time,
      temperatureF: toNumber(hourlyTemps[idx]),
    }))
    .filter(
      (item) =>
        typeof item.time === "string" && item.time.startsWith(eventDate)
    );

  return {
    dailyMaxF,
    eventHourly,
    rawDaily: daily ?? null,
  };
}

function getBucketRead(tempF: number | null) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const rounded = Math.round(tempF);
  const lower = rounded % 2 === 0 ? rounded : rounded - 1;
  const upper = lower + 1;

  return `${lower}° to ${upper}°`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker: encodedTicker } = await context.params;
    const ticker = decodeURIComponent(encodedTicker);
    const parsed = parseWeatherTicker(ticker);

    if (!parsed.marketCode || !parsed.eventDate) {
      return NextResponse.json(
        { error: "Unable to parse weather ticker." },
        { status: 400 }
      );
    }

    const config = parsed.marketConfig ?? WEATHER_MARKETS[parsed.marketCode];

    if (!config) {
      return NextResponse.json(
        { error: `Unsupported weather market code: ${parsed.marketCode}` },
        { status: 400 }
      );
    }

    const observedFloorStatus = getObservedFloorStatus(
      parsed.eventDate,
      config.timezone
    );

    const point = await getNwsPoint(config.latitude, config.longitude);
    const pointProperties = point.properties as Record<string, unknown> | undefined;

    const forecastUrl =
      typeof pointProperties?.forecast === "string"
        ? pointProperties.forecast
        : null;

    const forecast = forecastUrl ? await getNwsForecastFromUrl(forecastUrl) : null;

    const [observations, alerts, openMeteo] = await Promise.all([
      getNwsStationObservations(config.nwsObservationStation),
      getNwsAlerts(config.latitude, config.longitude),
      getOpenMeteoForecast({
        latitude: config.latitude,
        longitude: config.longitude,
        timezone: config.timezone,
        startDate: parsed.eventDate,
        endDate: parsed.eventDate,
      }),
    ]);

    const observationSummary = summarizeObservationsForEventDate(
      observations,
      parsed.eventDate,
      config.timezone
    );

    const nwsForecastSummary = forecast
      ? summarizeNwsDailyForecastForEventDate(
          forecast,
          parsed.eventDate,
          config.timezone
        )
      : null;

    const openMeteoSummary = summarizeOpenMeteo(openMeteo, parsed.eventDate);

    const effectiveFloorF =
      observedFloorStatus === "active" || observedFloorStatus === "complete"
        ? observationSummary.observedMaxF
        : null;

    const nwsBucket = getBucketRead(nwsForecastSummary?.temperatureF ?? null);
    const openMeteoBucket = getBucketRead(openMeteoSummary.dailyMaxF);
    const observedBucket = getBucketRead(effectiveFloorF);

    return NextResponse.json({
      ok: true,
      ticker,
      parsed,
      config,
      nws: {
        point,
        forecastSummary: nwsForecastSummary,
        observationSummary,
        alerts,
      },
      openMeteo: openMeteoSummary,
      bucketRead: {
        heldBucket: parsed.bucketLabel,
        observedBucket,
        nwsBucket,
        openMeteoBucket,
        effectiveObservedFloorF: effectiveFloorF,
        observedFloorStatus,
      },
    });
  } catch (error) {
    console.error("Position weather API failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown weather API error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}