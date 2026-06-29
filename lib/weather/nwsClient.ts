const NWS_BASE_URL = "https://api.weather.gov";

async function nwsFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${NWS_BASE_URL}${path}`, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "kalshi-assistant-web/0.1 contact:nicholaslpollard@gmail.com",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NWS request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function getNwsPoint(latitude: number, longitude: number) {
  return nwsFetch<Record<string, unknown>>(
    `/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );
}

export async function getNwsForecastFromUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "kalshi-assistant-web/0.1 contact:nicholaslpollard@gmail.com",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`NWS forecast request failed: ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function getNwsStationObservations(stationId: string) {
  return nwsFetch<Record<string, unknown>>(
    `/stations/${encodeURIComponent(stationId)}/observations?limit=500`
  );
}

export async function getNwsAlerts(latitude: number, longitude: number) {
  return nwsFetch<Record<string, unknown>>(
    `/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`
  );
}