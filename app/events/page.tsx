"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { EventScannerClient } from "@/components/events/EventScannerClient";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

export default function EventsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <main className="px-6 py-8">
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
        <main className="px-6 py-8">
          <section className="mx-auto max-w-7xl rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <h1 className="text-2xl font-bold text-white">Sign in required</h1>
            <p className="mt-3 text-[#a8b3ad]">
              You need to sign in before using the Event Scanner.
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
      <main className="px-6 py-8">
        <section className="mx-auto max-w-7xl">
          <EventScannerClient />
        </section>
      </main>
    </AppShell>
  );
}