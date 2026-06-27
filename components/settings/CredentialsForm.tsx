"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import { FormEvent, useState } from "react";

export function CredentialsForm() {
  const [kalshiApiKeyId, setKalshiApiKeyId] = useState("");
  const [kalshiPrivateKey, setKalshiPrivateKey] = useState("");
  const [openAiApiKey, setOpenAiApiKey] = useState("");

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setError("");
    setSaving(true);

    try {
      const user = firebaseAuth.currentUser;

      if (!user) {
        throw new Error("You must be signed in before saving credentials.");
      }

      const idToken = await user.getIdToken();

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

      if (!response.ok) {
        throw new Error("Credential save failed.");
      }

      setStatus("Credentials saved securely.");
      setKalshiApiKeyId("");
      setKalshiPrivateKey("");
      setOpenAiApiKey("");
    } catch (err) {
      console.error(err);
      setError("Unable to save credentials. Check the console for details.");
    } finally {
      setSaving(false);
    }
  }

  return (
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
        Credentials are sent to a server route, encrypted, and stored under your
        private user document. Saved values are not shown back in the browser.
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
  );
}