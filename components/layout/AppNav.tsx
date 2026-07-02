"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { firebaseAuth } from "@/lib/firebase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/positions", label: "Positions" },
  { href: "/events", label: "Event Scanner" },
  { href: "/history", label: "History" },
  { href: "/admin", label: "Data Tools" },
  { href: "/settings/credentials", label: "Credentials" },
];

type AccountSummary = {
  kalshiConnected: boolean;
  balanceDollars: number | null;
  openPositionCount: number | null;
  totalExposureDollars: number | null;
  totalFeesPaidDollars: number | null;
  totalRealizedPnlDollars: number | null;
  totalCurrentExitValueDollars: number | null;
  totalUnrealizedPnlBeforeFeesDollars: number | null;
  totalUnrealizedPnlAfterFeesDollars: number | null;
  totalPnlDollars: number | null;
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

function getPnlClass(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "mt-1 text-sm font-semibold text-[#f4f7f5]";
  }

  if (value > 0) {
    return "mt-1 text-sm font-semibold text-[#22c55e]";
  }

  if (value < 0) {
    return "mt-1 text-sm font-semibold text-[#fecaca]";
  }

  return "mt-1 text-sm font-semibold text-[#f4f7f5]";
}

function SummaryItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1f2a24] bg-[#0b120f] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6f7b74]">
        {label}
      </p>
      <p className={valueClassName ?? "mt-1 text-sm font-semibold text-[#f4f7f5]"}>
        {value}
      </p>
    </div>
  );
}

function AccountSummaryGrid({
  summary,
  loadingSummary,
  compact = false,
}: {
  summary: AccountSummary | null;
  loadingSummary: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-3 md:grid-cols-4 xl:grid-cols-7"}>
      <SummaryItem
        label="Kalshi"
        value={
          summary?.kalshiConnected
            ? "Connected"
            : loadingSummary
              ? "Checking"
              : "Not connected"
        }
        valueClassName={
          summary?.kalshiConnected
            ? "mt-1 text-sm font-semibold text-[#22c55e]"
            : "mt-1 text-sm font-semibold text-[#f4f7f5]"
        }
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
        label="Exit value"
        value={formatDollars(summary?.totalCurrentExitValueDollars ?? null)}
      />

      <SummaryItem
        label="Unrealized P/L"
        value={formatDollars(summary?.totalUnrealizedPnlAfterFeesDollars ?? null)}
        valueClassName={getPnlClass(summary?.totalUnrealizedPnlAfterFeesDollars ?? null)}
      />

      <SummaryItem
        label="Total P/L"
        value={formatDollars(summary?.totalPnlDollars ?? null)}
        valueClassName={getPnlClass(summary?.totalPnlDollars ?? null)}
      />
    </div>
  );
}

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
    >
      {children}
    </Link>
  );
}

export function AppNav() {
  const { user, logout } = useAuth();

  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

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

  async function handleLogout() {
    setMobileMenuOpen(false);
    setMobileSummaryOpen(false);
    await logout();
  }

  function closeMobilePanels() {
    setMobileMenuOpen(false);
    setMobileSummaryOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#1f2a24] bg-[#050807]/95 backdrop-blur">
      <div className="mx-auto hidden max-w-7xl flex-col gap-4 px-6 py-4 lg:flex">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/" className="block">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22c55e]">
                Kalshi Assistant
              </p>
              <p className="mt-1 text-xl font-bold text-white">
                Weather Event Dashboard
              </p>
            </Link>

            <p className="mt-1 text-sm text-[#a8b3ad]">
              {user?.email ? `Signed in as ${user.email}` : "Not signed in"}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}

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
                onClick={() => handleLogout()}
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
          <AccountSummaryGrid summary={summary} loadingSummary={loadingSummary} />
        ) : null}
      </div>

      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" onClick={closeMobilePanels} className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#22c55e]">
              Kalshi Assistant
            </p>
            <p className="mt-0.5 truncate text-base font-bold text-white">
              Weather Dashboard
            </p>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-app-navigation"
            className="rounded-xl border border-[#1f2a24] px-3 py-2 text-sm font-semibold text-[#f4f7f5] transition hover:border-[#22c55e] hover:text-[#22c55e]"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div id="mobile-app-navigation" className="mt-3 space-y-3 border-t border-[#1f2a24] pt-3">
            <p className="truncate text-xs text-[#a8b3ad]">
              {user?.email ? `Signed in as ${user.email}` : "Not signed in"}
            </p>

            <nav className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.href} href={link.href} onClick={closeMobilePanels}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loadSummary()}
                disabled={loadingSummary || !user}
                className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSummary ? "Refreshing..." : "Refresh"}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => handleLogout()}
                  className="rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#f4f7f5] transition hover:border-[#ef4444] hover:text-[#fecaca]"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={closeMobilePanels}
                  className="rounded-xl bg-[#22c55e] px-4 py-2 text-center text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a]"
                >
                  Sign in
                </Link>
              )}
            </div>

            {user ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMobileSummaryOpen((open) => !open)}
                  aria-expanded={mobileSummaryOpen}
                  aria-controls="mobile-account-summary"
                  className="flex w-full items-center justify-between rounded-xl border border-[#1f2a24] px-4 py-2 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e]"
                >
                  <span>Account summary</span>
                  <span>{mobileSummaryOpen ? "Hide" : "Show"}</span>
                </button>

                {mobileSummaryOpen ? (
                  <div id="mobile-account-summary">
                    <AccountSummaryGrid
                      summary={summary}
                      loadingSummary={loadingSummary}
                      compact
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
