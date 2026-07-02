import Link from "next/link";

const featureCards = [
  {
    title: "Scan weather markets",
    detail: "Prioritize supported Kalshi weather events with forecast evidence, market pricing, and risk context.",
  },
  {
    title: "Review positions",
    detail: "Compare open exposure against live weather observations, forecast buckets, exit math, and AI decision reads.",
  },
  {
    title: "Learn from history",
    detail: "Track snapshots, resolved highs, source bias, and lead-time accuracy as the assistant is used.",
  },
];

const proofPoints = [
  "Manual execution only",
  "Daily high buckets treated as ranges",
  "Lead-time-aware source bias",
  "Official observations prioritized",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050807] text-[#f4f7f5]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-1 flex-col justify-center py-14 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#22c55e]">
              Kalshi Weather Assistant
            </p>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Weather-market evidence without the noise.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#a8b3ad] sm:text-lg">
              Scan supported weather markets, review active positions, compare forecast evidence, and keep trading decisions manual and disciplined.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
              >
                Open dashboard
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center rounded-xl border border-[#25332b] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Scan events
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-transparent px-5 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 pb-10 md:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <h2 className="text-lg font-semibold text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 rounded-3xl border border-[#1f2a24] bg-[#101714] p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {proofPoints.map((point) => (
              <div key={point} className="rounded-2xl border border-[#25332b] bg-[#050807] px-4 py-3 text-sm font-semibold text-[#d7ded9]">
                {point}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
