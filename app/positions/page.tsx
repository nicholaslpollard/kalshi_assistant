"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { PositionsClient } from "@/components/positions/PositionsClient";
import Link from "next/link";

export default function PositionsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading positions...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-4 text-white sm:px-6">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
            Positions
          </p>
          <h1 className="mt-2 text-2xl font-bold">Sign in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            Sign in to review open Kalshi weather positions and forecast-based
            decision support.
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
          <PositionsClient />
        </section>
      </main>
    </AppShell>
  );
}
