import Link from "next/link";

const featureItems = [
  {
    label: "Position review",
    value: "Review active Kalshi positions",
    detail:
      "See open weather positions, market pricing, weather context, and advisory action guidance in one place.",
  },
  {
    label: "Event scanner",
    value: "Find weather opportunities",
    detail:
      "Scan daily high-temperature and hourly temperature events using Kalshi pricing, NWS data, and Open-Meteo forecasts.",
  },
  {
    label: "AI decision support",
    value: "Independent review",
    detail:
      "Run per-event or per-position AI reviews to compare market pricing against current weather data before making a manual decision.",
  },
];

const workflowItems = [
  {
    title: "Connect securely",
    detail:
      "Sign in, save your Kalshi and OpenAI credentials, and keep sensitive keys encrypted server-side.",
  },
  {
    title: "Review positions",
    detail:
      "Import your open Kalshi positions and review exposure, exit value, market data, and weather-based context.",
  },
  {
    title: "Scan events",
    detail:
      "Search supported weather markets for potential entries, watchlist candidates, and events with no clear edge.",
  },
  {
    title: "Decide manually",
    detail:
      "Use the assistant’s analysis as decision support. The app does not place trades or auto-execute orders.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050807] text-[#f4f7f5]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="flex flex-col gap-8 border-b border-[#1f2a24] pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22c55e]">
              Kalshi Weather Assistant
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">
              Weather market analysis for better manual decisions.
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-[#a8b3ad] md:text-lg">
              Review Kalshi weather positions, scan supported weather events,
              compare market pricing against live weather data, and get
              advisory-only decision support before entering, holding, trimming,
              or exiting a position.
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

          <aside className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 shadow-2xl shadow-black/30 lg:w-[360px]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Trading mode
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              Advisory only
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              This assistant does not place trades, submit orders, or automate
              execution. It provides analysis so you can make your own manual
              trading decisions.
            </p>

            <div className="mt-5 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
              <p className="text-sm font-semibold text-white">
                Supported focus
              </p>
              <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                Kalshi weather markets, open position review, event scanning,
                and AI-assisted analysis.
              </p>
            </div>
          </aside>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3">
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
              How it works
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              A focused workflow for weather event trading.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#a8b3ad]">
              The assistant is designed to keep the main decision points close
              together: your current exposure, the live Kalshi market, relevant
              weather data, deterministic signals, and optional AI review.
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
              Key protections
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Built for private analysis.
            </h2>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="font-semibold text-white">
                  Credentials stay protected
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  Saved Kalshi and OpenAI credentials are encrypted and only
                  used server-side for authorized requests.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="font-semibold text-white">
                  Manual execution only
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  The assistant provides recommendations and analysis, but you
                  remain responsible for any trading action taken on Kalshi.
                </p>
              </div>

              <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
                <p className="font-semibold text-white">
                  Weather-focused scope
                </p>
                <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
                  The current app is focused on supported Kalshi weather events,
                  including daily high-temperature and NYC hourly temperature
                  markets.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}