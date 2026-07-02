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
