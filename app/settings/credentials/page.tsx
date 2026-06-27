"use client";

import { CredentialsForm } from "@/components/settings/CredentialsForm";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";

export default function CredentialsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] text-white">
        Loading credentials page...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050807] px-6 text-white">
        <section className="max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 text-center">
          <h1 className="text-2xl font-bold">Sign-in required</h1>
          <p className="mt-3 text-[#a8b3ad]">
            You need to sign in before saving credentials.
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
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold">API Credentials</h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-[#1f2a24] px-4 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
          >
            Dashboard
          </Link>
        </div>

        <CredentialsForm />
      </section>
    </main>
  );
}