"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";

export default function DashboardPage() {
  const { user, loading } = useAuth();

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
    <AppShell>
      <main className="px-6 py-8">
        <section className="mx-auto max-w-6xl">
          <header className="border-b border-[#1f2a24] pb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold">Kalshi Assistant Web</h1>
            <p className="mt-2 text-[#a8b3ad]">
              Signed in as {user.email}. Use the top navigation bar to move
              between positions, credentials, and account status.
            </p>
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
              <p className="text-sm text-[#6f7b74]">Credential status</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Encrypted storage
              </h2>
              <p className="mt-3 text-sm text-[#a8b3ad]">
                Kalshi credentials are encrypted in Firestore and only decrypted
                server-side for read-only API requests.
              </p>
              <Link
                href="/settings/credentials"
                className="mt-4 inline-flex rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
              >
                Open credentials
              </Link>
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

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Current milestone
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Open position import
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                The app can now call Kalshi with saved credentials, import open
                positions, and show when no active positions are found.
              </p>
              <Link
                href="/positions"
                className="mt-5 inline-flex rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
              >
                View positions
              </Link>
            </div>

            <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Account summary
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Balance and exposure in the top bar
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                The top navigation bar now centralizes account status, Kalshi
                connection state, balance, open position count, exposure, and
                realized P/L when available.
              </p>
            </div>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Next milestone
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Position review engine
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                Next we can port the deterministic PowerShell position review
                logic into TypeScript so imported positions can be evaluated
                for hold, trim, sell, or roll recommendations.
              </p>
            </div>

            <div className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
                Safety model
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Secrets stay server-side
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
                The browser can check whether credentials exist and view safe
                account summaries, but it should never receive saved keys,
                decrypted secrets, private keys, or encrypted ciphertext.
              </p>
            </div>
          </section>
        </section>
      </main>
    </AppShell>
  );
}