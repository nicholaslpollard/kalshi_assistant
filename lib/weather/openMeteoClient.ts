export async function getOpenMeteoForecast(params: {
  latitude: number;
  longitude: number;
  timezone: string;
  startDate: string;
  endDate: string;
}) {
  const searchParams = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    timezone: params.timezone,
    start_date: params.startDate,
    end_date: params.endDate,
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "dew_point_2m",
      "cloud_cover",
      "cloud_cover_low",
      "cloud_cover_mid",
      "cloud_cover_high",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "shortwave_radiation",
      "surface_pressure",
      "precipitation_probability",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "shortwave_radiation_sum",
    ].join(","),
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Open-Meteo request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<Record<string, unknown>>;
}
