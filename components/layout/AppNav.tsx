"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { firebaseAuth } from "@/lib/firebase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

type AccountSummary = {
  kalshiConnected: boolean;
  balanceDollars: number | null;
  openPositionCount: number | null;
  totalExposureDollars: number | null;
  totalFeesPaidDollars: number | null;
  totalRealizedPnlDollars: number | null;
  message: string;
};

function formatDollars(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString();
}

function SummaryItem({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#1f2a24] bg-[#0b120f] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </p>
      <p
        className={
          positive
            ? "mt-1 text-sm font-semibold text-[#22c55e]"
            : "mt-1 text-sm font-semibold text-[#f4f7f5]"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function AppNav() {
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  async function loadSummary() {
    if (!firebaseAuth.currentUser) {
      return;
    }

    setLoadingSummary(true);

    try {
      const idToken = await firebaseAuth.currentUser.getIdToken();

      const response = await fetch("/api/account/summary", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const body = await response.json();

      if (response.ok) {
        setSummary(body);
      }
    } catch (error) {
      console.error("Failed to load account summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1f2a24] bg-[#050807]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/" className="block">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22c55e]">
                Kalshi Assistant
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                Weather Opportunity Dashboard
              </p>
            </Link>

            <p className="mt-1 text-sm text-[#a8b3ad]">
              {user?.email ? `Signed in as ${user.email}` : "Not signed in"}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              Home
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              Dashboard
            </Link>

            <Link
              href="/positions"
              className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              Positions
            </Link>

            <Link
              href="/settings/credentials"
              className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
            >
              Credentials
            </Link>

            <button
              type="button"
              onClick={() => loadSummary()}
              disabled={loadingSummary}
              className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSummary ? "Refreshing..." : "Refresh"}
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#f4f7f5] transition hover:border-[#ef4444] hover:text-[#fecaca]"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>

        {user ? (
          <div className="grid gap-3 md:grid-cols-5">
            <SummaryItem
              label="Kalshi"
              value={
                summary?.kalshiConnected
                  ? "Connected"
                  : loadingSummary
                    ? "Checking"
                    : "Not connected"
              }
              positive={Boolean(summary?.kalshiConnected)}
            />

            <SummaryItem
              label="Balance"
              value={formatDollars(summary?.balanceDollars ?? null)}
            />

            <SummaryItem
              label="Open positions"
              value={formatNumber(summary?.openPositionCount ?? null)}
            />

            <SummaryItem
              label="Exposure"
              value={formatDollars(summary?.totalExposureDollars ?? null)}
            />

            <SummaryItem
              label="Realized P/L"
              value={formatDollars(summary?.totalRealizedPnlDollars ?? null)}
              positive={
                typeof summary?.totalRealizedPnlDollars === "number" &&
                summary.totalRealizedPnlDollars > 0
              }
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}