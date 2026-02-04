"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useCalls } from "../lib/useCalls";
import { formatSeconds, formatUSD, formatDurationShort } from "../lib/functions";
import type { DashboardOverview, CallRecord } from "../lib/types";

/**
 * Computes dashboard overview from call records (client-side aggregation)
 */
function computeOverviewFromCalls(calls: CallRecord[]): DashboardOverview {
  if (!calls || calls.length === 0) {
    return {
      total_calls_this_month: 0,
      total_calls_last_month: 0,
      success_rate: 0,
      avg_duration_seconds: 0,
      avg_duration_last_month_seconds: 0,
      sparkline_data: [],
      current_month_cost: { dashboard_fee: 0, retell_cost: 0, openrouter_cost: 0, total: 0 },
      last_month_cost_total: 0,
    };
  }

  // Current month bounds
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Filter calls for current month
  const currentMonthCalls = calls.filter((c) => new Date(c.startTime) >= monthStart);

  const totalCalls = currentMonthCalls.length;
  const totalCostUsd = currentMonthCalls.reduce((sum, c) => sum + (c.costUsd || 0), 0);
  const totalDuration = currentMonthCalls.reduce((sum, c) => sum + (c.durationSeconds || 0), 0);
  const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
  const successfulCalls = currentMonthCalls.filter((c) => c.callAnalysis?.callSuccessful).length;
  const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

  // Build daily counts for sparkline
  const dailyCounts: Record<string, number> = {};
  currentMonthCalls.forEach((c) => {
    const dateKey = new Date(c.startTime).toISOString().slice(0, 10);
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  const sparkline_data = Object.entries(dailyCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, v]) => v);

  return {
    total_calls_this_month: totalCalls,
    total_calls_last_month: 0,
    success_rate: successRate,
    avg_duration_seconds: avgDuration,
    avg_duration_last_month_seconds: 0,
    sparkline_data,
    current_month_cost: {
      dashboard_fee: 0,
      retell_cost: totalCostUsd,
      openrouter_cost: 0,
      total: totalCostUsd,
    },
    last_month_cost_total: 0,
  };
}

// Refresh interval - longer due to caching (2 minutes)
const REFRESH_INTERVAL_MS = 2 * 60 * 1000;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/** PRD 3.2.1 - Sparkline (last 30 days) */
function Sparkline({ data }: { data: number[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data, 1);
  const height = 32;
  const width = 120;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - (v / max) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full min-w-[120px] text-sky-500/80"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

type StatCardConfig = {
  id: string;
  label: string;
  value: string;
  badge: string;
  trendLabel: string;
  trendPositive: boolean;
  title?: string;
  sparklineData?: number[];
  successRateColor?: "green" | "yellow" | "red";
  showCostWarning?: boolean;
};

function StatCard({ card }: { card: StatCardConfig }) {
  return (
    <div
      className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/40"
      title={card.title}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-lg">
          <span>{card.badge}</span>
        </div>
        {card.title && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 text-xs text-slate-500"
            title={card.title}
          >
            ?
          </span>
        )}
        {card.showCostWarning && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400"
            title="Cost is more than 20% over last month"
          >
            ⚠
          </span>
        )}
      </div>
      <div className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
        {card.label}
      </div>
      <div
        className={`mt-2 text-3xl font-semibold ${
          card.successRateColor === "green"
            ? "text-emerald-400"
            : card.successRateColor === "yellow"
            ? "text-amber-400"
            : card.successRateColor === "red"
            ? "text-rose-400"
            : "text-slate-50"
        }`}
      >
        {card.value}
      </div>
      {card.sparklineData && card.sparklineData.length > 0 && (
        <div className="mt-3">
          <Sparkline data={card.sparklineData} />
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={
            card.trendPositive
              ? "text-emerald-400"
              : "text-rose-400"
          }
        >
          {card.trendLabel}
        </span>
        <span className="text-slate-500">vs last month</span>
      </div>
      {card.successRateColor && (
        <div className="mt-1 text-xs text-slate-500" title="Based on call_analysis.call_successful field">
          Based on call success
        </div>
      )}
    </div>
  );
}

export default function DashbordPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Wait for auth before fetching calls
  const { 
    calls: allCalls, 
    loading: callsLoading, 
    error: callsError, 
    refetch,
    ready: callsReady 
  } = useCalls(user?.uid, {
    maxCalls: 500,
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Compute overview from calls client-side
  const overview = useMemo(() => computeOverviewFromCalls(allCalls), [allCalls]);

  // Recent calls (first 20)
  const recentCalls = useMemo(() => allCalls.slice(0, 20), [allCalls]);

  // Handle authentication state
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Refresh data periodically (less frequent due to caching)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      // Safe to call - refetch checks user internally
      // Will skip if cache is still fresh
      refetch();
    }, REFRESH_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [user, refetch]);

  // Combined loading state: waiting for auth OR waiting for initial data fetch
  const loading = authLoading || (!!user && callsLoading && !callsReady);

  const cards: StatCardConfig[] = useMemo(() => {
    if (!overview) {
      return [
        { id: "total-calls", label: "Total Calls", value: "—", badge: "📞", trendLabel: "—", trendPositive: true },
        { id: "success-rate", label: "Success Rate", value: "—", badge: "✅", trendLabel: "—", trendPositive: true },
        { id: "avg-duration", label: "Avg Duration", value: "—", badge: "⏱", trendLabel: "—", trendPositive: true },
        { id: "current-cost", label: "Current Month Cost", value: "—", badge: "💲", trendLabel: "—", trendPositive: true },
      ];
    }
    const {
      total_calls_this_month,
      total_calls_last_month,
      success_rate,
      avg_duration_seconds,
      avg_duration_last_month_seconds,
      sparkline_data,
      current_month_cost,
      last_month_cost_total,
    } = overview;

    const callPct = total_calls_last_month
      ? ((total_calls_this_month - total_calls_last_month) / total_calls_last_month) * 100
      : 0;

    const durationPct = avg_duration_last_month_seconds
      ? ((avg_duration_seconds - avg_duration_last_month_seconds) / avg_duration_last_month_seconds) * 100
      : 0;

    const costOverLastMonth =
      last_month_cost_total && last_month_cost_total > 0
        ? ((current_month_cost.total - last_month_cost_total) / last_month_cost_total) * 100
        : 0;
    const showCostWarning = costOverLastMonth > 20;

    const successRateColor: "green" | "yellow" | "red" =
      success_rate >= 0.8 ? "green" : success_rate >= 0.6 ? "yellow" : "red";

    return [
      {
        id: "total-calls",
        label: "Total Calls",
        value: total_calls_this_month.toLocaleString("en-US"),
        badge: "📞",
        trendLabel: callPct >= 0 ? `+${callPct.toFixed(1)}%` : `${callPct.toFixed(1)}%`,
        trendPositive: callPct >= 0,
        sparklineData: sparkline_data,
      },
      {
        id: "success-rate",
        label: "Success Rate",
        value: `${(success_rate * 100).toFixed(1)}%`,
        badge: "✅",
        trendLabel: "vs last month",
        trendPositive: success_rate >= 0.8,
        title: "Based on call_analysis.call_successful field",
        successRateColor,
      },
      {
        id: "avg-duration",
        label: "Avg Duration",
        value: formatDurationShort(avg_duration_seconds),
        badge: "⏱",
        trendLabel: durationPct >= 0 ? `+${durationPct.toFixed(1)}%` : `${durationPct.toFixed(1)}%`,
        trendPositive: durationPct >= 0,
      },
      {
        id: "current-cost",
        label: "Current Month Cost",
        value: formatUSD(current_month_cost.total),
        badge: "💲",
        trendLabel: "Projected this cycle",
        trendPositive: true,
        title: `Dashboard: $${current_month_cost.dashboard_fee} | Retell: $${current_month_cost.retell_cost.toFixed(2)} | OpenRouter: $${current_month_cost.openrouter_cost.toFixed(2)}`,
        showCostWarning,
      },
    ];
  }, [overview]);

  const handleRetryCalls = useCallback(async () => {
    try {
      await refetch();
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.warn(e);
    }
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* PRD 3.2.1 - 4 cards, responsive 2x2 on mobile */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.id} card={card} />
        ))}
      </section>

      {/* PRD 3.2.2 - Recent Calls Table */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              Recent Calls
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Last 20 calls. Updates every 30 seconds.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {callsError && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 flex items-center gap-2">
                <span>
                  {callsError.includes("permission") || callsError.includes("insufficient")
                    ? "Missing or insufficient permissions. Please contact admin to set up your account."
                    : callsError}
                </span>
                <button
                  type="button"
                  onClick={handleRetryCalls}
                  className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
                >
                  Retry
                </button>
              </div>
            )}
            <Link
              href="/calls"
              className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
            >
              View All
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="py-2 pr-4">Date/Time</th>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Sentiment</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(loading || callsLoading) && recentCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading calls…
                  </td>
                </tr>
              ) : recentCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No calls yet.
                  </td>
                </tr>
              ) : (
                recentCalls.map((row) => {
                  const sentiment = row.callAnalysis?.userSentiment || "Unknown";
                  const isSuccessful = row.callAnalysis?.callSuccessful ?? false;
                  const isEnded = row.status === "ended";
                  
                  return (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/dashbord/calls/${row.id}`)}
                      className="cursor-pointer border-b border-slate-800/80 last:border-b-0 hover:bg-slate-800/50"
                    >
                      <td className="py-3 pr-4 text-slate-200">
                        {new Date(row.startTime).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-medium">
                            {row.agentName || "Unknown Agent"}
                          </span>
                          {row.agentId && (
                            <span className="text-xs text-slate-500 truncate max-w-[150px]" title={row.agentId}>
                              {row.agentId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">
                        {formatSeconds(row.durationSeconds)}
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
                            ? "😊 Positive"
                            : sentiment === "Neutral"
                            ? "😐 Neutral"
                            : sentiment === "Negative"
                            ? "😞 Negative"
                            : "❓ Unknown"}
                        </span>
                      </td>
                      <td className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 text-slate-400">
                          {row.recordingUrl && (
                            <Link
                              href={`/dashbord/calls/${row.id}#recording`}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700"
                              title="Play recording"
                            >
                              🔊
                            </Link>
                          )}
                          {row.transcriptText && (
                            <Link
                              href={`/dashbord/calls/${row.id}#transcript`}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700"
                              title="View transcript"
                            >
                              👁️
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
  );
}
