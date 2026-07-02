import Link from "next/link";

const actions = [
  {
    href: "/positions",
    title: "Review positions",
    detail: "Check current exposure, market pricing, weather evidence, and sell-vs-hold context.",
  },
  {
    href: "/events",
    title: "Scan events",
    detail: "Rank supported weather markets by forecast edge, price discipline, risk, and bias history.",
  },
  {
    href: "/history",
    title: "Open history",
    detail: "Review forecast snapshots, resolved results, trends, and lead-time source bias.",
  },
  {
    href: "/admin",
    title: "Data tools",
    detail: "Export history, run pending settlement resolution, and review tracking counts.",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-4 py-8 text-[#f4f7f5] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22c55e]">Dashboard</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Choose the next review.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad] sm:text-base">
            The assistant keeps analysis separated into a few focused workflows: positions, event scanning, historical learning, and data upkeep.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 transition hover:border-[#22c55e] hover:bg-[#132019]"
            >
              <h2 className="text-xl font-semibold text-white group-hover:text-[#22c55e]">{action.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">{action.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
