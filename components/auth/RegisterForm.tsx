"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Unable to create account. Try a stronger password or another email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050807] px-6 text-[#f4f7f5]">
      <section className="w-full max-w-md rounded-3xl border border-[#1f2a24] bg-[#101714] p-6 shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
          Kalshi Assistant
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-[#a8b3ad]">
          Create your private Kalshi Assistant dashboard.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-4 py-3 text-white outline-none transition focus:border-[#22c55e]"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-4 py-3 text-white outline-none transition focus:border-[#22c55e]"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <span className="mt-2 block text-xs text-[#6f7b74]">
              Use at least 8 characters.
            </span>
          </label>

          {error ? (
            <p className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#22c55e] px-4 py-3 font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#a8b3ad]">
          Already have an account?{" "}
          <Link className="font-semibold text-[#22c55e]" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}