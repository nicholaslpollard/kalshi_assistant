import { saveWeatherResolvedResult } from "@/lib/data/weatherHistoryRepository";
import {
  listPendingTrackedWeatherEvents,
  resolvedResultInputFromTrackedEvent,
  updateTrackedWeatherEventResolution,
} from "@/lib/data/trackedWeatherEventRepository";
import { dailyHighBucketCodeFromTemperatureF, dailyHighBucketFromTemperatureF } from "@/lib/weather/bucketUtils";
import { getNwsStationObservationsForRange } from "@/lib/weather/nwsClient";
import type { TrackedWeatherEventDocument, TrackedWeatherResolveSummary } from "@/types/trackedWeatherEvent";

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function celsiusToFahrenheit(value: number) {
  return (value * 9) / 5 + 32;
}

function getLocalParts(timestamp: string, timezone: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hourText = get("hour");
  const minuteText = get("minute");

  if (!year || !month || !day || !hourText || !minuteText) return null;

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(hourText),
    minute: Number(minuteText),
  };
}

function eventDateRangeUtc(eventDate: string) {
  const start = new Date(`${eventDate}T00:00:00Z`);
  const end = new Date(`${eventDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  start.setUTCDate(start.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 2);

  return { start: start.toISOString(), end: end.toISOString() };
}

function getObservationTemperatureF(feature: Record<string, unknown>) {
  const properties = feature.properties as Record<string, unknown> | undefined;
  const temperature = properties?.temperature as Record<string, unknown> | undefined;
  const valueC = toNumber(temperature?.value);
  return valueC === null ? null : celsiusToFahrenheit(valueC);
}

function getObservationTimestamp(feature: Record<string, unknown>) {
  const properties = feature.properties as Record<string, unknown> | undefined;
  return typeof properties?.timestamp === "string" ? properties.timestamp : null;
}

function getTimezoneForStation(stationId: string) {
  if (stationId === "KORD" || stationId === "KAUS") return "America/Chicago";
  if (stationId === "KLAX") return "America/Los_Angeles";
  if (stationId === "KDEN") return "America/Denver";
  return "America/New_York";
}

async function fetchEventDateObservations(event: TrackedWeatherEventDocument & { id?: string }) {
  const range = eventDateRangeUtc(event.eventDate);
  if (!range) throw new Error(`Invalid event date: ${event.eventDate}`);

  const data = await getNwsStationObservationsForRange(event.stationId, range.start, range.end, 500);
  const features = Array.isArray(data.features) ? (data.features as Record<string, unknown>[]) : [];
  const timezone = getTimezoneForStation(event.stationId);

  return features
    .map((feature) => {
      const timestamp = getObservationTimestamp(feature);
      const tempF = getObservationTemperatureF(feature);
      const local = timestamp ? getLocalParts(timestamp, timezone) : null;
      return { timestamp, tempF, local };
    })
    .filter((reading): reading is { timestamp: string; tempF: number; local: { date: string; hour: number; minute: number } } =>
      Boolean(reading.timestamp && typeof reading.tempF === "number" && reading.local?.date === event.eventDate)
    );
}

async function resolveDailyHigh(event: TrackedWeatherEventDocument & { id?: string }) {
  const readings = await fetchEventDateObservations(event);
  const usable = readings.filter((reading) => Number.isFinite(reading.tempF));

  if (!usable.length) {
    return {
      status: "needs_review" as const,
      actualHighF: null,
      actualTemperatureF: null,
      resolvedBucket: null,
      resolvedBucketCode: null,
      observationCount: readings.length,
      resolverNotes: ["No same-local-date station temperature observations were available from NWS yet."],
    };
  }

  const high = usable.reduce((max, reading) => Math.max(max, reading.tempF), Number.NEGATIVE_INFINITY);
  const roundedHigh = Number(high.toFixed(1));

  return {
    status: "resolved" as const,
    actualHighF: roundedHigh,
    actualTemperatureF: null,
    resolvedBucket: dailyHighBucketFromTemperatureF(roundedHigh),
    resolvedBucketCode: dailyHighBucketCodeFromTemperatureF(roundedHigh),
    observationCount: usable.length,
    resolverNotes: [`Resolved from ${usable.length} NWS station observations for ${event.stationId} on ${event.eventDate}.`],
  };
}

async function resolveHourlyTemperature(event: TrackedWeatherEventDocument & { id?: string }) {
  const readings = await fetchEventDateObservations(event);

  if (typeof event.eventHourLocal !== "number") {
    return {
      status: "needs_review" as const,
      actualHighF: null,
      actualTemperatureF: null,
      resolvedBucket: null,
      resolvedBucketCode: null,
      observationCount: readings.length,
      resolverNotes: ["Hourly event is missing eventHourLocal, so the exact settlement hour could not be resolved automatically."],
    };
  }

  const hourReadings = readings.filter((reading) => reading.local.hour === event.eventHourLocal);

  if (!hourReadings.length) {
    return {
      status: "needs_review" as const,
      actualHighF: null,
      actualTemperatureF: null,
      resolvedBucket: null,
      resolvedBucketCode: null,
      observationCount: readings.length,
      resolverNotes: [`No NWS observations found inside the ${String(event.eventHourLocal).padStart(2, "0")}:00 local settlement hour.`],
    };
  }

  const value = hourReadings.reduce((max, reading) => Math.max(max, reading.tempF), Number.NEGATIVE_INFINITY);
  const rounded = Number(value.toFixed(1));

  return {
    status: "needs_review" as const,
    actualHighF: null,
    actualTemperatureF: rounded,
    resolvedBucket: `${Math.round(rounded)}° observed`,
    resolvedBucketCode: null,
    observationCount: hourReadings.length,
    resolverNotes: [
      `Found ${hourReadings.length} station observations in the target local hour. Hourly Kalshi settlement rules can vary, so this is saved as needs-review rather than fully resolved.`,
    ],
  };
}

function shouldAttemptResolution(event: TrackedWeatherEventDocument & { id?: string }) {
  const today = new Date();
  const eventDate = new Date(`${event.eventDate}T00:00:00Z`);

  if (Number.isNaN(eventDate.getTime())) return false;

  const oneDayAfterEvent = new Date(eventDate);
  oneDayAfterEvent.setUTCDate(oneDayAfterEvent.getUTCDate() + 1);

  return today.getTime() >= oneDayAfterEvent.getTime();
}

export async function resolveTrackedWeatherEvent(uid: string, event: TrackedWeatherEventDocument & { id?: string }) {
  if (!event.id) throw new Error("Tracked weather event is missing an id.");

  if (!shouldAttemptResolution(event)) {
    return {
      id: event.id,
      status: event.status,
      stationId: event.stationId,
      eventDate: event.eventDate,
      eventFamily: event.eventFamily,
      resolvedBucket: event.resolvedBucket,
      actualHighF: event.actualHighF,
      actualTemperatureF: event.actualTemperatureF,
      notes: ["Skipped because the event date has not fully passed yet."],
    };
  }

  try {
    const resolution = event.eventFamily === "hourly_temperature"
      ? await resolveHourlyTemperature(event)
      : await resolveDailyHigh(event);

    await updateTrackedWeatherEventResolution(uid, event.id, {
      status: resolution.status,
      actualHighF: resolution.actualHighF,
      actualTemperatureF: resolution.actualTemperatureF,
      resolvedBucket: resolution.resolvedBucket,
      resolvedBucketCode: resolution.resolvedBucketCode,
      observationCount: resolution.observationCount,
      resolverNotes: resolution.resolverNotes,
      errorMessage: null,
    });

    const updatedEvent: TrackedWeatherEventDocument & { id?: string } = {
      ...event,
      status: resolution.status,
      actualHighF: resolution.actualHighF,
      actualTemperatureF: resolution.actualTemperatureF,
      resolvedBucket: resolution.resolvedBucket,
      resolvedBucketCode: resolution.resolvedBucketCode,
      observationCount: resolution.observationCount,
      resolverNotes: resolution.resolverNotes,
      errorMessage: null,
    };

    const resolvedInput = resolvedResultInputFromTrackedEvent(updatedEvent);
    if (resolvedInput) {
      await saveWeatherResolvedResult(uid, resolvedInput);
    }

    return {
      id: event.id,
      status: resolution.status,
      stationId: event.stationId,
      eventDate: event.eventDate,
      eventFamily: event.eventFamily,
      resolvedBucket: resolution.resolvedBucket,
      actualHighF: resolution.actualHighF,
      actualTemperatureF: resolution.actualTemperatureF,
      notes: resolution.resolverNotes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settlement resolver error";
    await updateTrackedWeatherEventResolution(uid, event.id, {
      status: "error",
      errorMessage: message,
      resolverNotes: [message],
    });

    return {
      id: event.id,
      status: "error" as const,
      stationId: event.stationId,
      eventDate: event.eventDate,
      eventFamily: event.eventFamily,
      resolvedBucket: event.resolvedBucket,
      actualHighF: event.actualHighF,
      actualTemperatureF: event.actualTemperatureF,
      notes: [message],
      errorMessage: message,
    };
  }
}

export async function resolvePendingTrackedWeatherEvents(uid: string, limit = 25): Promise<TrackedWeatherResolveSummary> {
  const events = await listPendingTrackedWeatherEvents({ uid, limit });
  const summary: TrackedWeatherResolveSummary = {
    checked: 0,
    resolved: 0,
    needsReview: 0,
    errors: 0,
    skipped: 0,
    results: [],
  };

  for (const event of events) {
    if (!shouldAttemptResolution(event)) {
      summary.skipped += 1;
      summary.results.push({
        id: event.id ?? "unknown",
        status: event.status,
        stationId: event.stationId,
        eventDate: event.eventDate,
        eventFamily: event.eventFamily,
        resolvedBucket: event.resolvedBucket,
        actualHighF: event.actualHighF,
        actualTemperatureF: event.actualTemperatureF,
        notes: ["Skipped because the event date has not fully passed yet."],
      });
      continue;
    }

    summary.checked += 1;
    const result = await resolveTrackedWeatherEvent(uid, event);
    summary.results.push(result);

    if (result.status === "resolved") summary.resolved += 1;
    else if (result.status === "needs_review") summary.needsReview += 1;
    else if (result.status === "error") summary.errors += 1;
  }

  return summary;
}
