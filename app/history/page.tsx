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
            Loading...
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
            <h1 className="text-2xl font-bold text-white">Sign in required</h1>
            <p className="mt-3 text-[#a8b3ad]">
              You need to sign in before viewing weather history and model bias.
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
