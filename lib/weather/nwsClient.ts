const NWS_BASE_URL = "https://api.weather.gov";

const NWS_HEADERS = {
  Accept: "application/geo+json, application/json",
  "User-Agent": "kalshi-assistant-web/0.1 contact:nicholaslpollard@gmail.com",
};

async function nwsFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${NWS_BASE_URL}${path}`, {
    headers: NWS_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NWS request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function nwsFetchUrl(url: string, label: string) {
  const response = await fetch(url, {
    headers: NWS_HEADERS,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${label} request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function getNwsPoint(latitude: number, longitude: number) {
  return nwsFetch<Record<string, unknown>>(
    `/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );
}

export async function getNwsForecastFromUrl(url: string) {
  return nwsFetchUrl(url, "NWS forecast");
}

export async function getNwsGridpointDataFromUrl(url: string) {
  return nwsFetchUrl(url, "NWS gridpoint data");
}

export async function getNwsHourlyForecastFromPoint(
  point: Record<string, unknown>
) {
  const properties = point.properties as Record<string, unknown> | undefined;
  const forecastHourlyUrl =
    typeof properties?.forecastHourly === "string"
      ? properties.forecastHourly
      : null;

  if (!forecastHourlyUrl) {
    return null;
  }

  return getNwsForecastFromUrl(forecastHourlyUrl);
}

export async function getNwsGridpointDataFromPoint(
  point: Record<string, unknown>
) {
  const properties = point.properties as Record<string, unknown> | undefined;
  const forecastGridDataUrl =
    typeof properties?.forecastGridData === "string"
      ? properties.forecastGridData
      : null;

  if (!forecastGridDataUrl) {
    return null;
  }

  return getNwsGridpointDataFromUrl(forecastGridDataUrl);
}

export async function getNwsStationObservations(stationId: string) {
  return nwsFetch<Record<string, unknown>>(
    `/stations/${encodeURIComponent(stationId)}/observations?limit=500`
  );
}

export async function getNwsStationObservationsForRange(
  stationId: string,
  start: string,
  end: string,
  limit = 500
) {
  const params = new URLSearchParams({
    start,
    end,
    limit: String(Math.min(Math.max(limit, 1), 500)),
  });

  return nwsFetch<Record<string, unknown>>(
    `/stations/${encodeURIComponent(stationId)}/observations?${params.toString()}`
  );
}

export async function getNwsAlerts(latitude: number, longitude: number) {
  return nwsFetch<Record<string, unknown>>(
    `/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );
}
