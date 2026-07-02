import { AdminToolsClient } from "@/components/admin/AdminToolsClient";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#050807] px-4 py-8 text-[#f4f7f5] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#22c55e]">Data tools</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Keep weather history clean and useful.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#a8b3ad] sm:text-base">
            These tools are for maintenance, export, and automatic settlement checks. They do not place trades or change Kalshi positions.
          </p>
        </div>
        <AdminToolsClient />
      </section>
    </main>
  );
}
