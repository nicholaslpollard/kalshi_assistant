import { getOpenMeteoForecast } from "@/lib/weather/openMeteoClient";
import {
  getNwsAlerts,
  getNwsForecastFromUrl,
  getNwsHourlyForecastFromPoint,
  getNwsPoint,
  getNwsStationObservations,
} from "@/lib/weather/nwsClient";

export type WeatherEvidenceTrend =
  | "rising"
  | "flat"
  | "falling"
  | "mixed"
  | "insufficient";

export type WeatherEvidencePacket = {
  station: {
    id: string;
    name: string | null;
    timezone: string;
    latitude: number;
    longitude: number;
  };
  event: {
    date: string;
    localNow: string | null;
    isToday: boolean;
    isTomorrow: boolean;
    remainingHeatingHours: number | null;
  };
  observations: {
    latestTempF: number | null;
    latestObservationTimeLocal: string | null;
    observedHighF: number | null;
    observedHighTimeLocal: string | null;
    observationCountForEventDate: number;
    recentReadings: Array<{
      timeLocal: string;
      tempF: number | null;
      dewPointF: number | null;
      humidityPercent: number | null;
      windDirectionDegrees: number | null;
      windSpeedMph: number | null;
      windGustMph: number | null;
      cloudText: string | null;
      pressureMb: number | null;
    }>;
    trend: WeatherEvidenceTrend;
    trendLastHourF: number | null;
  };
  forecasts: {
    nwsDailyHighF: number | null;
    nwsHourlyHighF: number | null;
    nwsHourlyHighTimeLocal: string | null;
    openMeteoDailyHighF: number | null;
    openMeteoHourlyHighF: number | null;
    openMeteoHourlyHighTimeLocal: string | null;
    forecastHighAverageF: number | null;
    forecastSpreadF: number | null;
    modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
    likelyTemperatureF: number | null;
    alternateTemperatureRangeF: {
      low: number | null;
      high: number | null;
    };
  };
  atmosphere: {
    cloudCoverPercentNearHigh: number | null;
    windSpeedMphNearHigh: number | null;
    windGustMphNearHigh: number | null;
    windDirectionDegreesNearHigh: number | null;
    dewPointFNearHigh: number | null;
    humidityPercentNearHigh: number | null;
    shortwaveRadiationNearHigh: number | null;
    precipitationProbabilityNearHigh: number | null;
    thunderstormRiskText: string | null;
    latestCloudText: string | null;
    latestWindSpeedMph: number | null;
    latestWindGustMph: number | null;
    latestHumidityPercent: number | null;
  };
  rawSources: {
    nwsPoint: Record<string, unknown> | null;
    nwsDailyForecast: Record<string, unknown> | null;
    nwsHourlyForecast: Record<string, unknown> | null;
    nwsAlerts: Record<string, unknown> | null;
    openMeteo: Record<string, unknown> | null;
  };
  evidenceNotes: string[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
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

function kmhToMph(kmh: number) {
  return kmh * 0.621371;
}

function pascalToMb(pa: number) {
  return pa / 100;
}

function roundOne(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
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

function getLocalDateTimeLabel(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLocalHour(timestamp: string, timezone: string) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(date);

  const hour = Number(hourText);

  return Number.isFinite(hour) ? hour : null;
}

function getQuantitativeValueF(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  const raw = toNumber(quantitative?.value);

  if (raw === null) {
    return null;
  }

  return celsiusToFahrenheit(raw);
}

function getQuantitativeValueMph(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  const raw = toNumber(quantitative?.value);

  if (raw === null) {
    return null;
  }

  return kmhToMph(raw);
}

function getQuantitativeValuePercent(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  return toNumber(quantitative?.value);
}

function getQuantitativeValueDegrees(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  return toNumber(quantitative?.value);
}

function getPressureMb(properties: Record<string, unknown>) {
  const stationPressure = properties.stationPressure as
    | Record<string, unknown>
    | undefined;
  const seaLevelPressure = properties.seaLevelPressure as
    | Record<string, unknown>
    | undefined;

  const raw = toNumber(stationPressure?.value ?? seaLevelPressure?.value);

  if (raw === null) {
    return null;
  }

  return raw > 2000 ? pascalToMb(raw) : raw;
}

function normalizeObservations(params: {
  data: Record<string, unknown> | null;
  eventDate: string;
  timezone: string;
}) {
  const { data, eventDate, timezone } = params;
  const features = Array.isArray(data?.features)
    ? (data?.features as Record<string, unknown>[])
    : [];

  const readings = features
    .map((feature) => {
      const properties = feature.properties as Record<string, unknown> | undefined;
      const timestamp =
        typeof properties?.timestamp === "string" ? properties.timestamp : null;

      if (!properties || !timestamp) {
        return null;
      }

      const localDate = getLocalDateFromIso(timestamp, timezone);
      const timeLocal = getLocalDateTimeLabel(timestamp, timezone);
      const tempF = roundOne(getQuantitativeValueF(properties.temperature));

      if (!timeLocal) {
        return null;
      }

      return {
        timestamp,
        localDate,
        timeLocal,
        tempF,
        dewPointF: roundOne(getQuantitativeValueF(properties.dewpoint)),
        humidityPercent: roundOne(
          getQuantitativeValuePercent(properties.relativeHumidity)
        ),
        windDirectionDegrees: roundOne(
          getQuantitativeValueDegrees(properties.windDirection)
        ),
        windSpeedMph: roundOne(getQuantitativeValueMph(properties.windSpeed)),
        windGustMph: roundOne(getQuantitativeValueMph(properties.windGust)),
        cloudText:
          typeof properties.textDescription === "string"
            ? properties.textDescription
            : null,
        pressureMb: roundOne(getPressureMb(properties)),
      };
    })
    .filter(
      (
        reading
      ): reading is {
        timestamp: string;
        localDate: string | null;
        timeLocal: string;
        tempF: number | null;
        dewPointF: number | null;
        humidityPercent: number | null;
        windDirectionDegrees: number | null;
        windSpeedMph: number | null;
        windGustMph: number | null;
        cloudText: string | null;
        pressureMb: number | null;
      } => reading !== null
    )
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const eventDateReadings = readings.filter(
    (reading) => reading.localDate === eventDate && reading.tempF !== null
  );

  const latest = readings.at(-1) ?? null;
  const recent = readings.slice(-24).reverse();

  const observedHighReading = eventDateReadings.reduce<
    (typeof eventDateReadings)[number] | null
  >((best, reading) => {
    if (reading.tempF === null) {
      return best;
    }

    if (!best || best.tempF === null || reading.tempF > best.tempF) {
      return reading;
    }

    return best;
  }, null);

  const lastHourReadings = readings.filter((reading) => {
    if (!latest) {
      return false;
    }

    return Date.parse(reading.timestamp) >= Date.parse(latest.timestamp) - 60 * 60 * 1000;
  });

  let trend: WeatherEvidenceTrend = "insufficient";
  let trendLastHourF: number | null = null;

  if (lastHourReadings.length >= 2) {
    const first = lastHourReadings[0]?.tempF ?? null;
    const last = lastHourReadings.at(-1)?.tempF ?? null;

    if (first !== null && last !== null) {
      const computedTrendLastHourF = roundOne(last - first);
      trendLastHourF = computedTrendLastHourF;

      if (computedTrendLastHourF !== null && computedTrendLastHourF >= 1) {
        trend = "rising";
      } else if (computedTrendLastHourF !== null && computedTrendLastHourF <= -1) {
        trend = "falling";
      } else {
        trend = "flat";
      }
    }
  }

  return {
    latest,
    observedHighReading,
    recent,
    eventDateReadings,
    trend,
    trendLastHourF,
  };
}

function getNwsPeriods(data: Record<string, unknown> | null) {
  const properties = data?.properties as Record<string, unknown> | undefined;
  return Array.isArray(properties?.periods)
    ? (properties.periods as Record<string, unknown>[])
    : [];
}

function getNwsDailyHighF(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const periods = getNwsPeriods(data);
  const values = periods
    .filter((period) => {
      const startTime = typeof period.startTime === "string" ? period.startTime : null;
      return startTime ? getLocalDateFromIso(startTime, timezone) === eventDate : false;
    })
    .map((period) => toNumber(period.temperature))
    .filter((value): value is number => value !== null);

  return values.length > 0 ? Math.max(...values) : null;
}

function getNwsHourlyHigh(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const periods = getNwsPeriods(data);

  const values = periods
    .map((period) => {
      const startTime = typeof period.startTime === "string" ? period.startTime : null;
      const temp = toNumber(period.temperature);

      if (!startTime || temp === null) {
        return null;
      }

      if (getLocalDateFromIso(startTime, timezone) !== eventDate) {
        return null;
      }

      return {
        temp,
        timeLocal: getLocalDateTimeLabel(startTime, timezone),
      };
    })
    .filter(
      (value): value is { temp: number; timeLocal: string | null } =>
        value !== null
    );

  if (values.length === 0) {
    return { high: null, timeLocal: null };
  }

  const best = values.reduce((currentBest, value) =>
    value.temp > currentBest.temp ? value : currentBest
  );

  return {
    high: best.temp,
    timeLocal: best.timeLocal,
  };
}

function getOpenMeteoArray(data: Record<string, unknown> | null, key: string) {
  const hourly = data?.hourly as Record<string, unknown> | undefined;
  const value = hourly?.[key];

  return Array.isArray(value) ? value : [];
}

function getOpenMeteoDailyHigh(data: Record<string, unknown> | null) {
  const daily = data?.daily as Record<string, unknown> | undefined;
  const values = Array.isArray(daily?.temperature_2m_max)
    ? daily.temperature_2m_max
    : [];

  return toNumber(values[0]);
}

function getOpenMeteoHourlyHigh(data: Record<string, unknown> | null, eventDate: string) {
  const times = getOpenMeteoArray(data, "time");
  const temps = getOpenMeteoArray(data, "temperature_2m");

  let best: {
    index: number;
    temp: number;
    timeLocal: string;
  } | null = null;

  for (let index = 0; index < times.length; index += 1) {
    const time = typeof times[index] === "string" ? times[index] : null;
    const temp = toNumber(temps[index]);

    if (!time || temp === null || !time.startsWith(eventDate)) {
      continue;
    }

    if (!best || temp > best.temp) {
      best = {
        index,
        temp,
        timeLocal: time.replace("T", " "),
      };
    }
  }

  return best;
}

function getOpenMeteoValueAtIndex(
  data: Record<string, unknown> | null,
  key: string,
  index: number | null | undefined
) {
  if (index === null || index === undefined) {
    return null;
  }

  const values = getOpenMeteoArray(data, key);
  return roundOne(toNumber(values[index]));
}

function getThunderstormRiskText(
  dailyForecast: Record<string, unknown> | null,
  alerts: Record<string, unknown> | null
) {
  const periods = getNwsPeriods(dailyForecast);
  const periodText = periods
    .map((period) =>
      [period.name, period.shortForecast, period.detailedForecast]
        .filter((value): value is string => typeof value === "string")
        .join(" — ")
    )
    .find((text) => /thunder|storm|shower|rain|precip/i.test(text));

  const features = Array.isArray(alerts?.features)
    ? (alerts?.features as Record<string, unknown>[])
    : [];
  const alertText = features
    .map((feature) => {
      const properties = feature.properties as Record<string, unknown> | undefined;
      return typeof properties?.headline === "string" ? properties.headline : null;
    })
    .find((headline): headline is string => Boolean(headline));

  return alertText ?? periodText ?? null;
}

function getModelAgreement(params: {
  nwsHourlyHighF: number | null;
  openMeteoHourlyHighF: number | null;
  nwsDailyHighF: number | null;
  openMeteoDailyHighF: number | null;
}) {
  const nws = params.nwsHourlyHighF ?? params.nwsDailyHighF;
  const openMeteo = params.openMeteoHourlyHighF ?? params.openMeteoDailyHighF;

  if (nws === null || openMeteo === null) {
    return "insufficient" as const;
  }

  const spread = Math.abs(nws - openMeteo);

  if (spread <= 1) {
    return "strong" as const;
  }

  if (spread <= 3) {
    return "moderate" as const;
  }

  return "weak" as const;
}

function getRemainingHeatingHours(params: {
  eventDate: string;
  timezone: string;
  now: Date;
}) {
  const today = getLocalDateFromIso(params.now.toISOString(), params.timezone);

  if (today !== params.eventDate) {
    return null;
  }

  const currentHour = getLocalHour(params.now.toISOString(), params.timezone);

  if (currentHour === null) {
    return null;
  }

  const endHeatingHour = 18;

  return Math.max(0, endHeatingHour - currentHour);
}

export function buildWeatherEvidencePacket(params: {
  stationId: string;
  stationName?: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  eventDate: string;
  nwsPoint: Record<string, unknown> | null;
  nwsDailyForecast: Record<string, unknown> | null;
  nwsHourlyForecast: Record<string, unknown> | null;
  nwsObservations: Record<string, unknown> | null;
  nwsAlerts: Record<string, unknown> | null;
  openMeteo: Record<string, unknown> | null;
  now?: Date;
}): WeatherEvidencePacket {
  const now = params.now ?? new Date();
  const today = getLocalDateFromIso(now.toISOString(), params.timezone);
  const tomorrowDate = new Date(`${today ?? params.eventDate}T00:00:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const observations = normalizeObservations({
    data: params.nwsObservations,
    eventDate: params.eventDate,
    timezone: params.timezone,
  });

  const nwsDailyHighF = getNwsDailyHighF(
    params.nwsDailyForecast,
    params.eventDate,
    params.timezone
  );
  const nwsHourlyHigh = getNwsHourlyHigh(
    params.nwsHourlyForecast,
    params.eventDate,
    params.timezone
  );
  const openMeteoDailyHighF = getOpenMeteoDailyHigh(params.openMeteo);
  const openMeteoHourlyHigh = getOpenMeteoHourlyHigh(
    params.openMeteo,
    params.eventDate
  );

  const sourceHighs = [
    nwsHourlyHigh.high,
    nwsDailyHighF,
    openMeteoHourlyHigh?.temp ?? null,
    openMeteoDailyHighF,
  ].filter((value): value is number => value !== null);

  const forecastHighAverageF =
    sourceHighs.length > 0
      ? roundOne(sourceHighs.reduce((sum, value) => sum + value, 0) / sourceHighs.length)
      : null;

  const forecastSpreadF =
    sourceHighs.length > 1
      ? roundOne(Math.max(...sourceHighs) - Math.min(...sourceHighs))
      : null;

  const modelAgreement = getModelAgreement({
    nwsHourlyHighF: nwsHourlyHigh.high,
    openMeteoHourlyHighF: openMeteoHourlyHigh?.temp ?? null,
    nwsDailyHighF,
    openMeteoDailyHighF,
  });

  const likelyTemperatureF =
    forecastHighAverageF ??
    observations.observedHighReading?.tempF ??
    observations.latest?.tempF ??
    null;

  const openMeteoHighIndex = openMeteoHourlyHigh?.index ?? null;
  const latest = observations.latest;

  const evidenceNotes: string[] = [];

  if (observations.observedHighReading?.tempF !== null && observations.observedHighReading) {
    evidenceNotes.push(
      `Observed high so far is ${observations.observedHighReading.tempF}°F at ${observations.observedHighReading.timeLocal}.`
    );
  }

  if (observations.trend !== "insufficient") {
    evidenceNotes.push(
      `Recent observation trend is ${observations.trend}${
        observations.trendLastHourF !== null
          ? ` (${observations.trendLastHourF >= 0 ? "+" : ""}${observations.trendLastHourF}°F over roughly the last hour)`
          : ""
      }.`
    );
  }

  if (nwsHourlyHigh.high !== null) {
    evidenceNotes.push(
      `NWS hourly forecast high is ${nwsHourlyHigh.high}°F${
        nwsHourlyHigh.timeLocal ? ` near ${nwsHourlyHigh.timeLocal}` : ""
      }.`
    );
  }

  if (openMeteoHourlyHigh?.temp !== undefined) {
    evidenceNotes.push(
      `Open-Meteo hourly forecast high is ${openMeteoHourlyHigh.temp}°F near ${openMeteoHourlyHigh.timeLocal}.`
    );
  }

  return {
    station: {
      id: params.stationId,
      name: params.stationName ?? null,
      timezone: params.timezone,
      latitude: params.latitude,
      longitude: params.longitude,
    },
    event: {
      date: params.eventDate,
      localNow: getLocalDateTimeLabel(now.toISOString(), params.timezone),
      isToday: today === params.eventDate,
      isTomorrow: tomorrow === params.eventDate,
      remainingHeatingHours: getRemainingHeatingHours({
        eventDate: params.eventDate,
        timezone: params.timezone,
        now,
      }),
    },
    observations: {
      latestTempF: latest?.tempF ?? null,
      latestObservationTimeLocal: latest?.timeLocal ?? null,
      observedHighF: observations.observedHighReading?.tempF ?? null,
      observedHighTimeLocal: observations.observedHighReading?.timeLocal ?? null,
      observationCountForEventDate: observations.eventDateReadings.length,
      recentReadings: observations.recent.map((reading) => ({
        timeLocal: reading.timeLocal,
        tempF: reading.tempF,
        dewPointF: reading.dewPointF,
        humidityPercent: reading.humidityPercent,
        windDirectionDegrees: reading.windDirectionDegrees,
        windSpeedMph: reading.windSpeedMph,
        windGustMph: reading.windGustMph,
        cloudText: reading.cloudText,
        pressureMb: reading.pressureMb,
      })),
      trend: observations.trend,
      trendLastHourF: observations.trendLastHourF,
    },
    forecasts: {
      nwsDailyHighF,
      nwsHourlyHighF: nwsHourlyHigh.high,
      nwsHourlyHighTimeLocal: nwsHourlyHigh.timeLocal,
      openMeteoDailyHighF,
      openMeteoHourlyHighF: openMeteoHourlyHigh?.temp ?? null,
      openMeteoHourlyHighTimeLocal: openMeteoHourlyHigh?.timeLocal ?? null,
      forecastHighAverageF,
      forecastSpreadF,
      modelAgreement,
      likelyTemperatureF,
      alternateTemperatureRangeF: {
        low: sourceHighs.length > 0 ? Math.min(...sourceHighs) : null,
        high: sourceHighs.length > 0 ? Math.max(...sourceHighs) : null,
      },
    },
    atmosphere: {
      cloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "cloud_cover",
        openMeteoHighIndex
      ),
      windSpeedMphNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "wind_speed_10m",
        openMeteoHighIndex
      ),
      windGustMphNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "wind_gusts_10m",
        openMeteoHighIndex
      ),
      windDirectionDegreesNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "wind_direction_10m",
        openMeteoHighIndex
      ),
      dewPointFNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "dew_point_2m",
        openMeteoHighIndex
      ),
      humidityPercentNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "relative_humidity_2m",
        openMeteoHighIndex
      ),
      shortwaveRadiationNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "shortwave_radiation",
        openMeteoHighIndex
      ),
      precipitationProbabilityNearHigh: getOpenMeteoValueAtIndex(
        params.openMeteo,
        "precipitation_probability",
        openMeteoHighIndex
      ),
      thunderstormRiskText: getThunderstormRiskText(
        params.nwsDailyForecast,
        params.nwsAlerts
      ),
      latestCloudText: latest?.cloudText ?? null,
      latestWindSpeedMph: latest?.windSpeedMph ?? null,
      latestWindGustMph: latest?.windGustMph ?? null,
      latestHumidityPercent: latest?.humidityPercent ?? null,
    },
    rawSources: {
      nwsPoint: params.nwsPoint,
      nwsDailyForecast: params.nwsDailyForecast,
      nwsHourlyForecast: params.nwsHourlyForecast,
      nwsAlerts: params.nwsAlerts,
      openMeteo: params.openMeteo,
    },
    evidenceNotes,
  };
}

export async function fetchWeatherEvidencePacket(params: {
  stationId: string;
  stationName?: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  eventDate: string;
}) {
  const point = await getNwsPoint(params.latitude, params.longitude);
  const pointProperties = point.properties as Record<string, unknown> | undefined;

  const forecastUrl =
    typeof pointProperties?.forecast === "string" ? pointProperties.forecast : null;

  const [dailyForecast, hourlyForecast, observations, alerts, openMeteo] =
    await Promise.all([
      forecastUrl ? getNwsForecastFromUrl(forecastUrl) : Promise.resolve(null),
      getNwsHourlyForecastFromPoint(point),
      getNwsStationObservations(params.stationId),
      getNwsAlerts(params.latitude, params.longitude),
      getOpenMeteoForecast({
        latitude: params.latitude,
        longitude: params.longitude,
        timezone: params.timezone,
        startDate: params.eventDate,
        endDate: params.eventDate,
      }),
    ]);

  return buildWeatherEvidencePacket({
    stationId: params.stationId,
    stationName: params.stationName ?? null,
    timezone: params.timezone,
    latitude: params.latitude,
    longitude: params.longitude,
    eventDate: params.eventDate,
    nwsPoint: point,
    nwsDailyForecast: dailyForecast,
    nwsHourlyForecast: hourlyForecast,
    nwsObservations: observations,
    nwsAlerts: alerts,
    openMeteo,
  });
}
