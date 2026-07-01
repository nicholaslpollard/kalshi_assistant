import type { OpenMeteoEvidenceForecasts } from "@/lib/weather/openMeteoClient";

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
    family: "daily_high" | "hourly_temperature";
    date: string;
    localNow: string | null;
    isToday: boolean;
    isTomorrow: boolean;
    isFuture: boolean;
    eventHourLocal: number | null;
    remainingHeatingHours: number | null;
    settlementAnchor: "official_station_observation";
  };
  observations: {
    latestTempF: number | null;
    latestObservationTimeLocal: string | null;
    observedHighF: number | null;
    observedHighTimeLocal: string | null;
    currentTempVsObservedHighF: number | null;
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
    nwsGridMaxTemperatureF: number | null;
    nwsGridMaxTemperatureTimeLocal: string | null;
    openMeteoDailyHighF: number | null;
    openMeteoHourlyHighF: number | null;
    openMeteoHourlyHighTimeLocal: string | null;
    forecastHighAverageF: number | null;
    forecastHighMedianF: number | null;
    forecastSpreadF: number | null;
    modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
    likelyTemperatureF: number | null;
    likelyBucket: string | null;
    alternateBuckets: string[];
    alternateTemperatureRangeF: {
      low: number | null;
      high: number | null;
    };
  };
  openMeteoModels: {
    bestMatch: ModelEvidence | null;
    hrrr: ModelEvidence | null;
    nbm: ModelEvidence | null;
    gfs: ModelEvidence | null;
    ecmwf: ModelEvidence | null;
    ensemble: EnsembleEvidence | null;
    sourceErrors: string[];
  };
  nwsGrid: {
    updateTime: string | null;
    validTimes: string | null;
    rawMaxTemperatureF: number | null;
    rawMaxTemperatureTimeLocal: string | null;
    peakWindow: PeakWindowPoint[];
    hazards: string[];
    weatherSummary: string | null;
  };
  atmosphere: {
    cloudCoverPercentNearHigh: number | null;
    lowCloudCoverPercentNearHigh: number | null;
    midCloudCoverPercentNearHigh: number | null;
    highCloudCoverPercentNearHigh: number | null;
    windSpeedMphNearHigh: number | null;
    windGustMphNearHigh: number | null;
    windDirectionDegreesNearHigh: number | null;
    dewPointFNearHigh: number | null;
    humidityPercentNearHigh: number | null;
    shortwaveRadiationNearHigh: number | null;
    sunshineDurationSecondsNearHigh: number | null;
    precipitationProbabilityNearHigh: number | null;
    thunderstormProbabilityNearHigh: number | null;
    capeNearHigh: number | null;
    liftedIndexNearHigh: number | null;
    convectiveInhibitionNearHigh: number | null;
    boundaryLayerHeightMetersNearHigh: number | null;
    thunderstormRiskText: string | null;
    latestCloudText: string | null;
    latestWindSpeedMph: number | null;
    latestWindGustMph: number | null;
    latestHumidityPercent: number | null;
  };
  bucketAnalysis: {
    mostLikelyBucket: string | null;
    secondMostLikelyBucket: string | null;
    hotTailBucket: string | null;
    coolTailBucket: string | null;
    bucketConfidencePercent: number | null;
    overshootRisk: "high" | "moderate" | "low" | "insufficient";
    capRisk: "high" | "moderate" | "low" | "insufficient";
  };
  decisionSupport: {
    modelConsensus: Array<{
      source: string;
      forecastHighF: number | null;
      bucket: string | null;
      weight: "very_high" | "high" | "medium_high" | "medium" | "low" | "context";
      notes: string;
    }>;
    bucketProbabilities: Array<{
      bucket: string;
      probabilityPercent: number;
      fairValueEstimate: number | null;
      reasoning: string;
    }>;
    observationTriggers: Array<{
      trigger: string;
      action: string;
      urgency: "low" | "medium" | "high";
    }>;
    settlementClock: {
      localTimeNow: string | null;
      remainingHeatingWindow: string;
      peakHeatingPassed: boolean | null;
      settlementTimingRead: string;
    };
    forecastChangeRead: string;
  };
  reasoning: {
    summary: string;
    supportiveFactors: string[];
    limitingFactors: string[];
    watchTriggers: string[];
    invalidationSignals: string[];
  };
  rawSources: {
    nwsPoint: Record<string, unknown> | null;
    nwsDailyForecast: Record<string, unknown> | null;
    nwsHourlyForecast: Record<string, unknown> | null;
    nwsGridpointData: Record<string, unknown> | null;
    nwsAlerts: Record<string, unknown> | null;
    openMeteo: Record<string, unknown> | null;
    openMeteoEvidence: OpenMeteoEvidenceForecasts | null;
  };
  evidenceNotes: string[];
};

type ModelEvidence = {
  label: string;
  dailyHighF: number | null;
  hourlyHighF: number | null;
  hourlyHighTimeLocal: string | null;
  likelyBucket: string | null;
  peakIndex: number | null;
  peakConditions: Record<string, number | null>;
};

type EnsembleEvidence = ModelEvidence & {
  temperatureSpreadFNearHigh: number | null;
  highRangeApproxF: { low: number | null; high: number | null };
  uncertaintyBucket: string | null;
};

type PeakWindowPoint = {
  timeLocal: string;
  temperatureF: number | null;
  maxTemperatureF: number | null;
  dewPointF: number | null;
  relativeHumidityPercent: number | null;
  skyCoverPercent: number | null;
  windDirectionDegrees: number | null;
  windSpeedMph: number | null;
  windGustMph: number | null;
  probabilityOfPrecipitationPercent: number | null;
  probabilityOfThunderPercent: number | null;
  pressureMb: number | null;
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

function roundWhole(value: number | null) {
  return value === null ? null : Math.round(value);
}

function getDailyHighBucketLabel(tempF: number | null) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const lower = Math.floor(tempF);
  const upper = lower + 1;

  return `${lower}° to ${upper}°`;
}

function getNeighborBucket(tempF: number | null, offset: number) {
  if (tempF === null || !Number.isFinite(tempF)) {
    return null;
  }

  const lower = Math.floor(tempF) + offset;
  return `${lower}° to ${lower + 1}°`;
}


function normalizeProbabilityDistribution(raw: Array<{ bucket: string | null; weight: number; reasoning: string }>) {
  const merged = new Map<string, { bucket: string; weight: number; reasoning: string[] }>();

  for (const item of raw) {
    if (!item.bucket || item.weight <= 0) {
      continue;
    }

    const existing = merged.get(item.bucket);
    if (existing) {
      existing.weight += item.weight;
      existing.reasoning.push(item.reasoning);
    } else {
      merged.set(item.bucket, {
        bucket: item.bucket,
        weight: item.weight,
        reasoning: [item.reasoning],
      });
    }
  }

  const total = Array.from(merged.values()).reduce((sum, item) => sum + item.weight, 0);

  if (total <= 0) {
    return [];
  }

  return Array.from(merged.values())
    .map((item) => {
      const probabilityPercent = Math.round((item.weight / total) * 100);
      return {
        bucket: item.bucket,
        probabilityPercent,
        fairValueEstimate: Math.round((probabilityPercent / 100) * 100) / 100,
        reasoning: item.reasoning.join(" "),
      };
    })
    .sort((a, b) => b.probabilityPercent - a.probabilityPercent);
}

function buildSettlementClockRead(params: {
  localNow: string | null;
  remainingHeatingHours: number | null;
  isToday: boolean;
  isFuture: boolean;
}) {
  const { localNow, remainingHeatingHours, isToday, isFuture } = params;

  if (isFuture) {
    return {
      localTimeNow: localNow,
      remainingHeatingWindow: "Future event; same-day heating window has not started.",
      peakHeatingPassed: false,
      settlementTimingRead:
        "Use model agreement, model spread, and forecast trend as primary evidence until same-day observations begin.",
    };
  }

  if (!isToday) {
    return {
      localTimeNow: localNow,
      remainingHeatingWindow: "Event is not marked as today; heating-window read is contextual only.",
      peakHeatingPassed: null,
      settlementTimingRead:
        "Verify the event date and settlement rules before treating current observations as decisive.",
    };
  }

  if (remainingHeatingHours === null) {
    return {
      localTimeNow: localNow,
      remainingHeatingWindow: "Remaining heating window could not be estimated.",
      peakHeatingPassed: null,
      settlementTimingRead:
        "Use latest official station observations and model timing before acting.",
    };
  }

  return {
    localTimeNow: localNow,
    remainingHeatingWindow:
      remainingHeatingHours > 0
        ? `About ${remainingHeatingHours.toFixed(1)} hours of realistic heating remain.`
        : "The main heating window has likely passed or is nearly over.",
    peakHeatingPassed: remainingHeatingHours <= 0,
    settlementTimingRead:
      remainingHeatingHours > 2
        ? "Overshoot and further heating remain live risks."
        : remainingHeatingHours > 0
          ? "Late movement is still possible, but every capped observation increases confidence in the current high."
          : "Observed high and official late-day prints should dominate the read now.",
  };
}

function uniqueStrings(values: Array<string | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function average(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
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

  return raw === null ? null : celsiusToFahrenheit(raw);
}

function getQuantitativeValueMph(value: unknown) {
  const quantitative = value as Record<string, unknown> | undefined;
  const raw = toNumber(quantitative?.value);

  return raw === null ? null : kmhToMph(raw);
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
  const stationPressure = properties.stationPressure as Record<string, unknown> | undefined;
  const seaLevelPressure = properties.seaLevelPressure as Record<string, unknown> | undefined;
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
      const timestamp = typeof properties?.timestamp === "string" ? properties.timestamp : null;

      if (!properties || !timestamp) {
        return null;
      }

      const localDate = getLocalDateFromIso(timestamp, timezone);
      const timeLocal = getLocalDateTimeLabel(timestamp, timezone);

      if (!timeLocal) {
        return null;
      }

      return {
        timestamp,
        localDate,
        timeLocal,
        tempF: roundOne(getQuantitativeValueF(properties.temperature)),
        dewPointF: roundOne(getQuantitativeValueF(properties.dewpoint)),
        humidityPercent: roundOne(getQuantitativeValuePercent(properties.relativeHumidity)),
        windDirectionDegrees: roundOne(getQuantitativeValueDegrees(properties.windDirection)),
        windSpeedMph: roundOne(getQuantitativeValueMph(properties.windSpeed)),
        windGustMph: roundOne(getQuantitativeValueMph(properties.windGust)),
        cloudText: typeof properties.textDescription === "string" ? properties.textDescription : null,
        pressureMb: roundOne(getPressureMb(properties)),
      };
    })
    .filter((reading): reading is NonNullable<typeof reading> => reading !== null)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const eventDateReadings = readings.filter(
    (reading) => reading.localDate === eventDate && reading.tempF !== null
  );

  const latest = readings.at(-1) ?? null;
  const recent = readings.slice(-24).reverse();

  const observedHighReading = eventDateReadings.reduce<(typeof eventDateReadings)[number] | null>(
    (best, reading) => {
      if (reading.tempF === null) {
        return best;
      }

      if (!best || best.tempF === null || reading.tempF > best.tempF) {
        return reading;
      }

      return best;
    },
    null
  );

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
      trendLastHourF = roundOne(last - first);

      if (trendLastHourF !== null && trendLastHourF >= 1) {
        trend = "rising";
      } else if (trendLastHourF !== null && trendLastHourF <= -1) {
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
    .filter((value): value is { temp: number; timeLocal: string | null } => value !== null);

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

function getOpenMeteoDailyArray(data: Record<string, unknown> | null, key: string) {
  const daily = data?.daily as Record<string, unknown> | undefined;
  const value = daily?.[key];
  return Array.isArray(value) ? value : [];
}

function getOpenMeteoDailyHigh(data: Record<string, unknown> | null, eventDate?: string) {
  const daily = data?.daily as Record<string, unknown> | undefined;
  const times = Array.isArray(daily?.time) ? daily.time : [];
  const values = getOpenMeteoDailyArray(data, "temperature_2m_max");

  if (eventDate) {
    const index = times.findIndex((time) => time === eventDate);
    if (index >= 0) {
      return roundOne(toNumber(values[index]));
    }
  }

  return roundOne(toNumber(values[0]));
}

function getOpenMeteoHourlyHigh(data: Record<string, unknown> | null, eventDate: string) {
  const times = getOpenMeteoArray(data, "time");
  const temps = getOpenMeteoArray(data, "temperature_2m");

  let best: { index: number; temp: number; timeLocal: string } | null = null;

  for (let index = 0; index < times.length; index += 1) {
    const time = typeof times[index] === "string" ? times[index] : null;
    const temp = toNumber(temps[index]);

    if (!time || temp === null || !time.startsWith(eventDate)) {
      continue;
    }

    if (!best || temp > best.temp) {
      best = { index, temp, timeLocal: time.replace("T", " ") };
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

function getModelEvidence(
  label: string,
  data: Record<string, unknown> | null,
  eventDate: string
): ModelEvidence | null {
  if (!data) {
    return null;
  }

  const hourlyHigh = getOpenMeteoHourlyHigh(data, eventDate);
  const dailyHigh = getOpenMeteoDailyHigh(data, eventDate);
  const selectedHigh = hourlyHigh?.temp ?? dailyHigh;

  return {
    label,
    dailyHighF: dailyHigh,
    hourlyHighF: hourlyHigh?.temp ?? null,
    hourlyHighTimeLocal: hourlyHigh?.timeLocal ?? null,
    likelyBucket: getDailyHighBucketLabel(selectedHigh),
    peakIndex: hourlyHigh?.index ?? null,
    peakConditions: {
      cloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover", hourlyHigh?.index),
      lowCloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover_low", hourlyHigh?.index),
      midCloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover_mid", hourlyHigh?.index),
      highCloudCoverPercent: getOpenMeteoValueAtIndex(data, "cloud_cover_high", hourlyHigh?.index),
      windSpeedMph: getOpenMeteoValueAtIndex(data, "wind_speed_10m", hourlyHigh?.index),
      windGustMph: getOpenMeteoValueAtIndex(data, "wind_gusts_10m", hourlyHigh?.index),
      windDirectionDegrees: getOpenMeteoValueAtIndex(data, "wind_direction_10m", hourlyHigh?.index),
      dewPointF: getOpenMeteoValueAtIndex(data, "dew_point_2m", hourlyHigh?.index),
      humidityPercent: getOpenMeteoValueAtIndex(data, "relative_humidity_2m", hourlyHigh?.index),
      shortwaveRadiation: getOpenMeteoValueAtIndex(data, "shortwave_radiation", hourlyHigh?.index),
      sunshineDurationSeconds: getOpenMeteoValueAtIndex(data, "sunshine_duration", hourlyHigh?.index),
      precipitationProbability: getOpenMeteoValueAtIndex(data, "precipitation_probability", hourlyHigh?.index),
      thunderstormProbability: getOpenMeteoValueAtIndex(data, "thunderstorm_probability", hourlyHigh?.index),
      cape: getOpenMeteoValueAtIndex(data, "cape", hourlyHigh?.index),
      liftedIndex: getOpenMeteoValueAtIndex(data, "lifted_index", hourlyHigh?.index),
      convectiveInhibition: getOpenMeteoValueAtIndex(data, "convective_inhibition", hourlyHigh?.index),
      boundaryLayerHeightMeters: getOpenMeteoValueAtIndex(data, "boundary_layer_height", hourlyHigh?.index),
      surfacePressure: getOpenMeteoValueAtIndex(data, "surface_pressure", hourlyHigh?.index),
    },
  };
}

function getEnsembleEvidence(data: Record<string, unknown> | null, eventDate: string): EnsembleEvidence | null {
  const model = getModelEvidence("Open-Meteo ensemble mean", data, eventDate);

  if (!model) {
    return null;
  }

  const spread = getOpenMeteoValueAtIndex(data, "temperature_2m_spread", model.peakIndex);
  const selectedHigh = model.hourlyHighF ?? model.dailyHighF;

  return {
    ...model,
    temperatureSpreadFNearHigh: spread,
    highRangeApproxF: {
      low: selectedHigh !== null && spread !== null ? roundOne(selectedHigh - spread) : null,
      high: selectedHigh !== null && spread !== null ? roundOne(selectedHigh + spread) : null,
    },
    uncertaintyBucket:
      selectedHigh !== null && spread !== null
        ? getDailyHighBucketLabel(selectedHigh + spread)
        : null,
  };
}

function parseNwsIntervalStart(validTime: unknown) {
  if (typeof validTime !== "string") {
    return null;
  }

  const start = validTime.split("/")[0];
  return start || null;
}

function getNwsGridLayer(data: Record<string, unknown> | null, key: string) {
  const properties = data?.properties as Record<string, unknown> | undefined;
  const layer = properties?.[key] as Record<string, unknown> | undefined;
  const values = Array.isArray(layer?.values)
    ? (layer.values as Record<string, unknown>[])
    : [];

  return {
    uom: typeof layer?.uom === "string" ? layer.uom : null,
    values,
  };
}

function convertGridValue(value: number, uom: string | null, kind: "temperature" | "wind" | "pressure" | "plain") {
  const unit = uom?.toLowerCase() ?? "";

  if (kind === "temperature") {
    if (unit.includes("degf") || unit.endsWith(":degf")) {
      return value;
    }

    return celsiusToFahrenheit(value);
  }

  if (kind === "wind") {
    if (unit.includes("mi_h-1") || unit.includes("mph")) {
      return value;
    }

    return kmhToMph(value);
  }

  if (kind === "pressure") {
    return value > 2000 ? pascalToMb(value) : value;
  }

  return value;
}

function getNwsGridValueForTime(
  data: Record<string, unknown> | null,
  key: string,
  timeLocal: string,
  timezone: string,
  kind: "temperature" | "wind" | "pressure" | "plain"
) {
  const layer = getNwsGridLayer(data, key);

  for (const item of layer.values) {
    const start = parseNwsIntervalStart(item.validTime);
    const value = toNumber(item.value);

    if (!start || value === null) {
      continue;
    }

    if (getLocalDateTimeLabel(start, timezone) === timeLocal) {
      return roundOne(convertGridValue(value, layer.uom, kind));
    }
  }

  return null;
}

function getNwsGridMaxForDate(
  data: Record<string, unknown> | null,
  key: string,
  eventDate: string,
  timezone: string,
  kind: "temperature" | "wind" | "pressure" | "plain"
) {
  const layer = getNwsGridLayer(data, key);
  const values = layer.values
    .map((item) => {
      const start = parseNwsIntervalStart(item.validTime);
      const value = toNumber(item.value);

      if (!start || value === null) {
        return null;
      }

      if (getLocalDateFromIso(start, timezone) !== eventDate) {
        return null;
      }

      return {
        value: roundOne(convertGridValue(value, layer.uom, kind)),
        timeLocal: getLocalDateTimeLabel(start, timezone),
        hourLocal: getLocalHour(start, timezone),
      };
    })
    .filter(
      (item): item is { value: number; timeLocal: string | null; hourLocal: number | null } =>
        item !== null && item.value !== null
    );

  if (values.length === 0) {
    return { value: null, timeLocal: null };
  }

  const best = values.reduce((currentBest, value) =>
    value.value > currentBest.value ? value : currentBest
  );

  return { value: best.value, timeLocal: best.timeLocal };
}

function getNwsHazards(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const layer = getNwsGridLayer(data, "hazards");

  return uniqueStrings(
    layer.values
      .map((item) => {
        const start = parseNwsIntervalStart(item.validTime);

        if (!start || getLocalDateFromIso(start, timezone) !== eventDate) {
          return null;
        }

        const values = Array.isArray(item.value) ? item.value : [];
        return values
          .map((hazard) => {
            if (!hazard || typeof hazard !== "object" || Array.isArray(hazard)) {
              return null;
            }

            const record = hazard as Record<string, unknown>;
            return [record.phenomenon, record.significance]
              .filter((value): value is string => typeof value === "string")
              .join(".");
          })
          .filter((value): value is string => Boolean(value));
      })
      .flat()
  );
}

function getNwsWeatherSummary(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const layer = getNwsGridLayer(data, "weather");
  const descriptions = uniqueStrings(
    layer.values
      .map((item) => {
        const start = parseNwsIntervalStart(item.validTime);

        if (!start || getLocalDateFromIso(start, timezone) !== eventDate) {
          return null;
        }

        const values = Array.isArray(item.value) ? item.value : [];
        return values.map((weather) => {
          if (!weather || typeof weather !== "object" || Array.isArray(weather)) {
            return null;
          }

          const record = weather as Record<string, unknown>;
          return [record.coverage, record.intensity, record.weather]
            .filter((value): value is string => typeof value === "string")
            .join(" ")
            .replaceAll("_", " ");
        });
      })
      .flat()
  );

  return descriptions.length > 0 ? descriptions.slice(0, 4).join("; ") : null;
}

function getNwsPeakWindow(data: Record<string, unknown> | null, eventDate: string, timezone: string) {
  const temperatureLayer = getNwsGridLayer(data, "temperature");
  const maxTemperatureLayer = getNwsGridLayer(data, "maxTemperature");
  const candidateTimes = uniqueStrings(
    [...temperatureLayer.values, ...maxTemperatureLayer.values]
      .map((item) => parseNwsIntervalStart(item.validTime))
      .filter((start): start is string => Boolean(start))
      .filter((start) => getLocalDateFromIso(start, timezone) === eventDate)
      .filter((start) => {
        const hour = getLocalHour(start, timezone);
        return hour !== null && hour >= 10 && hour <= 20;
      })
      .map((start) => getLocalDateTimeLabel(start, timezone))
  );

  return candidateTimes.slice(0, 16).map((timeLocal) => ({
    timeLocal,
    temperatureF: getNwsGridValueForTime(data, "temperature", timeLocal, timezone, "temperature"),
    maxTemperatureF: getNwsGridValueForTime(data, "maxTemperature", timeLocal, timezone, "temperature"),
    dewPointF: getNwsGridValueForTime(data, "dewpoint", timeLocal, timezone, "temperature"),
    relativeHumidityPercent: getNwsGridValueForTime(data, "relativeHumidity", timeLocal, timezone, "plain"),
    skyCoverPercent: getNwsGridValueForTime(data, "skyCover", timeLocal, timezone, "plain"),
    windDirectionDegrees: getNwsGridValueForTime(data, "windDirection", timeLocal, timezone, "plain"),
    windSpeedMph: getNwsGridValueForTime(data, "windSpeed", timeLocal, timezone, "wind"),
    windGustMph: getNwsGridValueForTime(data, "windGust", timeLocal, timezone, "wind"),
    probabilityOfPrecipitationPercent: getNwsGridValueForTime(
      data,
      "probabilityOfPrecipitation",
      timeLocal,
      timezone,
      "plain"
    ),
    probabilityOfThunderPercent: getNwsGridValueForTime(data, "probabilityOfThunder", timeLocal, timezone, "plain"),
    pressureMb: getNwsGridValueForTime(data, "pressure", timeLocal, timezone, "pressure"),
  }));
}

function getThunderstormRiskText(
  dailyForecast: Record<string, unknown> | null,
  alerts: Record<string, unknown> | null,
  nwsWeatherSummary: string | null,
  thunderstormProbability: number | null
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

  if (thunderstormProbability !== null && thunderstormProbability >= 30) {
    return `Open-Meteo thunderstorm probability near peak is ${thunderstormProbability}%.`;
  }

  return alertText ?? periodText ?? nwsWeatherSummary ?? null;
}

function getModelAgreement(values: number[]) {
  if (values.length < 2) {
    return "insufficient" as const;
  }

  const spread = Math.max(...values) - Math.min(...values);

  if (spread <= 1.5) {
    return "strong" as const;
  }

  if (spread <= 3) {
    return "moderate" as const;
  }

  return "weak" as const;
}

function getRemainingHeatingHours(params: { eventDate: string; timezone: string; now: Date }) {
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

function getRiskFromConditions(params: {
  eventIsToday: boolean;
  latestTempF: number | null;
  observedHighF: number | null;
  likelyTemperatureF: number | null;
  trend: WeatherEvidenceTrend;
  remainingHeatingHours: number | null;
  precipitationProbability: number | null;
  thunderstormProbability: number | null;
  cloudCover: number | null;
  modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
}) {
  if (!params.eventIsToday || params.likelyTemperatureF === null) {
    return {
      overshootRisk: params.modelAgreement === "weak" ? "moderate" : "insufficient",
      capRisk: params.modelAgreement === "weak" ? "moderate" : "insufficient",
    } as const;
  }

  let overshootScore = 0;
  let capScore = 0;

  if (params.trend === "rising") overshootScore += 2;
  if (params.trend === "falling") capScore += 2;
  if ((params.remainingHeatingHours ?? 0) >= 2) overshootScore += 1;
  if ((params.remainingHeatingHours ?? 0) <= 1) capScore += 1;

  if (params.observedHighF !== null && params.likelyTemperatureF - params.observedHighF >= 1.5) {
    overshootScore += 2;
  }

  if ((params.cloudCover ?? 0) >= 70) capScore += 1;
  if ((params.precipitationProbability ?? 0) >= 40) capScore += 2;
  if ((params.thunderstormProbability ?? 0) >= 25) capScore += 2;

  return {
    overshootRisk: overshootScore >= 4 ? "high" : overshootScore >= 2 ? "moderate" : "low",
    capRisk: capScore >= 4 ? "high" : capScore >= 2 ? "moderate" : "low",
  } as const;
}

function buildReasoning(params: {
  observedHighF: number | null;
  latestTempF: number | null;
  trend: WeatherEvidenceTrend;
  modelAgreement: "strong" | "moderate" | "weak" | "insufficient";
  likelyBucket: string | null;
  forecastSpreadF: number | null;
  precipitationProbability: number | null;
  thunderstormProbability: number | null;
  cloudCover: number | null;
  remainingHeatingHours: number | null;
}) {
  const supportiveFactors: string[] = [];
  const limitingFactors: string[] = [];
  const watchTriggers: string[] = [];
  const invalidationSignals: string[] = [];

  if (params.observedHighF !== null) {
    supportiveFactors.push(`Official station observed high so far is ${params.observedHighF}°F.`);
  }

  if (params.latestTempF !== null) {
    supportiveFactors.push(`Latest official station observation is ${params.latestTempF}°F.`);
  }

  if (params.trend === "rising") {
    supportiveFactors.push("Recent official station trend is rising.");
  } else if (params.trend === "falling") {
    limitingFactors.push("Recent official station trend is falling.");
  }

  if (params.modelAgreement === "strong") {
    supportiveFactors.push("Forecast sources have strong agreement.");
  } else if (params.modelAgreement === "weak") {
    limitingFactors.push("Forecast sources disagree by several degrees.");
  }

  if ((params.forecastSpreadF ?? 0) >= 3) {
    limitingFactors.push(`Forecast spread is wide at about ${params.forecastSpreadF}°F.`);
  }

  if ((params.cloudCover ?? 0) >= 70) {
    limitingFactors.push(`Cloud cover near peak heating is high at about ${params.cloudCover}%.`);
  }

  if ((params.precipitationProbability ?? 0) >= 40) {
    limitingFactors.push(`Precipitation probability near peak heating is elevated at about ${params.precipitationProbability}%.`);
  }

  if ((params.thunderstormProbability ?? 0) >= 25) {
    limitingFactors.push(`Thunderstorm probability near peak heating is elevated at about ${params.thunderstormProbability}%.`);
  }

  watchTriggers.push("Monitor the next official station observation and whether it makes a new event-date high.");
  watchTriggers.push("Monitor NWS hourly forecast updates and Open-Meteo model refreshes for bucket shifts.");

  if (params.likelyBucket) {
    invalidationSignals.push(`A forecast/observation shift outside ${params.likelyBucket} weakens the current bucket read.`);
  }

  if (params.remainingHeatingHours !== null && params.remainingHeatingHours <= 1) {
    watchTriggers.push("With little heating time left, each additional official observation becomes more decisive.");
  }

  return {
    summary: params.likelyBucket
      ? `Most structured evidence currently points toward ${params.likelyBucket}.`
      : "The evidence packet does not yet identify a clear most-likely bucket.",
    supportiveFactors,
    limitingFactors,
    watchTriggers,
    invalidationSignals,
  };
}

export function buildWeatherEvidencePacket(params: {
  stationId: string;
  stationName?: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  eventDate: string;
  eventFamily?: "daily_high" | "hourly_temperature";
  eventHourLocal?: number | null;
  nwsPoint: Record<string, unknown> | null;
  nwsDailyForecast: Record<string, unknown> | null;
  nwsHourlyForecast: Record<string, unknown> | null;
  nwsGridpointData?: Record<string, unknown> | null;
  nwsObservations: Record<string, unknown> | null;
  nwsAlerts: Record<string, unknown> | null;
  openMeteo: Record<string, unknown> | null;
  openMeteoEvidence?: OpenMeteoEvidenceForecasts | null;
  now?: Date;
}): WeatherEvidencePacket {
  const now = params.now ?? new Date();
  const today = getLocalDateFromIso(now.toISOString(), params.timezone);
  const tomorrowDate = new Date(`${today ?? params.eventDate}T00:00:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const eventFamily = params.eventFamily ?? "daily_high";
  const observations = normalizeObservations({
    data: params.nwsObservations,
    eventDate: params.eventDate,
    timezone: params.timezone,
  });

  const nwsDailyHighF = getNwsDailyHighF(params.nwsDailyForecast, params.eventDate, params.timezone);
  const nwsHourlyHigh = getNwsHourlyHigh(params.nwsHourlyForecast, params.eventDate, params.timezone);
  const nwsGridMax = getNwsGridMaxForDate(
    params.nwsGridpointData ?? null,
    "maxTemperature",
    params.eventDate,
    params.timezone,
    "temperature"
  );
  const nwsGridTemperatureMax = getNwsGridMaxForDate(
    params.nwsGridpointData ?? null,
    "temperature",
    params.eventDate,
    params.timezone,
    "temperature"
  );

  const bestMatchData = params.openMeteoEvidence?.bestMatch ?? params.openMeteo;
  const openMeteoDailyHighF = getOpenMeteoDailyHigh(bestMatchData, params.eventDate);
  const openMeteoHourlyHigh = getOpenMeteoHourlyHigh(bestMatchData, params.eventDate);

  const modelEvidence = {
    bestMatch: getModelEvidence("Open-Meteo best match", bestMatchData, params.eventDate),
    hrrr: getModelEvidence("Open-Meteo HRRR", params.openMeteoEvidence?.hrrr ?? null, params.eventDate),
    nbm: getModelEvidence("Open-Meteo NBM", params.openMeteoEvidence?.nbm ?? null, params.eventDate),
    gfs: getModelEvidence("Open-Meteo GFS", params.openMeteoEvidence?.gfs ?? null, params.eventDate),
    ecmwf: getModelEvidence("Open-Meteo ECMWF IFS", params.openMeteoEvidence?.ecmwf ?? null, params.eventDate),
    ensemble: getEnsembleEvidence(params.openMeteoEvidence?.ensemble ?? null, params.eventDate),
  };

  const allHighs = [
    nwsHourlyHigh.high,
    nwsDailyHighF,
    nwsGridMax.value,
    nwsGridTemperatureMax.value,
    modelEvidence.bestMatch?.hourlyHighF ?? modelEvidence.bestMatch?.dailyHighF ?? null,
    modelEvidence.hrrr?.hourlyHighF ?? modelEvidence.hrrr?.dailyHighF ?? null,
    modelEvidence.nbm?.hourlyHighF ?? modelEvidence.nbm?.dailyHighF ?? null,
    modelEvidence.gfs?.hourlyHighF ?? modelEvidence.gfs?.dailyHighF ?? null,
    modelEvidence.ecmwf?.hourlyHighF ?? modelEvidence.ecmwf?.dailyHighF ?? null,
    modelEvidence.ensemble?.hourlyHighF ?? modelEvidence.ensemble?.dailyHighF ?? null,
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  const forecastHighAverageF = roundOne(average(allHighs));
  const forecastHighMedianF = roundOne(median(allHighs));
  const forecastSpreadF = allHighs.length > 1 ? roundOne(Math.max(...allHighs) - Math.min(...allHighs)) : null;
  const modelAgreement = getModelAgreement(allHighs);
  const likelyTemperatureF =
    forecastHighMedianF ??
    observations.observedHighReading?.tempF ??
    observations.latest?.tempF ??
    null;

  const likelyBucket = getDailyHighBucketLabel(likelyTemperatureF);
  const alternateBuckets = uniqueStrings([
    getDailyHighBucketLabel(nwsHourlyHigh.high),
    getDailyHighBucketLabel(nwsDailyHighF),
    getDailyHighBucketLabel(nwsGridMax.value),
    getDailyHighBucketLabel(openMeteoHourlyHigh?.temp ?? null),
    getDailyHighBucketLabel(openMeteoDailyHighF),
    modelEvidence.hrrr?.likelyBucket ?? null,
    modelEvidence.nbm?.likelyBucket ?? null,
    modelEvidence.gfs?.likelyBucket ?? null,
    modelEvidence.ecmwf?.likelyBucket ?? null,
    modelEvidence.ensemble?.likelyBucket ?? null,
  ]);

  const openMeteoHighIndex = openMeteoHourlyHigh?.index ?? modelEvidence.bestMatch?.peakIndex ?? null;
  const peakWindow = getNwsPeakWindow(params.nwsGridpointData ?? null, params.eventDate, params.timezone);
  const nwsHazards = getNwsHazards(params.nwsGridpointData ?? null, params.eventDate, params.timezone);
  const nwsWeatherSummary = getNwsWeatherSummary(params.nwsGridpointData ?? null, params.eventDate, params.timezone);

  const thunderstormProbability = getOpenMeteoValueAtIndex(bestMatchData, "thunderstorm_probability", openMeteoHighIndex);
  const precipitationProbability = getOpenMeteoValueAtIndex(bestMatchData, "precipitation_probability", openMeteoHighIndex);
  const cloudCover = getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover", openMeteoHighIndex);
  const remainingHeatingHours = getRemainingHeatingHours({ eventDate: params.eventDate, timezone: params.timezone, now });

  const risks = getRiskFromConditions({
    eventIsToday: today === params.eventDate,
    latestTempF: observations.latest?.tempF ?? null,
    observedHighF: observations.observedHighReading?.tempF ?? null,
    likelyTemperatureF,
    trend: observations.trend,
    remainingHeatingHours,
    precipitationProbability,
    thunderstormProbability,
    cloudCover,
    modelAgreement,
  });

  const confidenceBase =
    modelAgreement === "strong" ? 78 : modelAgreement === "moderate" ? 62 : modelAgreement === "weak" ? 42 : 25;
  const spreadPenalty = forecastSpreadF !== null ? Math.min(20, Math.max(0, (forecastSpreadF - 1) * 5)) : 10;
  const bucketConfidencePercent = Math.max(0, Math.min(95, Math.round(confidenceBase - spreadPenalty)));

  const reasoning = buildReasoning({
    observedHighF: observations.observedHighReading?.tempF ?? null,
    latestTempF: observations.latest?.tempF ?? null,
    trend: observations.trend,
    modelAgreement,
    likelyBucket,
    forecastSpreadF,
    precipitationProbability,
    thunderstormProbability,
    cloudCover,
    remainingHeatingHours,
  });

  const evidenceNotes: string[] = [];

  if (observations.observedHighReading?.tempF !== null && observations.observedHighReading) {
    evidenceNotes.push(
      `Observed high so far is ${observations.observedHighReading.tempF}°F at ${observations.observedHighReading.timeLocal}.`
    );
  }

  if (nwsHourlyHigh.high !== null) {
    evidenceNotes.push(
      `NWS hourly forecast high is ${nwsHourlyHigh.high}°F${
        nwsHourlyHigh.timeLocal ? ` near ${nwsHourlyHigh.timeLocal}` : ""
      }, pointing to ${getDailyHighBucketLabel(nwsHourlyHigh.high)}.`
    );
  }

  if (nwsGridMax.value !== null) {
    evidenceNotes.push(
      `NWS raw grid maxTemperature is ${nwsGridMax.value}°F${
        nwsGridMax.timeLocal ? ` near ${nwsGridMax.timeLocal}` : ""
      }, pointing to ${getDailyHighBucketLabel(nwsGridMax.value)}.`
    );
  }

  if (openMeteoHourlyHigh?.temp !== undefined) {
    evidenceNotes.push(
      `Open-Meteo best-match hourly high is ${openMeteoHourlyHigh.temp}°F near ${openMeteoHourlyHigh.timeLocal}, pointing to ${getDailyHighBucketLabel(openMeteoHourlyHigh.temp)}.`
    );
  }

  if (likelyBucket) {
    evidenceNotes.push(
      `Daily high bucket mapping uses floor-to-next-degree ranges: 93.5 means 93° to 94°, not an above-93.5 threshold. Current consensus points to ${likelyBucket}.`
    );
  }

  const localNowLabel = getLocalDateTimeLabel(now.toISOString(), params.timezone);

  const modelConsensus = [
    {
      source: "Station observations",
      forecastHighF: observations.observedHighReading?.tempF ?? null,
      bucket: getDailyHighBucketLabel(observations.observedHighReading?.tempF ?? null),
      weight: params.eventDate === today ? "very_high" as const : "context" as const,
      notes:
        observations.observedHighReading?.tempF !== null && observations.observedHighReading
          ? "Official station observations are the live settlement anchor for same-day markets."
          : "No event-date station high is available yet.",
    },
    {
      source: "NWS daily",
      forecastHighF: nwsDailyHighF,
      bucket: getDailyHighBucketLabel(nwsDailyHighF),
      weight: "high" as const,
      notes: "Official public NWS forecast high.",
    },
    {
      source: "NWS hourly",
      forecastHighF: nwsHourlyHigh.high,
      bucket: getDailyHighBucketLabel(nwsHourlyHigh.high),
      weight: "high" as const,
      notes: nwsHourlyHigh.timeLocal
        ? `Hourly NWS peak near ${nwsHourlyHigh.timeLocal}.`
        : "NWS hourly peak timing unavailable.",
    },
    {
      source: "NWS grid",
      forecastHighF: nwsGridMax.value,
      bucket: getDailyHighBucketLabel(nwsGridMax.value),
      weight: "medium_high" as const,
      notes: "Raw NWS gridpoint maxTemperature guidance.",
    },
    {
      source: "Open-Meteo Best Match",
      forecastHighF: modelEvidence.bestMatch?.hourlyHighF ?? openMeteoHourlyHigh?.temp ?? openMeteoDailyHighF,
      bucket: getDailyHighBucketLabel(modelEvidence.bestMatch?.hourlyHighF ?? openMeteoHourlyHigh?.temp ?? openMeteoDailyHighF),
      weight: "medium_high" as const,
      notes: "Open-Meteo blended best-match model guidance.",
    },
    {
      source: "HRRR",
      forecastHighF: modelEvidence.hrrr?.hourlyHighF ?? null,
      bucket: modelEvidence.hrrr?.likelyBucket ?? null,
      weight: params.eventDate === today ? "high" as const : "medium" as const,
      notes: "Rapid-refresh short-term guidance when available.",
    },
    {
      source: "NBM",
      forecastHighF: modelEvidence.nbm?.hourlyHighF ?? null,
      bucket: modelEvidence.nbm?.likelyBucket ?? null,
      weight: "high" as const,
      notes: "National Blend of Models guidance for the event location.",
    },
    {
      source: "GFS",
      forecastHighF: modelEvidence.gfs?.hourlyHighF ?? null,
      bucket: modelEvidence.gfs?.likelyBucket ?? null,
      weight: "medium" as const,
      notes: "Global model guidance; useful for broader trend confirmation.",
    },
    {
      source: "ECMWF",
      forecastHighF: modelEvidence.ecmwf?.hourlyHighF ?? null,
      bucket: modelEvidence.ecmwf?.likelyBucket ?? null,
      weight: "medium_high" as const,
      notes: "Independent global model confirmation or disagreement.",
    },
    {
      source: "Ensemble",
      forecastHighF: modelEvidence.ensemble?.hourlyHighF ?? null,
      bucket: modelEvidence.ensemble?.likelyBucket ?? null,
      weight: "context" as const,
      notes:
        modelEvidence.ensemble?.temperatureSpreadFNearHigh !== null && modelEvidence.ensemble?.temperatureSpreadFNearHigh !== undefined
          ? `Ensemble spread near high is ${modelEvidence.ensemble.temperatureSpreadFNearHigh}°F.`
          : "Ensemble spread unavailable; use as contextual evidence only.",
    },
  ].filter((row) => row.forecastHighF !== null || row.bucket !== null);

  const bucketProbabilities = normalizeProbabilityDistribution([
    {
      bucket: likelyBucket,
      weight: bucketConfidencePercent ?? 0,
      reasoning: "Primary consensus bucket from weighted NWS/Open-Meteo evidence.",
    },
    {
      bucket: getNeighborBucket(likelyTemperatureF, 1),
      weight: risks.overshootRisk === "high" ? 28 : risks.overshootRisk === "moderate" ? 18 : 8,
      reasoning: "Hot-tail/overshoot bucket based on remaining heating, model spread, and storm/cap risk.",
    },
    {
      bucket: getNeighborBucket(likelyTemperatureF, -1),
      weight: risks.capRisk === "high" ? 28 : risks.capRisk === "moderate" ? 18 : 8,
      reasoning: "Cool-tail/cap-risk bucket based on clouds, precipitation, thunder risk, and weak heating support.",
    },
    ...alternateBuckets.map((bucket) => ({
      bucket,
      weight: 10,
      reasoning: "Alternate bucket from disagreement among forecast sources.",
    })),
  ]);

  const observationTriggers = [
    {
      trigger: "Official station prints a temperature inside the hot-tail bucket.",
      action: "Reassess immediately for hedge/roll or avoid chasing if price has already corrected.",
      urgency: "high" as const,
    },
    {
      trigger: "Two consecutive official observations remain capped below the likely bucket while heating time is running out.",
      action: "Increase confidence in the cooler/current bucket and consider trimming weak hot-tail exposure.",
      urgency: "medium" as const,
    },
    {
      trigger: "Updated HRRR/NBM/NWS hourly guidance shifts by at least 1°F into a neighboring bucket.",
      action: "Recompute fair value and compare the new target basket to current ask before entering.",
      urgency: "medium" as const,
    },
  ];

  const settlementClock = buildSettlementClockRead({
    localNow: localNowLabel,
    remainingHeatingHours,
    isToday: today === params.eventDate,
    isFuture: today !== null ? params.eventDate > today : false,
  });

  const forecastChangeRead =
    forecastSpreadF === null
      ? "Forecast-change read is unavailable because too few model sources returned usable highs."
      : forecastSpreadF <= 1.5
        ? "Models are tightly clustered; bucket confidence should be driven more by price and live observations."
        : forecastSpreadF <= 3
          ? "Models show moderate spread; keep neighboring buckets live and avoid overpaying for one outcome."
          : "Models are widely spread; treat the bucket read as unstable until guidance converges.";

  const latest = observations.latest;
  const currentTempVsObservedHighF =
    latest?.tempF !== null && latest?.tempF !== undefined && observations.observedHighReading?.tempF !== null && observations.observedHighReading?.tempF !== undefined
      ? roundOne(latest.tempF - observations.observedHighReading.tempF)
      : null;

  return {
    station: {
      id: params.stationId,
      name: params.stationName ?? null,
      timezone: params.timezone,
      latitude: params.latitude,
      longitude: params.longitude,
    },
    event: {
      family: eventFamily,
      date: params.eventDate,
      localNow: localNowLabel,
      isToday: today === params.eventDate,
      isTomorrow: tomorrow === params.eventDate,
      isFuture: today !== null ? params.eventDate > today : false,
      eventHourLocal: params.eventHourLocal ?? null,
      remainingHeatingHours,
      settlementAnchor: "official_station_observation",
    },
    observations: {
      latestTempF: latest?.tempF ?? null,
      latestObservationTimeLocal: latest?.timeLocal ?? null,
      observedHighF: observations.observedHighReading?.tempF ?? null,
      observedHighTimeLocal: observations.observedHighReading?.timeLocal ?? null,
      currentTempVsObservedHighF,
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
      nwsGridMaxTemperatureF: nwsGridMax.value,
      nwsGridMaxTemperatureTimeLocal: nwsGridMax.timeLocal,
      openMeteoDailyHighF,
      openMeteoHourlyHighF: openMeteoHourlyHigh?.temp ?? null,
      openMeteoHourlyHighTimeLocal: openMeteoHourlyHigh?.timeLocal ?? null,
      forecastHighAverageF,
      forecastHighMedianF,
      forecastSpreadF,
      modelAgreement,
      likelyTemperatureF,
      likelyBucket,
      alternateBuckets,
      alternateTemperatureRangeF: {
        low: allHighs.length > 0 ? roundOne(Math.min(...allHighs)) : null,
        high: allHighs.length > 0 ? roundOne(Math.max(...allHighs)) : null,
      },
    },
    openMeteoModels: {
      bestMatch: modelEvidence.bestMatch,
      hrrr: modelEvidence.hrrr,
      nbm: modelEvidence.nbm,
      gfs: modelEvidence.gfs,
      ecmwf: modelEvidence.ecmwf,
      ensemble: modelEvidence.ensemble,
      sourceErrors: params.openMeteoEvidence?.errors ?? [],
    },
    nwsGrid: {
      updateTime:
        typeof (params.nwsGridpointData?.properties as Record<string, unknown> | undefined)?.updateTime === "string"
          ? ((params.nwsGridpointData?.properties as Record<string, unknown>).updateTime as string)
          : null,
      validTimes:
        typeof (params.nwsGridpointData?.properties as Record<string, unknown> | undefined)?.validTimes === "string"
          ? ((params.nwsGridpointData?.properties as Record<string, unknown>).validTimes as string)
          : null,
      rawMaxTemperatureF: nwsGridMax.value,
      rawMaxTemperatureTimeLocal: nwsGridMax.timeLocal,
      peakWindow,
      hazards: nwsHazards,
      weatherSummary: nwsWeatherSummary,
    },
    atmosphere: {
      cloudCoverPercentNearHigh: cloudCover,
      lowCloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover_low", openMeteoHighIndex),
      midCloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover_mid", openMeteoHighIndex),
      highCloudCoverPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cloud_cover_high", openMeteoHighIndex),
      windSpeedMphNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "wind_speed_10m", openMeteoHighIndex),
      windGustMphNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "wind_gusts_10m", openMeteoHighIndex),
      windDirectionDegreesNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "wind_direction_10m", openMeteoHighIndex),
      dewPointFNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "dew_point_2m", openMeteoHighIndex),
      humidityPercentNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "relative_humidity_2m", openMeteoHighIndex),
      shortwaveRadiationNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "shortwave_radiation", openMeteoHighIndex),
      sunshineDurationSecondsNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "sunshine_duration", openMeteoHighIndex),
      precipitationProbabilityNearHigh: precipitationProbability,
      thunderstormProbabilityNearHigh: thunderstormProbability,
      capeNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "cape", openMeteoHighIndex),
      liftedIndexNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "lifted_index", openMeteoHighIndex),
      convectiveInhibitionNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "convective_inhibition", openMeteoHighIndex),
      boundaryLayerHeightMetersNearHigh: getOpenMeteoValueAtIndex(bestMatchData, "boundary_layer_height", openMeteoHighIndex),
      thunderstormRiskText: getThunderstormRiskText(
        params.nwsDailyForecast,
        params.nwsAlerts,
        nwsWeatherSummary,
        thunderstormProbability
      ),
      latestCloudText: latest?.cloudText ?? null,
      latestWindSpeedMph: latest?.windSpeedMph ?? null,
      latestWindGustMph: latest?.windGustMph ?? null,
      latestHumidityPercent: latest?.humidityPercent ?? null,
    },
    bucketAnalysis: {
      mostLikelyBucket: likelyBucket,
      secondMostLikelyBucket: alternateBuckets.find((bucket) => bucket !== likelyBucket) ?? null,
      hotTailBucket: getNeighborBucket(likelyTemperatureF, 1),
      coolTailBucket: getNeighborBucket(likelyTemperatureF, -1),
      bucketConfidencePercent,
      overshootRisk: risks.overshootRisk,
      capRisk: risks.capRisk,
    },
    decisionSupport: {
      modelConsensus,
      bucketProbabilities,
      observationTriggers,
      settlementClock,
      forecastChangeRead,
    },
    reasoning,
    rawSources: {
      nwsPoint: params.nwsPoint,
      nwsDailyForecast: params.nwsDailyForecast,
      nwsHourlyForecast: params.nwsHourlyForecast,
      nwsGridpointData: params.nwsGridpointData ?? null,
      nwsAlerts: params.nwsAlerts,
      openMeteo: params.openMeteo,
      openMeteoEvidence: params.openMeteoEvidence ?? null,
    },
    evidenceNotes,
  };
}

export function sanitizeWeatherEvidenceForClient(packet: WeatherEvidencePacket) {
  const { rawSources, ...safePacket } = packet;

  return {
    ...safePacket,
    rawSources: {
      nwsPoint: rawSources.nwsPoint ? "available" : null,
      nwsDailyForecast: rawSources.nwsDailyForecast ? "available" : null,
      nwsHourlyForecast: rawSources.nwsHourlyForecast ? "available" : null,
      nwsGridpointData: rawSources.nwsGridpointData ? "available" : null,
      nwsAlerts: rawSources.nwsAlerts ? "available" : null,
      openMeteo: rawSources.openMeteo ? "available" : null,
      openMeteoEvidence: rawSources.openMeteoEvidence ? "available" : null,
    },
  };
}
