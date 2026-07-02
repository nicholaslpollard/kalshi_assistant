#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "package.json" ] || [ ! -d "app" ]; then
  echo "Run this script from the repo root, beside package.json and app/."
  exit 1
fi

mkdir -p app/dashboard app/events app/history app/login app/positions/'[ticker]' app/register app/settings/credentials

cat > app/page.tsx <<'TSX'
import Link from "next/link";

const featureItems = [
  {
    label: "Position intelligence",
    value: "Understand current exposure",
    detail:
      "Review open Kalshi weather positions with market pricing, exit math, official weather observations, model guidance, and AI-assisted action reads.",
  },
  {
    label: "Opportunity scanner",
    value: "Prioritize weather markets",
    detail:
      "Scan supported daily high-temperature and hourly temperature markets, then sort opportunities by forecast support, market mismatch, risk, and position relevance.",
  },
  {
    label: "Forecast evidence",
    value: "Compare multiple sources",
    detail:
      "Blend NWS observations, NWS forecast guidance, raw gridpoint data, Open-Meteo model evidence, ensemble spread, and station-specific history.",
  },
  {
    label: "AI review",
    value: "Get an independent read",
    detail:
      "Use structured AI analysis to evaluate likely settlement buckets, alternate outcomes, fair-value discipline, and observation triggers.",
  },
  {
    label: "History and bias",
    value: "Learn from resolved markets",
    detail:
      "Save forecast snapshots and final results to identify which sources tend to run warm, cool, or closest at each station.",
  },
  {
    label: "Private workflow",
    value: "Keep execution manual",
    detail:
      "Credentials are encrypted server-side, analysis stays advisory-only, and trading decisions remain fully under user control.",
  },
];

const workflowItems = [
  {
    title: "Connect accounts securely",
    detail:
      "Sign in, save encrypted Kalshi credentials, and optionally add OpenAI credentials for AI-assisted reviews.",
  },
  {
    title: "Review active positions",
    detail:
      "Inspect current holdings, market pricing, sell-vs-hold math, official weather observations, forecast evidence, and decision triggers.",
  },
  {
    title: "Scan supported markets",
    detail:
      "Use the event scanner to surface weather markets with the strongest forecast-supported mismatch and the clearest action path.",
  },
  {
    title: "Track outcomes over time",
    detail:
      "Save forecast snapshots and resolved highs so source bias, station tendencies, and forecast trends become more visible.",
  },
];

const trustItems = [
  {
    title: "Advisory-only by design",
    detail:
      "The assistant does not place trades, submit orders, or automate execution. It organizes evidence and decision support for manual review.",
  },
  {
    title: "Weather-source transparency",
    detail:
      "Reviews are built from visible forecast evidence, official observations, model consensus, bucket probabilities, and risk notes.",
  },
  {
    title: "Kalshi bucket awareness",
    detail:
      "Daily high buckets are interpreted as ranges, such as B93.5 meaning 93° to 94°, while hourly temperature markets use threshold logic.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050807] text-[#f4f7f5]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:py-8">
        <header className="grid gap-8 border-b border-[#1f2a24] pb-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22c55e]">
              Kalshi Weather Assistant
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
              Weather market intelligence for manual Kalshi decisions.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-[#a8b3ad] md:text-lg">
              Review positions, scan weather events, compare market pricing
              against forecast evidence, and use structured AI analysis before
              deciding whether to enter, hold, trim, hedge, or exit.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
              >
                Sign in
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl border border-[#1f2a24] px-5 py-3 text-sm font-semibold text-[#f4f7f5] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Create account
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[#1f2a24] px-5 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Open dashboard
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Analysis platform
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Built for weather-market review.
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              The assistant combines official observations, forecast models,
              Kalshi market data, event history, and AI decision support into a
              focused workflow for supported weather markets.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="text-sm font-semibold text-white">
                  Manual trading only
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  No auto-trading, no order placement, and no execution without
                  user action on Kalshi.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="text-sm font-semibold text-white">
                  Weather-focused scope
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  Designed around supported Kalshi weather markets, including
                  daily high-temperature and hourly temperature events.
                </p>
              </div>
            </div>
          </aside>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {featureItems.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-5"
            >
              <p className="text-sm font-medium text-[#6f7b74]">
                {item.label}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {item.value}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                {item.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="grid flex-1 gap-6 pb-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Workflow
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              From forecast evidence to decision discipline.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#a8b3ad]">
              Each part of the app is designed to keep the important decision
              inputs close together: market price, likely bucket, alternate
              buckets, model agreement, fair-value discipline, and live weather
              risk.
            </p>

            <div className="mt-6 grid gap-3">
              {workflowItems.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4"
                >
                  <p className="font-semibold text-white">
                    {index + 1}. {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Responsible use
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Analysis is not a guarantee.
            </h2>

            <div className="mt-6 space-y-3">
              {trustItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4"
                >
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
TSX

cat > app/dashboard/page.tsx <<'TSX'
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

const dashboardActions = [
  {
    title: "Review positions",
    description:
      "Analyze open Kalshi weather positions with live market data, settlement-aware bucket reads, official observations, model evidence, and AI-assisted action guidance.",
    href: "/positions",
    buttonLabel: "Open positions",
    primary: true,
  },
  {
    title: "Scan events",
    description:
      "Rank supported weather markets by opportunity quality, model agreement, forecast edge, price discipline, and position relevance.",
    href: "/events",
    buttonLabel: "Open event scanner",
    primary: true,
  },
  {
    title: "Review history",
    description:
      "Track forecast snapshots, resolved results, station bias, model accuracy, settlement buckets, and forecast trends over time.",
    href: "/history",
    buttonLabel: "Open history",
    primary: true,
  },
  {
    title: "Manage credentials",
    description:
      "Save, test, and manage encrypted Kalshi and OpenAI credentials used for private account access and optional AI reviews.",
    href: "/settings/credentials",
    buttonLabel: "Open credentials",
    primary: false,
  },
];

const capabilityItems = [
  {
    label: "Market data",
    value: "Kalshi account and event context",
    detail:
      "Retrieve account summaries, positions, supported events, market prices, and matching-position context for weather-market review.",
  },
  {
    label: "Forecast evidence",
    value: "NWS + Open-Meteo + ensembles",
    detail:
      "Use official observations, NWS forecasts and gridpoint data, Open-Meteo model guidance, ensemble spread, and peak-heating context.",
  },
  {
    label: "Decision support",
    value: "Manual and advisory only",
    detail:
      "Generate structured reads, bucket probabilities, fair-value notes, observation triggers, and risk scenarios without placing trades.",
  },
  {
    label: "Learning loop",
    value: "History and model bias",
    detail:
      "Save snapshots and final results to identify which sources run warm, cool, or closest for each station and event type.",
  },
];

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading dashboard...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-4 text-white sm:px-6">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            Sign in to access the weather-market dashboard.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-4 py-3 font-semibold text-[#041008]"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AppShell>
      <main className="px-4 py-6 sm:px-6 lg:py-8">
        <section className="mx-auto max-w-7xl">
          <header className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                  Dashboard
                </p>

                <h1 className="mt-3 text-3xl font-bold md:text-5xl">
                  Weather-market command center
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#a8b3ad] md:text-base">
                  Signed in as {user.email}. Review exposure, scan supported
                  weather markets, evaluate forecast evidence, and track model
                  accuracy from one private workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 lg:w-[340px]">
                <p className="text-sm font-semibold text-white">
                  Advisory-only workflow
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  The assistant organizes evidence and decision support. It
                  does not place trades, submit orders, or automate execution.
                </p>
              </div>
            </div>
          </header>

          <section className="grid gap-4 py-8 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardActions.map((action) => (
              <article
                key={action.title}
                className="flex min-h-[240px] flex-col justify-between rounded-3xl border border-[#1f2a24] bg-[#101714] p-6"
              >
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {action.title}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                    {action.description}
                  </p>
                </div>

                <Link
                  href={action.href}
                  className={
                    action.primary
                      ? "mt-6 inline-flex items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
                      : "mt-6 inline-flex items-center justify-center rounded-xl border border-[#1f2a24] px-5 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                  }
                >
                  {action.buttonLabel}
                </Link>
              </article>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {capabilityItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-5"
              >
                <p className="text-sm text-[#6f7b74]">{item.label}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {item.value}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                  {item.detail}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Recommended workflow
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Start with exposure, then evaluate new opportunities.
              </h2>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <p className="font-semibold text-white">
                    1. Review current positions
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    Confirm what is already held, whether the active bucket is
                    still supported, and what observation would change the read.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <p className="font-semibold text-white">
                    2. Scan for market mismatch
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    Use the scanner rankings to find forecast-supported baskets,
                    watchlist candidates, and markets with too much disagreement.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <p className="font-semibold text-white">
                    3. Track outcomes
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    Save resolved highs so future reviews can account for local
                    source bias and station-specific model behavior.
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Risk reminder
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Forecast evidence is probabilistic.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                Weather outcomes can shift quickly because of clouds, wind,
                storm outflow, late observations, station behavior, and market
                liquidity. Use the assistant as a structured review tool, not a
                guarantee.
              </p>

              <div className="mt-6 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="font-semibold text-white">Before acting</p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  Confirm Kalshi settlement rules, the current order book,
                  official station observations, forecast updates, and personal
                  risk limits before entering or exiting a position.
                </p>
              </div>
            </aside>
          </section>
        </section>
      </main>
    </AppShell>
  );
}
TSX

cat > app/events/page.tsx <<'TSX'
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { EventScannerClient } from "@/components/events/EventScannerClient";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

export default function EventsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <main className="px-4 py-6 sm:px-6 lg:py-8">
          <section className="mx-auto max-w-7xl rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            Loading event scanner...
          </section>
        </main>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <main className="px-4 py-6 sm:px-6 lg:py-8">
          <section className="mx-auto max-w-7xl rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Event scanner
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              Sign in required
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a8b3ad]">
              Sign in to scan supported Kalshi weather markets, rank opportunity
              quality, and review forecast-supported candidate buckets.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
            >
              Sign in
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="px-4 py-6 sm:px-6 lg:py-8">
        <section className="mx-auto max-w-7xl">
          <EventScannerClient />
        </section>
      </main>
    </AppShell>
  );
}
TSX

cat > app/history/page.tsx <<'TSX'
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { WeatherHistoryClient } from "@/components/history/WeatherHistoryClient";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

export default function WeatherHistoryPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <main className="px-4 py-6 sm:px-6 lg:py-8">
          <section className="mx-auto max-w-7xl rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            Loading weather history...
          </section>
        </main>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell>
        <main className="px-4 py-6 sm:px-6 lg:py-8">
          <section className="mx-auto max-w-7xl rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Weather history
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              Sign in required
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a8b3ad]">
              Sign in to review saved forecast snapshots, resolved weather
              results, station bias, source accuracy, and forecast trend charts.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
            >
              Sign in
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="px-4 py-6 sm:px-6 lg:py-8">
        <section className="mx-auto max-w-7xl">
          <WeatherHistoryClient />
        </section>
      </main>
    </AppShell>
  );
}
TSX

cat > app/positions/page.tsx <<'TSX'
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { PositionsClient } from "@/components/positions/PositionsClient";
import Link from "next/link";

export default function PositionsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading positions...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-4 text-white sm:px-6">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
            Positions
          </p>
          <h1 className="mt-2 text-2xl font-bold">Sign in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            Sign in to review open Kalshi weather positions and forecast-based
            decision support.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-4 py-3 font-semibold text-[#041008]"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AppShell>
      <main className="px-4 py-6 sm:px-6 lg:py-8">
        <section className="mx-auto max-w-7xl">
          <PositionsClient />
        </section>
      </main>
    </AppShell>
  );
}
TSX

cat > app/positions/'[ticker]'/page.tsx <<'TSX'
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { PositionDetailClient } from "@/components/positions/PositionDetailClient";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PositionDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams<{ ticker: string }>();

  const ticker =
    typeof params.ticker === "string"
      ? decodeURIComponent(params.ticker)
      : "";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading position detail...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-4 text-white sm:px-6">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
            Position detail
          </p>
          <h1 className="mt-2 text-2xl font-bold">Sign in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            Sign in to view position-level weather evidence, bucket analysis,
            and AI decision support.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-4 py-3 font-semibold text-[#041008]"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AppShell>
      <main className="px-4 py-6 sm:px-6 lg:py-8">
        <section className="mx-auto max-w-7xl">
          <PositionDetailClient ticker={ticker} />
        </section>
      </main>
    </AppShell>
  );
}
TSX

cat > app/settings/credentials/page.tsx <<'TSX'
"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { CredentialsForm } from "@/components/settings/CredentialsForm";
import Link from "next/link";

export default function CredentialsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading credentials...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-4 text-white sm:px-6">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
            Credentials
          </p>
          <h1 className="mt-2 text-2xl font-bold">Sign in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            Sign in to manage encrypted Kalshi and OpenAI credentials.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-4 py-3 font-semibold text-[#041008]"
          >
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <AppShell>
      <main className="px-4 py-6 sm:px-6 lg:py-8">
        <section className="mx-auto max-w-3xl">
          <div className="mb-6 rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Secure credentials
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Connect data sources privately.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              Save and verify the encrypted credentials used for private Kalshi
              account access and optional AI review. Saved secrets are handled
              server-side and are not displayed back to the browser.
            </p>
          </div>

          <CredentialsForm />
        </section>
      </main>
    </AppShell>
  );
}
TSX

cat > app/login/page.tsx <<'TSX'
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return <LoginForm />;
}
TSX

cat > app/register/page.tsx <<'TSX'
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return <RegisterForm />;
}
TSX

echo "Customer-facing page copy update applied. Run: npm run build"
