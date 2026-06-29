"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

const dashboardActions = [
  {
    title: "Review positions",
    description:
      "View open Kalshi positions, position exposure, market data, weather context, deterministic review, and AI-assisted analysis.",
    href: "/positions",
    buttonLabel: "Open positions",
    primary: true,
  },
  {
    title: "Scan events",
    description:
      "Search supported Kalshi weather events for potential entries, watchlist candidates, and events where the data does not show a clear edge.",
    href: "/events",
    buttonLabel: "Open event scanner",
    primary: true,
  },
  {
    title: "Manage credentials",
    description:
      "Add or update the Kalshi and OpenAI credentials used for private account access and optional AI review.",
    href: "/settings/credentials",
    buttonLabel: "Open credentials",
    primary: false,
  },
];

const capabilityItems = [
  {
    label: "Kalshi connection",
    value: "Private account access",
    detail:
      "The app uses your saved Kalshi credentials to retrieve account summaries, positions, markets, and event data.",
  },
  {
    label: "Weather analysis",
    value: "NWS + Open-Meteo",
    detail:
      "Weather context is pulled from public forecast and observation sources to support position and event review.",
  },
  {
    label: "Decision support",
    value: "Advisory only",
    detail:
      "The assistant can highlight possible actions, but it does not place trades or automate orders.",
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
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-6 text-white">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <h1 className="text-2xl font-bold">Sign-in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            You need to sign in before viewing your dashboard.
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
      <main className="px-6 py-8">
        <section className="mx-auto max-w-7xl">
          <header className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                  Dashboard
                </p>

                <h1 className="mt-3 text-3xl font-bold md:text-5xl">
                  Kalshi Weather Assistant
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#a8b3ad] md:text-base">
                  Signed in as {user.email}. Review your weather positions,
                  scan supported events, and use advisory-only analysis to
                  support manual trading decisions.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4 lg:w-[320px]">
                <p className="text-sm font-semibold text-white">
                  Trading mode
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  Advisory only. This app does not place trades, submit orders,
                  or automate execution.
                </p>
              </div>
            </div>
          </header>

          <section className="grid gap-4 py-8 md:grid-cols-3">
            {dashboardActions.map((action) => (
              <article
                key={action.title}
                className="flex min-h-[230px] flex-col justify-between rounded-3xl border border-[#1f2a24] bg-[#101714] p-6"
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

          <section className="grid gap-4 md:grid-cols-3">
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
                Start with your current exposure.
              </h2>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <p className="font-semibold text-white">
                    1. Check account status
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    Use the top account bar to confirm Kalshi connection,
                    balance, open position count, exposure, and P/L values when
                    available.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <p className="font-semibold text-white">
                    2. Review active positions
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    Open the position dashboard to inspect each market, weather
                    context, current exit value, and action guidance.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                  <p className="font-semibold text-white">
                    3. Scan for new events
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a8b3ad]">
                    Use the event scanner to review supported daily and hourly
                    weather events before deciding whether any entry is worth
                    considering.
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Important reminder
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                You remain in control.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                The assistant is designed to organize information and provide
                analysis. It is not financial advice, it does not guarantee
                outcomes, and it does not execute trades.
              </p>

              <div className="mt-6 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="font-semibold text-white">Before acting</p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  Confirm the Kalshi market rules, settlement criteria, current
                  order book, weather source reliability, and your own risk
                  tolerance before entering or exiting a position.
                </p>
              </div>
            </aside>
          </section>
        </section>
      </main>
    </AppShell>
  );
}