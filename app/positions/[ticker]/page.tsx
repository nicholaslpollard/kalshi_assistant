"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { PositionDetailClient } from "@/components/positions/PositionDetailClient";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PositionDetailPage() {
  const { user, loading } = useAuth();
  const params = useParams<{ ticker: string }>();

  const ticker =
    typeof params.ticker === "string"
      ? decodeURIComponent(params.ticker)
      : "";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading position detail...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-6 text-white">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <h1 className="text-2xl font-bold">Sign-in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            You need to sign in before viewing position details.
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
          <PositionDetailClient ticker={ticker} />
        </section>
      </main>
    </AppShell>
  );
}