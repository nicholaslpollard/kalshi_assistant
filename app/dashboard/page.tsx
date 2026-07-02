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
