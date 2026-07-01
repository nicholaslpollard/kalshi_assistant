export type OpenMeteoEvidenceForecasts = {
  bestMatch: Record<string, unknown> | null;
  hrrr: Record<string, unknown> | null;
  nbm: Record<string, unknown> | null;
  gfs: Record<string, unknown> | null;
  ecmwf: Record<string, unknown> | null;
  ensemble: Record<string, unknown> | null;
  errors: string[];
};

type OpenMeteoForecastParams = {
  latitude: number;
  longitude: number;
  timezone: string;
  startDate: string;
  endDate: string;
};

const CORE_HOURLY_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "dew_point_2m",
  "precipitation_probability",
  "precipitation",
  "rain",
  "showers",
  "weather_code",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "shortwave_radiation",
  "sunshine_duration",
  "cape",
  "lifted_index",
  "convective_inhibition",
  "boundary_layer_height",
  "thunderstorm_probability",
];

const CORE_DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "precipitation_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "sunshine_duration",
];

const ECMWF_HOURLY_VARIABLES = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "dew_point_2m",
  "precipitation",
  "rain",
  "showers",
  "weather_code",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "shortwave_radiation",
  "sunshine_duration",
  "cape",
  "convective_inhibition",
  "total_column_integrated_water_vapour",
  "vapour_pressure_deficit",
  "boundary_layer_height",
];

const ENSEMBLE_HOURLY_VARIABLES = [
  "temperature_2m",
  "temperature_2m_spread",
  "relative_humidity_2m",
  "relative_humidity_2m_spread",
  "dew_point_2m",
  "dew_point_2m_spread",
  "apparent_temperature",
  "apparent_temperature_spread",
  "cloud_cover",
  "cloud_cover_spread",
  "wind_speed_10m",
  "wind_speed_10m_spread",
  "wind_gusts_10m",
  "wind_gusts_10m_spread",
  "surface_pressure",
  "surface_pressure_spread",
];

const ENSEMBLE_DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "cloud_cover_mean",
  "cloud_cover_max",
  "precipitation_sum",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "shortwave_radiation_sum",
];

function createBaseSearchParams(params: OpenMeteoForecastParams) {
  return new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    timezone: params.timezone,
    start_date: params.startDate,
    end_date: params.endDate,
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timeformat: "iso8601",
    cell_selection: "land",
  });
}

async function fetchOpenMeteoJson(url: string, searchParams: URLSearchParams) {
  const response = await fetch(`${url}?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    let reason = `${response.status} ${response.statusText}`;

    try {
      const errorBody = (await response.json()) as Record<string, unknown>;
      if (typeof errorBody.reason === "string") {
        reason = errorBody.reason;
      }
    } catch {
      // Keep the HTTP status fallback.
    }

    throw new Error(`Open-Meteo request failed: ${reason}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function getOpenMeteoForecast(params: OpenMeteoForecastParams) {
  const searchParams = createBaseSearchParams(params);

  searchParams.set("hourly", CORE_HOURLY_VARIABLES.join(","));
  searchParams.set("daily", CORE_DAILY_VARIABLES.join(","));

  return fetchOpenMeteoJson("https://api.open-meteo.com/v1/forecast", searchParams);
}

async function getOpenMeteoModelForecast(params: OpenMeteoForecastParams & { model: string }) {
  const searchParams = createBaseSearchParams(params);

  searchParams.set("models", params.model);
  searchParams.set("hourly", CORE_HOURLY_VARIABLES.join(","));
  searchParams.set("daily", CORE_DAILY_VARIABLES.join(","));

  return fetchOpenMeteoJson("https://api.open-meteo.com/v1/forecast", searchParams);
}

async function getOpenMeteoEcmwfForecast(params: OpenMeteoForecastParams) {
  const searchParams = createBaseSearchParams(params);

  searchParams.set("models", "ecmwf_ifs");
  searchParams.set("hourly", ECMWF_HOURLY_VARIABLES.join(","));
  searchParams.set("daily", CORE_DAILY_VARIABLES.join(","));

  return fetchOpenMeteoJson("https://api.open-meteo.com/v1/forecast", searchParams);
}

async function getOpenMeteoEnsembleMeanForecast(params: OpenMeteoForecastParams) {
  const searchParams = createBaseSearchParams(params);

  // This call is intentionally best-effort. Open-Meteo model availability and model
  // slugs can change; callers should use the returned errors array instead of
  // failing the entire AI review when this source is unavailable.
  searchParams.set("models", "gfs_seamless");
  searchParams.set("hourly", ENSEMBLE_HOURLY_VARIABLES.join(","));
  searchParams.set("daily", ENSEMBLE_DAILY_VARIABLES.join(","));

  return fetchOpenMeteoJson("https://ensemble-api.open-meteo.com/v1/ensemble", searchParams);
}

async function settleSource(
  label: string,
  promise: Promise<Record<string, unknown>>
): Promise<{ label: string; data: Record<string, unknown> | null; error: string | null }> {
  try {
    return { label, data: await promise, error: null };
  } catch (error) {
    return {
      label,
      data: null,
      error: `${label}: ${error instanceof Error ? error.message : "request failed"}`,
    };
  }
}

export async function getOpenMeteoEvidenceForecasts(
  params: OpenMeteoForecastParams
): Promise<OpenMeteoEvidenceForecasts> {
  const sources = await Promise.all([
    settleSource("Open-Meteo best match", getOpenMeteoForecast(params)),
    settleSource("Open-Meteo HRRR", getOpenMeteoModelForecast({ ...params, model: "hrrr_conus" })),
    settleSource("Open-Meteo NBM", getOpenMeteoModelForecast({ ...params, model: "nbm_conus" })),
    settleSource("Open-Meteo GFS", getOpenMeteoModelForecast({ ...params, model: "gfs_seamless" })),
    settleSource("Open-Meteo ECMWF IFS", getOpenMeteoEcmwfForecast(params)),
    settleSource("Open-Meteo ensemble mean/spread", getOpenMeteoEnsembleMeanForecast(params)),
  ]);

  const byLabel = Object.fromEntries(sources.map((source) => [source.label, source]));

  return {
    bestMatch: byLabel["Open-Meteo best match"]?.data ?? null,
    hrrr: byLabel["Open-Meteo HRRR"]?.data ?? null,
    nbm: byLabel["Open-Meteo NBM"]?.data ?? null,
    gfs: byLabel["Open-Meteo GFS"]?.data ?? null,
    ecmwf: byLabel["Open-Meteo ECMWF IFS"]?.data ?? null,
    ensemble: byLabel["Open-Meteo ensemble mean/spread"]?.data ?? null,
    errors: sources
      .map((source) => source.error)
      .filter((error): error is string => Boolean(error)),
  };
}
