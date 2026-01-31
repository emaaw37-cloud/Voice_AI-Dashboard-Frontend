"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../lib/firebase";
import type { CallRecord, CallsListResponse } from "../lib/types";
import { formatSeconds, formatUSD } from "../lib/functions";
import { Topbar } from "../components/Topbar";
import { Loader } from "../components/Loader";

export default function CallsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    if (!auth) {
      setReady(true);
      router.replace("/login");
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      if (!u) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchCalls = async () => {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch("http://127.0.0.1:5001/saedevmng/us-central1/getCalls", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ page: 1, limit: 500, sort: "desc" }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch calls");
        }

        const data = await response.json();
        if (data?.calls) {
          setCalls(data.calls);
        }
      } catch (error) {
        console.error("Error fetching calls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [user]);

  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    calls.forEach((call) => {
      if (call.agentName) {
        agents.add(call.agentName);
      }
    });
    return Array.from(agents).sort();
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = calls;

    if (selectedAgent !== "all") {
      filtered = filtered.filter((c) => c.agentName === selectedAgent);
    }

    if (selectedSentiment !== "all") {
      filtered = filtered.filter((c) => c.callAnalysis?.userSentiment === selectedSentiment);
    }

    if (selectedStatus !== "all") {
      if (selectedStatus === "success") {
        filtered = filtered.filter((c) => c.callAnalysis?.callSuccessful === true);
      } else if (selectedStatus === "failed") {
        filtered = filtered.filter(
          (c) => c.callAnalysis?.callSuccessful === false && c.status === "ended"
        );
      } else if (selectedStatus === "error") {
        filtered = filtered.filter((c) => c.status === "failed");
      }
    }

    if (q) {
      filtered = filtered.filter((c) =>
        `${c.id} ${c.agentName} ${c.direction} ${c.status} ${c.callAnalysis?.userSentiment || ""} ${c.callAnalysis?.callSummary || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    return filtered;
  }, [calls, query, selectedAgent, selectedSentiment, selectedStatus]);

  const stats = useMemo(() => {
    const total = filteredCalls.length;
    const successful = filteredCalls.filter((c) => c.callAnalysis?.callSuccessful).length;
    const positive = filteredCalls.filter((c) => c.callAnalysis?.userSentiment === "Positive")
      .length;
    const totalCost = filteredCalls.reduce((sum, c) => sum + c.costUsd, 0);

    return { total, successful, positive, totalCost };
  }, [filteredCalls]);

  if (!ready || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <Topbar />
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Loader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Topbar />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-50">All Calls</h1>
              <p className="mt-1 text-sm text-slate-400">
                Detailed history of your Voice AI calls with advanced filtering
              </p>
            </div>
            <Link
              href="/analytics"
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              📊 View Analytics
            </Link>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-2xl font-bold text-slate-50">{stats.total}</p>
            <p className="text-xs text-slate-400">Total Calls</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.successful}</p>
            <p className="text-xs text-slate-400">Successful</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.positive}</p>
            <p className="text-xs text-slate-400">Positive Sentiment</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-2xl font-bold text-slate-50">{formatUSD(stats.totalCost)}</p>
            <p className="text-xs text-slate-400">Total Cost</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search calls..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Agent</label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="all">All Agents</option>
                {uniqueAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Sentiment</label>
              <select
                value={selectedSentiment}
                onChange={(e) => setSelectedSentiment(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="all">All Sentiments</option>
                <option value="Positive">😊 Positive</option>
                <option value="Neutral">😐 Neutral</option>
                <option value="Negative">😞 Negative</option>
                <option value="Unknown">❓ Unknown</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="all">All Status</option>
                <option value="success">✅ Successful</option>
                <option value="failed">⚠️ Ended (Not Successful)</option>
                <option value="error">❌ Failed</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedAgent("all");
                  setSelectedSentiment("all");
                  setSelectedStatus("all");
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-3 pr-4">Date/Time</th>
                  <th className="py-3 pr-4">Agent</th>
                  <th className="py-3 pr-4">Direction</th>
                  <th className="py-3 pr-4">Duration</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Sentiment</th>
                  <th className="py-3 pr-4">Cost</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      {calls.length === 0 ? "No calls yet." : "No calls match the selected filters."}
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => {
                    const sentiment = call.callAnalysis?.userSentiment || "Unknown";
                    const isSuccessful = call.callAnalysis?.callSuccessful ?? false;
                    const isEnded = call.status === "ended";

                    return (
                      <tr
                        key={call.id}
                        className="cursor-pointer border-b border-slate-800/80 last:border-b-0 hover:bg-slate-800/50"
                        onClick={() => router.push(`/dashbord/calls/${call.id}`)}
                      >
                        <td className="py-3 pr-4 text-slate-200">
                          {new Date(call.startTime).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">
                              {call.agentName || "Unknown"}
                            </span>
                            {call.agentId && (
                              <span className="text-xs text-slate-500">{call.agentId.slice(0, 20)}...</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs ${
                              call.direction === "inbound"
                                ? "bg-sky-500/15 text-sky-300"
                                : "bg-purple-500/15 text-purple-300"
                            }`}
                          >
                            {call.direction === "inbound" ? "📞 In" : "📱 Out"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {formatSeconds(call.durationSeconds)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              isEnded && isSuccessful
                                ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300"
                                : isEnded && !isSuccessful
                                ? "rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300"
                                : "rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300"
                            }
                          >
                            {isEnded && isSuccessful
                              ? "✅ Success"
                              : isEnded && !isSuccessful
                              ? "⚠️ Ended"
                              : "❌ Failed"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              sentiment === "Positive"
                                ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300"
                                : sentiment === "Neutral"
                                ? "rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300"
                                : sentiment === "Negative"
                                ? "rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300"
                                : "rounded-full bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-400"
                            }
                          >
                            {sentiment === "Positive"
                              ? "😊"
                              : sentiment === "Neutral"
                              ? "😐"
                              : sentiment === "Negative"
                              ? "😞"
                              : "❓"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-200">
                          {formatUSD(call.costUsd)}
                        </td>
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 text-slate-400">
                            {call.recordingUrl && (
                              <Link
                                href={`/dashbord/calls/${call.id}#recording`}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700"
                                title="Play recording"
                              >
                                ▶
                              </Link>
                            )}
                            {call.transcriptText && (
                              <Link
                                href={`/dashbord/calls/${call.id}#transcript`}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700"
                                title="View transcript"
                              >
                                👁
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
