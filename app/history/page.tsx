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
