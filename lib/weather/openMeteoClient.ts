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
    hourly: "temperature_2m",
    daily: "temperature_2m_max,temperature_2m_min",
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