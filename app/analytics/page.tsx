"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../lib/firebase";
import type { CallRecord, CallsListResponse } from "../lib/types";
import { Topbar } from "../components/Topbar";
import { Loader } from "../components/Loader";
import { formatSeconds } from "../lib/functions";

interface AgentStats {
  agentId: string;
  agentName: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
  totalDuration: number;
  avgDuration: number;
  totalCost: number;
  sentimentPositive: number;
  sentimentNeutral: number;
  sentimentNegative: number;
  sentimentUnknown: number;
}

interface SentimentTrend {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  unknown: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<"success" | "sentiment" | "duration">("success");

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
    if (!user || !functions) return;

    const fetchCalls = async () => {
      setLoading(true);
      try {
        const getCalls = httpsCallable<
          { page: number; limit: number; sort: string },
          CallsListResponse
        >(functions!, "getCalls");
        const result = await getCalls({ page: 1, limit: 1000, sort: "desc" });
        if (result?.data?.calls) {
          setCalls(result.data.calls);
        }
      } catch (error) {
        console.error("Error fetching calls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [user]);

  const agentStats = useMemo<AgentStats[]>(() => {
    const agentMap = new Map<string, AgentStats>();

    calls.forEach((call) => {
      const agentId = call.agentId || "unknown";
      const agentName = call.agentName || "Unknown Agent";
      
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          agentId,
          agentName,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          successRate: 0,
          totalDuration: 0,
          avgDuration: 0,
          totalCost: 0,
          sentimentPositive: 0,
          sentimentNeutral: 0,
          sentimentNegative: 0,
          sentimentUnknown: 0,
        });
      }

      const stats = agentMap.get(agentId)!;
      stats.totalCalls++;
      
      if (call.callAnalysis?.callSuccessful) {
        stats.successfulCalls++;
      } else if (call.status === "ended") {
        stats.failedCalls++;
      }

      stats.totalDuration += call.durationSeconds;
      stats.totalCost += call.costUsd;

      const sentiment = call.callAnalysis?.userSentiment;
      if (sentiment === "Positive") stats.sentimentPositive++;
      else if (sentiment === "Neutral") stats.sentimentNeutral++;
      else if (sentiment === "Negative") stats.sentimentNegative++;
      else stats.sentimentUnknown++;
    });

    agentMap.forEach((stats) => {
      stats.successRate = stats.totalCalls > 0 ? (stats.successfulCalls / stats.totalCalls) * 100 : 0;
      stats.avgDuration = stats.totalCalls > 0 ? stats.totalDuration / stats.totalCalls : 0;
    });

    return Array.from(agentMap.values()).sort((a, b) => b.totalCalls - a.totalCalls);
  }, [calls]);

  const sentimentTrends = useMemo<SentimentTrend[]>(() => {
    const trendMap = new Map<string, SentimentTrend>();

    calls.forEach((call) => {
      const date = new Date(call.startTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!trendMap.has(date)) {
        trendMap.set(date, {
          date,
          positive: 0,
          neutral: 0,
          negative: 0,
          unknown: 0,
        });
      }

      const trend = trendMap.get(date)!;
      const sentiment = call.callAnalysis?.userSentiment;
      
      if (sentiment === "Positive") trend.positive++;
      else if (sentiment === "Neutral") trend.neutral++;
      else if (sentiment === "Negative") trend.negative++;
      else trend.unknown++;
    });

    return Array.from(trendMap.values()).slice(-14); // Last 14 days
  }, [calls]);

  const overallStats = useMemo(() => {
    const total = calls.length;
    const successful = calls.filter((c) => c.callAnalysis?.callSuccessful).length;
    const positive = calls.filter((c) => c.callAnalysis?.userSentiment === "Positive").length;
    const neutral = calls.filter((c) => c.callAnalysis?.userSentiment === "Neutral").length;
    const negative = calls.filter((c) => c.callAnalysis?.userSentiment === "Negative").length;
    const totalDuration = calls.reduce((sum, c) => sum + c.durationSeconds, 0);
    const totalCost = calls.reduce((sum, c) => sum + c.costUsd, 0);

    return {
      total,
      successful,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      positive,
      neutral,
      negative,
      avgDuration: total > 0 ? totalDuration / total : 0,
      totalCost,
    };
  }, [calls]);

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
          <h1 className="text-3xl font-bold text-slate-50">Analytics Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Comprehensive insights into agent performance and call sentiment trends
          </p>
        </header>

        {/* Overall Stats */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📞</span>
              <div>
                <p className="text-2xl font-bold text-slate-50">{overallStats.total}</p>
                <p className="text-xs text-slate-400">Total Calls</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {overallStats.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400">Success Rate</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">😊</span>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{overallStats.positive}</p>
                <p className="text-xs text-slate-400">Positive Sentiment</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⏱</span>
              <div>
                <p className="text-2xl font-bold text-slate-50">
                  {formatSeconds(Math.round(overallStats.avgDuration))}
                </p>
                <p className="text-xs text-slate-400">Avg Duration</p>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Performance Table */}
        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-50">Agent Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Agent</th>
                  <th className="py-3 pr-4 text-right">Total Calls</th>
                  <th className="py-3 pr-4 text-right">Success Rate</th>
                  <th className="py-3 pr-4 text-right">Avg Duration</th>
                  <th className="py-3 pr-4 text-right">Sentiment</th>
                  <th className="py-3 text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((agent) => (
                  <tr key={agent.agentId} className="border-b border-slate-800/50 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200">{agent.agentName}</span>
                        <span className="text-xs text-slate-500">{agent.agentId}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-slate-200">
                      {agent.totalCalls}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          agent.successRate >= 80
                            ? "bg-emerald-500/15 text-emerald-300"
                            : agent.successRate >= 60
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {agent.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-300">
                      {formatSeconds(Math.round(agent.avgDuration))}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1 text-xs">
                        <span className="text-emerald-400">😊{agent.sentimentPositive}</span>
                        <span className="text-amber-400">😐{agent.sentimentNeutral}</span>
                        <span className="text-rose-400">😞{agent.sentimentNegative}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-slate-200">
                      ${agent.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sentiment Trends */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-50">Sentiment Trends (Last 14 Days)</h2>
          <div className="space-y-3">
            {sentimentTrends.map((trend) => {
              const total = trend.positive + trend.neutral + trend.negative + trend.unknown;
              const positivePercent = total > 0 ? (trend.positive / total) * 100 : 0;
              const neutralPercent = total > 0 ? (trend.neutral / total) * 100 : 0;
              const negativePercent = total > 0 ? (trend.negative / total) * 100 : 0;

              return (
                <div key={trend.date} className="flex items-center gap-4">
                  <span className="w-20 text-xs text-slate-400">{trend.date}</span>
                  <div className="flex-1">
                    <div className="flex h-8 overflow-hidden rounded-full bg-slate-800">
                      {positivePercent > 0 && (
                        <div
                          className="bg-emerald-500 flex items-center justify-center text-xs font-medium text-white"
                          style={{ width: `${positivePercent}%` }}
                          title={`Positive: ${trend.positive}`}
                        >
                          {positivePercent > 10 && `${trend.positive}`}
                        </div>
                      )}
                      {neutralPercent > 0 && (
                        <div
                          className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white"
                          style={{ width: `${neutralPercent}%` }}
                          title={`Neutral: ${trend.neutral}`}
                        >
                          {neutralPercent > 10 && `${trend.neutral}`}
                        </div>
                      )}
                      {negativePercent > 0 && (
                        <div
                          className="bg-rose-500 flex items-center justify-center text-xs font-medium text-white"
                          style={{ width: `${negativePercent}%` }}
                          title={`Negative: ${trend.negative}`}
                        >
                          {negativePercent > 10 && `${trend.negative}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs text-slate-400">{total}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
