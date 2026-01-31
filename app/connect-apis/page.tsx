"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

type ConnectionStatus = "not-connected" | "testing" | "connected" | "invalid";

export default function ConnectApisPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const [retellKey, setRetellKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [retellStatus, setRetellStatus] =
    useState<ConnectionStatus>("not-connected");
  const [openRouterStatus, setOpenRouterStatus] =
    useState<ConnectionStatus>("not-connected");
  const [retellError, setRetellError] = useState<string | null>(null);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth) {
      setReady(true);
      router.replace("/login");
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setReady(true);
      if (!u) {
        router.replace("/login");
        return;
      }

      // Key status is set to "connected" when backend validateApiKey succeeds.
    });
    return () => unsub();
  }, [router]);

  async function verifyRetell() {
    if (!retellKey.trim()) {
      setRetellError("Please enter your Retell API key before verifying.");
      return;
    }

    if (!user) {
      setRetellError("You must be logged in to verify API keys.");
      return;
    }

    setRetellError(null);
    setRetellStatus("testing");
    setLoading(true);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          provider: "retell",
          apiKey: retellKey.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && typeof data.error === "string" ? data.error : null) ||
            "Verification failed"
        );
      }
      setRetellStatus("connected");
      setRetellKey("");
    } catch (error) {
      setRetellStatus("invalid");
      setRetellError(
        error instanceof Error ? error.message : "Failed to verify Retell key"
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyOpenRouter() {
    if (!openRouterKey.trim()) {
      setOpenRouterError("Please enter your OpenRouter API key before verifying.");
      return;
    }

    if (!user) {
      setOpenRouterError("You must be logged in to verify API keys.");
      return;
    }

    setOpenRouterError(null);
    setOpenRouterStatus("testing");
    setLoading(true);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          provider: "openrouter",
          apiKey: openRouterKey.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && typeof data.error === "string" ? data.error : null) ||
            "Verification failed"
        );
      }
      setOpenRouterStatus("connected");
      setOpenRouterKey("");
    } catch (error) {
      setOpenRouterStatus("invalid");
      setOpenRouterError(
        error instanceof Error
          ? error.message
          : "Failed to verify OpenRouter key"
      );
    } finally {
      setLoading(false);
    }
  }

  function continueToDashboard() {
    if (retellStatus === "connected" && openRouterStatus === "connected") {
      router.push("/dashbord");
    }
  }

  function renderStatusLabel(status: ConnectionStatus, error: string | null) {
    if (status === "testing") {
      return (
        <span className="inline-flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-medium text-amber-300">🟡 Testing</span>
        </span>
      );
    }
    if (status === "connected") {
      return (
        <span className="inline-flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-medium text-emerald-300">🟢 Connected</span>
        </span>
      );
    }
    if (status === "invalid") {
      return (
        <span className="inline-flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="font-medium text-rose-300">🔴 Invalid</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-slate-500" />
        <span className="font-medium text-slate-400">Not Connected</span>
      </span>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-slate-400">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl bg-slate-900/80 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
            <span className="text-xl">🔑</span>
          </div>

          <h1 className="mt-6 text-center text-2xl font-semibold tracking-tight text-slate-50">
            Connect Your APIs
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Connect your API keys to unlock the dashboard.
          </p>

          <div className="mt-8 space-y-6">
            <section>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-medium text-slate-100">
                  Retell API Key
                </h2>
                {renderStatusLabel(retellStatus, retellError)}
              </div>
              <div className="mt-2 flex gap-3">
                <input
                  value={retellKey}
                  onChange={(e) => {
                    setRetellKey(e.target.value);
                    if (retellStatus === "invalid") {
                      setRetellStatus("not-connected");
                      setRetellError(null);
                    }
                  }}
                  placeholder="Enter your Retell API key"
                  disabled={retellStatus === "connected" || loading}
                  type="password"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={verifyRetell}
                  disabled={retellStatus === "connected" || loading || !retellKey.trim()}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm shadow-sky-500/30 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retellStatus === "testing" ? "Testing..." : retellStatus === "connected" ? "Connected" : "Verify"}
                </button>
              </div>
              {retellError && (
                <p className="mt-2 text-xs text-rose-300">{retellError}</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-medium text-slate-100">
                  OpenRouter API Key
                </h2>
                {renderStatusLabel(openRouterStatus, openRouterError)}
              </div>
              <div className="mt-2 flex gap-3">
                <input
                  value={openRouterKey}
                  onChange={(e) => {
                    setOpenRouterKey(e.target.value);
                    if (openRouterStatus === "invalid") {
                      setOpenRouterStatus("not-connected");
                      setOpenRouterError(null);
                    }
                  }}
                  placeholder="Enter your OpenRouter API key"
                  disabled={openRouterStatus === "connected" || loading}
                  type="password"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={verifyOpenRouter}
                  disabled={openRouterStatus === "connected" || loading || !openRouterKey.trim()}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 shadow-sm shadow-sky-500/30 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {openRouterStatus === "testing" ? "Testing..." : openRouterStatus === "connected" ? "Connected" : "Verify"}
                </button>
              </div>
              {openRouterError && (
                <p className="mt-2 text-xs text-rose-300">{openRouterError}</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="mt-[2px] text-base">ℹ️</span>
                <div>
                  <p className="font-medium text-slate-200">Need API keys?</p>
                  <p className="mt-1">
                    Get your Retell API key from{" "}
                    <a
                      href="https://retell.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline-offset-2 hover:underline"
                    >
                      retell.ai
                    </a>{" "}
                    and your OpenRouter key from{" "}
                    <a
                      href="https://openrouter.ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline-offset-2 hover:underline"
                    >
                      openrouter.ai
                    </a>
                    .
                  </p>
                </div>
              </div>
            </section>

            <button
              type="button"
              onClick={continueToDashboard}
              disabled={retellStatus !== "connected" || openRouterStatus !== "connected"}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {retellStatus === "connected" && openRouterStatus === "connected"
                  ? "Continue to Dashboard"
                  : "Connect both API keys to continue"}
              </span>
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

