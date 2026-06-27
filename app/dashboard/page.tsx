"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading dashboard...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-6 text-white">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <h1 className="text-2xl font-bold">Sign-in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            You need to sign in before viewing your dashboard.
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
    <main className="min-h-screen bg-[#050807] px-6 py-8 text-[#f4f7f5]">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#1f2a24] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold">Kalshi Assistant Web</h1>
            <p className="mt-2 text-[#a8b3ad]">Signed in as {user.email}</p>
          </div>

          <button
            onClick={() => logout()}
            className="rounded-xl border border-[#1f2a24] px-4 py-3 text-sm font-semibold text-[#f4f7f5] transition hover:border-[#22c55e] hover:text-[#22c55e]"
          >
            Sign out
          </button>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-5">
            <p className="text-sm text-[#6f7b74]">Auth status</p>
            <h2 className="mt-2 text-xl font-semibold text-[#22c55e]">
              Connected
            </h2>
            <p className="mt-3 text-sm text-[#a8b3ad]">
              Firebase email/password sign-in is working.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-5">
            <p className="text-sm text-[#6f7b74]">Next step</p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Credentials
            </h2>
            <p className="mt-3 text-sm text-[#a8b3ad]">
              Add encrypted Kalshi and OpenAI key storage.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f2a24] bg-[#101714] p-5">
            <p className="text-sm text-[#6f7b74]">Trading mode</p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Advisory only
            </h2>
            <p className="mt-3 text-sm text-[#a8b3ad]">
              No auto-trading. Position review and decision support only.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}