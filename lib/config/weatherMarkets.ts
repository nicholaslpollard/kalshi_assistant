export type WeatherMarketConfig = {
  code: string;
  displayName: string;
  timezone: string;
  latitude: number;
  longitude: number;
  nwsObservationStation: string;
  settlementNote: string;
};

export const WEATHER_MARKETS: Record<string, WeatherMarketConfig> = {
  CHI: {
    code: "CHI",
    displayName: "Chicago, IL",
    timezone: "America/Chicago",
    latitude: 41.8781,
    longitude: -87.6298,
    nwsObservationStation: "KORD",
    settlementNote:
      "Chicago high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  DCA: {
    code: "DCA",
    displayName: "Washington, DC",
    timezone: "America/New_York",
    latitude: 38.9072,
    longitude: -77.0369,
    nwsObservationStation: "KDCA",
    settlementNote:
      "Washington/Reagan National Airport is commonly used for DC weather references. Verify against Kalshi settlement rules.",
  },
  NYC: {
    code: "NYC",
    displayName: "New York, NY",
    timezone: "America/New_York",
    latitude: 40.7128,
    longitude: -74.006,
    nwsObservationStation: "KNYC",
    settlementNote:
      "New York/Central Park observation station is commonly used for NYC weather references. Verify against Kalshi settlement rules.",
  },
  AUS: {
    code: "AUS",
    displayName: "Austin, TX",
    timezone: "America/Chicago",
    latitude: 30.2672,
    longitude: -97.7431,
    nwsObservationStation: "KAUS",
    settlementNote:
      "Austin high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  MIA: {
    code: "MIA",
    displayName: "Miami, FL",
    timezone: "America/New_York",
    latitude: 25.7617,
    longitude: -80.1918,
    nwsObservationStation: "KMIA",
    settlementNote:
      "Miami high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  LAX: {
    code: "LAX",
    displayName: "Los Angeles, CA",
    timezone: "America/Los_Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    nwsObservationStation: "KLAX",
    settlementNote:
      "Los Angeles high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  PHL: {
    code: "PHL",
    displayName: "Philadelphia, PA",
    timezone: "America/New_York",
    latitude: 39.9526,
    longitude: -75.1652,
    nwsObservationStation: "KPHL",
    settlementNote:
      "Philadelphia high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  BOS: {
    code: "BOS",
    displayName: "Boston, MA",
    timezone: "America/New_York",
    latitude: 42.3601,
    longitude: -71.0589,
    nwsObservationStation: "KBOS",
    settlementNote:
      "Boston high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  ATL: {
    code: "ATL",
    displayName: "Atlanta, GA",
    timezone: "America/New_York",
    latitude: 33.749,
    longitude: -84.388,
    nwsObservationStation: "KATL",
    settlementNote:
      "Atlanta high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
  DEN: {
    code: "DEN",
    displayName: "Denver, CO",
    timezone: "America/Denver",
    latitude: 39.7392,
    longitude: -104.9903,
    nwsObservationStation: "KDEN",
    settlementNote:
      "Denver high-temperature market. Observation station should be verified against Kalshi settlement rules.",
  },
};