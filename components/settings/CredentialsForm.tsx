"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import { FormEvent, useEffect, useState } from "react";

type CredentialStatus = {
  hasKalshiApiKeyId: boolean;
  hasKalshiPrivateKey: boolean;
  hasOpenAiApiKey: boolean;
  updatedAt: string | null;
};

const emptyCredentialStatus: CredentialStatus = {
  hasKalshiApiKeyId: false,
  hasKalshiPrivateKey: false,
  hasOpenAiApiKey: false,
  updatedAt: null,
};

function StatusBadge({ saved }: { saved: boolean }) {
  if (saved) {
    return (
      <span className="rounded-full border border-[#22c55e]/40 bg-[#0b2a18] px-3 py-1 text-xs font-semibold text-[#bbf7d0]">
        Saved
      </span>
    );
  }

  return (
    <span className="rounded-full border border-[#6f7b74]/40 bg-[#0b120f] px-3 py-1 text-xs font-semibold text-[#a8b3ad]">
      Missing
    </span>
  );
}

export function CredentialsForm() {
  const [kalshiApiKeyId, setKalshiApiKeyId] = useState("");
  const [kalshiPrivateKey, setKalshiPrivateKey] = useState("");
  const [openAiApiKey, setOpenAiApiKey] = useState("");

  const [credentialStatus, setCredentialStatus] =
    useState<CredentialStatus>(emptyCredentialStatus);

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [kalshiTestStatus, setKalshiTestStatus] = useState("");
  const [kalshiTestError, setKalshiTestError] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testingKalshi, setTestingKalshi] = useState(false);

  async function getCurrentUserToken() {
    const user = firebaseAuth.currentUser;

    if (!user) {
      throw new Error("You must be signed in.");
    }

    return user.getIdToken();
  }

  async function loadCredentialStatus() {
    setLoadingStatus(true);
    setError("");

    try {
      const idToken = await getCurrentUserToken();

      const response = await fetch("/api/credentials/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Credential status check failed.");
      }

      setCredentialStatus(body.status ?? emptyCredentialStatus);
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to load credential status.";

      setError(message);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function testKalshiConnection() {
    setKalshiTestStatus("");
    setKalshiTestError("");
    setTestingKalshi(true);

    try {
      const idToken = await getCurrentUserToken();

      const response = await fetch("/api/credentials/kalshi/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Kalshi connection test failed.");
      }

      if (!body.connected) {
        throw new Error(
          body?.error ??
            "Kalshi connection test failed. Check your saved credentials."
        );
      }

      setKalshiTestStatus(
        body?.message ?? "Kalshi connection test succeeded."
      );
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to test Kalshi connection.";

      setKalshiTestError(message);
    } finally {
      setTestingKalshi(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    setKalshiTestStatus("");
    setKalshiTestError("");
    setSaving(true);

    try {
      const idToken = await getCurrentUserToken();

      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          kalshiApiKeyId: kalshiApiKeyId || undefined,
          kalshiPrivateKey: kalshiPrivateKey || undefined,
          openAiApiKey: openAiApiKey || undefined,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body?.error ?? "Credential save failed.");
      }

      setStatus("Credentials saved securely.");
      setKalshiApiKeyId("");
      setKalshiPrivateKey("");
      setOpenAiApiKey("");

      await loadCredentialStatus();
    } catch (err) {
      console.error(err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to save credentials. Check the console for details.";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadCredentialStatus();
  }, []);

  const hasCompleteKalshiCredentials =
    credentialStatus.hasKalshiApiKeyId &&
    credentialStatus.hasKalshiPrivateKey;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
              Credential Status
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Saved credential check
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
              This only checks whether credentials exist. It does not return
              saved keys, decrypted values, or encrypted payloads to the browser.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadCredentialStatus()}
            disabled={loadingStatus}
            className="rounded-xl border border-[#1f2a24] px-4 py-3 text-sm font-semibold text-[#a8b3ad] transition hover:border-[#22c55e] hover:text-[#22c55e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingStatus ? "Checking..." : "Refresh status"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                Kalshi API Key ID
              </p>
              <StatusBadge saved={credentialStatus.hasKalshiApiKeyId} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6f7b74]">
              Required to authenticate Kalshi API requests.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                Kalshi Private Key
              </p>
              <StatusBadge saved={credentialStatus.hasKalshiPrivateKey} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6f7b74]">
              Required for signed Kalshi API requests.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1f2a24] bg-[#0b120f] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                OpenAI API Key
              </p>
              <StatusBadge saved={credentialStatus.hasOpenAiApiKey} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6f7b74]">
              Required for AI position review unless app fallback is added.
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#6f7b74]">
          Last updated:{" "}
          {credentialStatus.updatedAt
            ? new Date(credentialStatus.updatedAt).toLocaleString()
            : "Not saved yet"}
        </p>
      </section>

      <section className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
          Connection Test
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Test Kalshi credentials
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
          This decrypts the saved Kalshi credentials on the server only, signs a
          read-only balance request, and returns only the connection result.
        </p>

        <button
          type="button"
          onClick={() => testKalshiConnection()}
          disabled={testingKalshi || !hasCompleteKalshiCredentials}
          className="mt-6 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {testingKalshi ? "Testing..." : "Test Kalshi connection"}
        </button>

        {!hasCompleteKalshiCredentials ? (
          <p className="mt-4 text-sm text-[#6f7b74]">
            Save both the Kalshi API Key ID and Kalshi Private Key before
            testing.
          </p>
        ) : null}

        {kalshiTestStatus ? (
          <p className="mt-5 rounded-xl border border-[#22c55e]/40 bg-[#0b2a18] px-4 py-3 text-sm text-[#bbf7d0]">
            {kalshiTestStatus}
          </p>
        ) : null}

        {kalshiTestError ? (
          <p className="mt-5 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]">
            {kalshiTestError}
          </p>
        ) : null}
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-[#1f2a24] bg-[#101714] p-6"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#22c55e]">
          Credentials
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Save encrypted API credentials
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#a8b3ad]">
          Credentials are sent to a server route, encrypted, and stored under
          your private user document. Saved values are not shown back in the
          browser.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-[#f4f7f5]">
              Kalshi API Key ID
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-4 py-3 text-white outline-none transition focus:border-[#22c55e]"
              value={kalshiApiKeyId}
              onChange={(event) => setKalshiApiKeyId(event.target.value)}
              placeholder="Paste Kalshi API key ID"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#f4f7f5]">
              Kalshi Private Key
            </span>
            <textarea
              className="mt-2 min-h-36 w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-4 py-3 text-white outline-none transition focus:border-[#22c55e]"
              value={kalshiPrivateKey}
              onChange={(event) => setKalshiPrivateKey(event.target.value)}
              placeholder="Paste Kalshi private key"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#f4f7f5]">
              OpenAI API Key
            </span>
            <input
              className="mt-2 w-full rounded-xl border border-[#1f2a24] bg-[#050807] px-4 py-3 text-white outline-none transition focus:border-[#22c55e]"
              value={openAiApiKey}
              onChange={(event) => setOpenAiApiKey(event.target.value)}
              placeholder="Paste OpenAI API key"
              type="password"
            />
          </label>
        </div>

        {status ? (
          <p className="mt-5 rounded-xl border border-[#22c55e]/40 bg-[#0b2a18] px-4 py-3 text-sm text-[#bbf7d0]">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fecaca]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-semibold text-[#041008] transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save credentials"}
        </button>
      </form>
    </div>
  );
}