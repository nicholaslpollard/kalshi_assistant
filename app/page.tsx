const statusItems = [
  {
    label: "Project status",
    value: "Web setup started",
    detail: "Next.js, TypeScript, Tailwind, and Firebase packages are installed.",
  },
  {
    label: "Current build focus",
    value: "App shell",
    detail: "Dark dashboard layout, navigation, and placeholder pages.",
  },
  {
    label: "Trading mode",
    value: "Advisory only",
    detail: "No auto-trading. The app will review positions and provide recommendations.",
  },
];

const roadmapItems = [
  "Firebase sign-in and protected routes",
  "Encrypted Kalshi and OpenAI credential storage",
  "Open-position import from Kalshi",
  "Deterministic position review",
  "AI hold / trim / sell / roll review",
  "Review history and trade journal",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050807] text-[#f4f7f5]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-[#1f2a24] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22c55e]">
              Kalshi Assistant
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              Weather position review, rebuilt for the web.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#a8b3ad]">
              This web version will convert the proven PowerShell logic into a
              browser-based dashboard with Firebase sign-in, encrypted user
              credentials, position tracking, and clear hold / trim / sell /
              roll recommendations.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-5 shadow-2xl shadow-black/30">
            <p className="text-sm text-[#a8b3ad]">Theme</p>
            <p className="mt-1 text-xl font-semibold text-white">
              Dark mode + green accents
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#6f7b74]">
              High-contrast, readable, and designed for fast position review.
            </p>
          </div>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {statusItems.map((item) => (
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

        <section className="grid flex-1 gap-6 pb-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                  First milestone
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Open-position review dashboard
                </h2>
              </div>
              <span className="rounded-full border border-[#22c55e]/40 bg-[#0b2a18] px-3 py-1 text-sm font-semibold text-[#22c55e]">
                Planned
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-5">
              <p className="text-sm text-[#a8b3ad]">
                Target workflow
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-[#1f2a24] p-4">
                  <p className="font-semibold text-white">
                    1. Sign in
                  </p>
                  <p className="mt-1 text-sm text-[#a8b3ad]">
                    Firebase Authentication with email and password.
                  </p>
                </div>
                <div className="rounded-xl border border-[#1f2a24] p-4">
                  <p className="font-semibold text-white">
                    2. Add credentials
                  </p>
                  <p className="mt-1 text-sm text-[#a8b3ad]">
                    Kalshi and OpenAI keys saved per user after server-side encryption.
                  </p>
                </div>
                <div className="rounded-xl border border-[#1f2a24] p-4">
                  <p className="font-semibold text-white">
                    3. Review open positions
                  </p>
                  <p className="mt-1 text-sm text-[#a8b3ad]">
                    Pull positions, compare against updated weather, and show action guidance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Roadmap
            </p>
            <h2 className="mt-2 text-2xl font-bold">Next build steps</h2>
            <ul className="mt-6 space-y-3">
              {roadmapItems.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-[#1f2a24] bg-[#0b120f] p-3 text-sm text-[#a8b3ad]"
                >
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#22c55e]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </section>
    </main>
  );
}