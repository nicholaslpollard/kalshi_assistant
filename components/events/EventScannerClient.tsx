"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import { useEffect, useMemo, useState } from "react";

type EventScannerSignal =
  | "POTENTIAL_ENTRY"
  | "WATCH_CLOSELY"
  | "NO_CLEAR_EDGE"
  | "INSUFFICIENT_DATA";

type EventScannerScope =
  | "today_tomorrow"
  | "today"
  | "tomorrow"
  | "all";

type EventScannerMarket = {
  ticker: string;
  label: string;
  yesBid: number | null;
  yesAskEstimate: number | null;
  noBid: number | null;
  impliedProbability: number | null;
  volume: number | null;
  openInterest: number | null;
  status: string | null;
};

type EventScannerMatchingPosition = {
  ticker: string;
  side: "yes" | "no" | "flat" | "unknown";
  contractCount: number | null;
  positionFp: number | null;
};

type EventScannerResult = {
  eventTicker: string;
  seriesTicker: string;
  marketCode: string | null;
  locationName: string | null;
  eventDate: string | null;
  title: string;
  signal: EventScannerSignal;
  score: number;
  summary: string;
  reasons: string[];
  risks: string[];
  marketFavorite: EventScannerMarket | null;
  weatherFavorite: EventScannerMarket | null;
  markets: EventScannerMarket[];
  weather: {
    heldOrFavoriteBucket: string | null;
    nwsBucket: string | null;
    openMeteoBucket: string | null;
    nwsTemperatureF: number | null;
    openMeteoTemperatureF: number | null;
    weatherAgreement: boolean;
  };
  matchingPosition: EventScannerMatchingPosition | null;
};

type EventScannerResponse = {
  ok: boolean;
  generatedAt: string;
  scope: EventScannerScope;
  today: string;
  tomorrow: string;
  results: EventScannerResult[];
  diagnostics: {
    scannedSeries: string[];
    eventCount: number;
    resultCount: number;
    filteredOutByScope: number;
    matchingPositionCount: number;
    errors: string[];
  };
};

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, digits = 0) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatTemp(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}°F`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function scopeLabel(scope: EventScannerScope) {
  switch (scope) {
    case "today_tomorrow":
      return "Today + tomorrow";
    case "today":
      return "Today";
    case "tomorrow":
      return "Tomorrow";
    case "all":
      return "All open";
    default:
      return scope;
  }
}

function signalLabel(signal: EventScannerSignal) {
  switch (signal) {
    case "POTENTIAL_ENTRY":
      return "Potential entry";
    case "WATCH_CLOSELY":
      return "Watch closely";
    case "NO_CLEAR_EDGE":
      return "No clear edge";
    case "INSUFFICIENT_DATA":
      return "Insufficient data";
    default:
      return signal;
  }
}

function signalClass(signal: EventScannerSignal) {
  switch (signal) {
    case "POTENTIAL_ENTRY":
      return "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#bbf7d0]";
    case "WATCH_CLOSELY":
      return "border-[#facc15]/40 bg-[#facc15]/10 text-[#fde68a]";
    case "NO_CLEAR_EDGE":
      return "border-[#1f2a24] bg-[#0b120f] text-[#a8b3ad]";
    case "INSUFFICIENT_DATA":
      return "border-[#64748b]/40 bg-[#64748b]/10 text-[#cbd5e1]";
    default:
      return "border-[#1f2a24] bg-[#0b120f] text-[#a8b3ad]";
  }
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ScopeButton({
  value,
  label,
  activeScope,
  onClick,
}: {
  value: EventScannerScope;
  label: string;
  activeScope: EventScannerScope;
  onClick: (value: EventScannerScope) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={
        activeScope === value
          ? "rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008]"
          : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
      }
    >
      {label}
    </button>
  );
}

function MarketTable({ markets }: { markets: EventScannerMarket[] }) {
  if (markets.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5 text-sm text-[#a8b3ad]">
        No basket markets returned.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f2a24] bg-[#0b120f]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-[#a8b3ad]">
            <tr>
              <th className="border-b border-[#1f2a24] px-4 py-3">Basket</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">YES bid</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                YES ask est.
              </th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                Implied %
              </th>
              <th className="border-b border-[#1f2a24] px-4 py-3">NO bid</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">Volume</th>
              <th className="border-b border-[#1f2a24] px-4 py-3">
                Open interest
              </th>
              <th className="border-b border-[#1f2a24] px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr key={market.ticker} className="border-b border-[#1f2a24]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{market.label}</p>
                  <p className="mt-1 font-mono text-xs text-[#6f7b74]">
                    {market.ticker}
                  </p>
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.yesBid)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.yesAskEstimate)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPercent(market.impliedProbability)}
                </td>
                <td className="px-4 py-3 text-white">
                  {formatPrice(market.noBid)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {formatNumber(market.volume)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {formatNumber(market.openInterest)}
                </td>
                <td className="px-4 py-3 text-[#a8b3ad]">
                  {market.status ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchingPositionPanel({
  matchingPosition,
}: {
  matchingPosition: EventScannerMatchingPosition;
}) {
  return (
    <div className="rounded-2xl border border-[#38bdf8]/30 bg-[#38bdf8]/10 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#7dd3fc]">
            Matching open position
          </p>
          <h3 className="mt-2 break-all font-mono text-sm font-semibold text-white">
            {matchingPosition.ticker}
          </h3>
          <p className="mt-2 text-sm text-[#bae6fd]">
            Side: {matchingPosition.side.toUpperCase()} · Contracts:{" "}
            {formatNumber(matchingPosition.contractCount, 2)}
          </p>
        </div>

        <a
          href={`/positions/${encodeURIComponent(matchingPosition.ticker)}`}
          className="rounded-xl bg-[#38bdf8] px-5 py-3 text-sm font-semibold text-[#021018] transition hover:bg-[#0ea5e9]"
        >
          View position
        </a>
      </div>
    </div>
  );
}

function EventCard({
  event,
  expanded,
  onToggle,
}: {
  event: EventScannerResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[#1f2a24] bg-[#101714]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${signalClass(
                  event.signal
                )}`}
              >
                {signalLabel(event.signal)}
              </span>

              <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a8b3ad]">
                Score {event.score}
              </span>

              <span className="rounded-full border border-[#1f2a24] bg-[#0b120f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a8b3ad]">
                {event.seriesTicker}
              </span>

              {event.matchingPosition ? (
                <span className="rounded-full border border-[#38bdf8]/40 bg-[#38bdf8]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#bae6fd]">
                  You hold {event.matchingPosition.side.toUpperCase()}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 break-words text-2xl font-bold text-white">
              {event.locationName ?? event.marketCode ?? "Unknown location"}{" "}
              {event.eventDate ? `· ${event.eventDate}` : ""}
            </h2>

            <p className="mt-2 break-all font-mono text-xs text-[#6f7b74]">
              {event.eventTicker}
            </p>

            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              {event.summary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <MiniStat
              label="Market favorite"
              value={event.marketFavorite?.label ?? "—"}
            />
            <MiniStat
              label="Weather basket"
              value={event.weatherFavorite?.label ?? "—"}
            />
            <MiniStat
              label="NWS bucket"
              value={event.weather.nwsBucket ?? "—"}
            />
            <MiniStat
              label="Open-Meteo bucket"
              value={event.weather.openMeteoBucket ?? "—"}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#1f2a24] pt-4 text-sm text-[#a8b3ad]">
          <span>
            {expanded ? "Hide details" : "Show details"} · {event.markets.length}{" "}
            baskets
          </span>
          <span className="text-lg text-[#22c55e]">{expanded ? "−" : "+"}</span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-5 border-t border-[#1f2a24] p-5">
          {event.matchingPosition ? (
            <MatchingPositionPanel matchingPosition={event.matchingPosition} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="Market favorite implied"
              value={formatPercent(event.marketFavorite?.impliedProbability ?? null)}
            />
            <MiniStat
              label="Weather favorite ask"
              value={formatPrice(event.weatherFavorite?.yesAskEstimate ?? null)}
            />
            <MiniStat
              label="NWS temp"
              value={formatTemp(event.weather.nwsTemperatureF)}
            />
            <MiniStat
              label="Open-Meteo temp"
              value={formatTemp(event.weather.openMeteoTemperatureF)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <h3 className="font-semibold text-white">Reasons</h3>
              {event.reasons.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
                  {event.reasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#a8b3ad]">
                  No reasons returned.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <h3 className="font-semibold text-white">Risks</h3>
              {event.risks.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#a8b3ad]">
                  {event.risks.map((risk) => (
                    <li key={risk}>• {risk}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#a8b3ad]">
                  No risk flags returned.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-white">Event basket table</h3>
            <MarketTable markets={event.markets} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function EventScannerClient() {
  const [data, setData] = useState<EventScannerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedTickers, setExpandedTickers] = useState<Record<string, boolean>>(
    {}
  );
  const [signalFilter, setSignalFilter] = useState<"ALL" | EventScannerSignal>(
    "ALL"
  );
  const [scope, setScope] = useState<EventScannerScope>("today_tomorrow");

  async function loadScanner(activeScope = scope) {
    setLoading(true);
    setError("");

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in.");
      }

      const idToken = await user.getIdToken();

      const response = await fetch(`/api/events/scanner?scope=${activeScope}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to load Event Scanner.");
      }

      setData(body);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error ? err.message : "Unable to load Event Scanner.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScanner(scope);
  }, [scope]);

  const filteredResults = useMemo(() => {
    const results = data?.results ?? [];

    if (signalFilter === "ALL") {
      return results;
    }

    return results.filter((result) => result.signal === signalFilter);
  }, [data, signalFilter]);

  const counts = useMemo(() => {
    const results = data?.results ?? [];

    return {
      all: results.length,
      potentialEntry: results.filter((item) => item.signal === "POTENTIAL_ENTRY")
        .length,
      watchClosely: results.filter((item) => item.signal === "WATCH_CLOSELY")
        .length,
      noClearEdge: results.filter((item) => item.signal === "NO_CLEAR_EDGE")
        .length,
      insufficientData: results.filter(
        (item) => item.signal === "INSUFFICIENT_DATA"
      ).length,
      heldMatches: results.filter((item) => item.matchingPosition !== null).length,
    };
  }, [data]);

  function toggleExpanded(eventTicker: string) {
    setExpandedTickers((current) => ({
      ...current,
      [eventTicker]: !current[eventTicker],
    }));
  }

  function expandTopCandidates() {
    const next: Record<string, boolean> = {};

    for (const result of filteredResults.slice(0, 5)) {
      next[result.eventTicker] = true;
    }

    setExpandedTickers(next);
  }

  function collapseAll() {
    setExpandedTickers({});
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Event Scanner
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Weather event scanner
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-[#a8b3ad]">
              Scans active Kalshi high-temperature events and compares basket
              pricing against NWS and Open-Meteo forecast buckets. This is
              advisory-only and does not place trades.
            </p>
            <p className="mt-3 text-sm text-[#6f7b74]">
              Scope: {scopeLabel(scope)}
              {data ? ` · API returned ${scopeLabel(data.scope)}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadScanner(scope)}
            disabled={loading}
            className="rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Scanning..." : "Refresh scanner"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-3xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-6 text-sm text-[#fecaca]">
          {error}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Scanned events" value={formatNumber(counts.all)} />
        <MiniStat
          label="Potential entries"
          value={formatNumber(counts.potentialEntry)}
        />
        <MiniStat label="Watch closely" value={formatNumber(counts.watchClosely)} />
        <MiniStat label="No clear edge" value={formatNumber(counts.noClearEdge)} />
        <MiniStat label="Held matches" value={formatNumber(counts.heldMatches)} />
        <MiniStat
          label="Generated"
          value={data ? formatDateTime(data.generatedAt) : loading ? "Scanning" : "—"}
        />
      </section>

      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
              Scan scope
            </p>
            <div className="flex flex-wrap gap-2">
              <ScopeButton
                value="today_tomorrow"
                label="Today + tomorrow"
                activeScope={scope}
                onClick={setScope}
              />
              <ScopeButton
                value="today"
                label="Today"
                activeScope={scope}
                onClick={setScope}
              />
              <ScopeButton
                value="tomorrow"
                label="Tomorrow"
                activeScope={scope}
                onClick={setScope}
              />
              <ScopeButton
                value="all"
                label="All open"
                activeScope={scope}
                onClick={setScope}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#6f7b74]">
                Signal filter
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ALL", `All (${counts.all})`],
                    ["POTENTIAL_ENTRY", `Potential (${counts.potentialEntry})`],
                    ["WATCH_CLOSELY", `Watch (${counts.watchClosely})`],
                    ["NO_CLEAR_EDGE", `No edge (${counts.noClearEdge})`],
                    [
                      "INSUFFICIENT_DATA",
                      `Insufficient (${counts.insufficientData})`,
                    ],
                  ] as Array<["ALL" | EventScannerSignal, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSignalFilter(value)}
                    className={
                      signalFilter === value
                        ? "rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008]"
                        : "rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={expandTopCandidates}
                className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Expand top 5
              </button>

              <button
                type="button"
                onClick={collapseAll}
                className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Collapse all
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading && !data ? (
        <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-sm text-[#a8b3ad]">
          Scanning Kalshi weather events...
        </section>
      ) : null}

      {!loading && data && filteredResults.length === 0 ? (
        <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-sm text-[#a8b3ad]">
          No events matched the current filter.
        </section>
      ) : null}

      <section className="space-y-4">
        {filteredResults.map((event) => (
          <EventCard
            key={event.eventTicker}
            event={event}
            expanded={Boolean(expandedTickers[event.eventTicker])}
            onToggle={() => toggleExpanded(event.eventTicker)}
          />
        ))}
      </section>

      {data?.diagnostics.errors.length ? (
        <section className="rounded-3xl border border-[#facc15]/30 bg-[#facc15]/10 p-6">
          <h2 className="font-semibold text-[#fde68a]">Scanner diagnostics</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#fde68a]">
            {data.diagnostics.errors.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
