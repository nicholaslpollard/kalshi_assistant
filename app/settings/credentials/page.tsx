"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { CredentialsForm } from "@/components/settings/CredentialsForm";
import Link from "next/link";

export default function CredentialsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading credentials...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-4 text-white sm:px-6">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
            Credentials
          </p>
          <h1 className="mt-2 text-2xl font-bold">Sign in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            Sign in to manage encrypted Kalshi and OpenAI credentials.
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
        <section className="mx-auto max-w-3xl">
          <div className="mb-6 rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Secure credentials
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Connect data sources privately.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              Save and verify the encrypted credentials used for private Kalshi
              account access and optional AI review. Saved secrets are handled
              server-side and are not displayed back to the browser.
            </p>
          </div>

          <CredentialsForm />
        </section>
      </main>
    </AppShell>
  );
}
