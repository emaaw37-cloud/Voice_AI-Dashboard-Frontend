"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useCalls } from "../../lib/useCalls";
import { formatDurationShort } from "../../lib/functions";
import type {
  AnalyticsVolume,
  AnalyticsSentiment,
  AnalyticsOutcomes,
  AnalyticsMetrics,
} from "../../lib/types";

type DateRange = "7d" | "30d" | "90d" | "this_month" | "last_month" | "custom";

function getDateRange(
  range: DateRange,
  customStart?: string,
  customEnd?: string
): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (range === "custom" && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }

  switch (range) {
    case "7d": {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return { start: d7.toISOString().slice(0, 10), end: today };
    }
    case "30d": {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      return { start: d30.toISOString().slice(0, 10), end: today };
    }
    case "90d": {
      const d90 = new Date(now);
      d90.setDate(d90.getDate() - 90);
      return { start: d90.toISOString().slice(0, 10), end: today };
    }
    case "this_month": {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: thisMonthStart.toISOString().slice(0, 10), end: today };
    }
    case "last_month": {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonthStart.toISOString().slice(0, 10),
        end: lastMonthEnd.toISOString().slice(0, 10),
      };
    }
    default:
      return { start: today, end: today };
  }
}

function formatChartDate(dateStr: string, granularity: "daily" | "weekly") {
  const d = new Date(dateStr);
  if (granularity === "weekly") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** PRD 3.4.2 - Line chart with area fill, X-Axis: Date, Y-Axis: Number of calls */
function CallVolumeLineChart({
  data,
  granularity,
}: {
  data: AnalyticsVolume["data"];
  granularity: "daily" | "weekly";
}) {
  // Guard against undefined or empty data
  if (!data || data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-slate-500">
        No call volume data available
      </div>
    );
  }

  const maxCalls = Math.max(...data.map((d) => d.calls), 1);
  const width = 640;
  const height = 240;
  const paddingLeft = 48;
  const paddingRight = 24;
  const paddingTop = 16;
  const paddingBottom = 36;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.calls / maxCalls) * chartHeight;
    return { x, y, date: d.date, calls: d.calls };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaD = `${pathD} L ${points[points.length - 1]?.x ?? paddingLeft} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;

  const yTicks = 5;
  const xLabelStep = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-h-[240px] text-slate-300"
      >
        <defs>
          <linearGradient id="analyticsAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y-Axis labels (Number of calls) */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const value = Math.round((maxCalls * (yTicks - i)) / yTicks);
          const y = paddingTop + (chartHeight * i) / yTicks;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#334155"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px]"
              >
                {value}
              </text>
            </g>
          );
        })}
        {/* X-Axis labels (Date) */}
        {points
          .filter((_, i) => i % xLabelStep === 0 || i === points.length - 1)
          .map((point, i) => (
            <text
              key={point.date}
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {formatChartDate(point.date, granularity)}
            </text>
          ))}
        {/* Area fill */}
        <path d={areaD} fill="url(#analyticsAreaGradient)" />
        {/* Line */}
        <path
          d={pathD}
          stroke="#60A5FA"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#60A5FA"
            className="hover:r-4 transition-all"
          />
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ data }: { data: AnalyticsSentiment }) {
  // Guard against undefined or incomplete data
  if (!data || !data.positive || !data.neutral || !data.negative) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500">
        No sentiment data available
      </div>
    );
  }

  const total = data.positive.count + data.neutral.count + data.negative.count;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const center = 80;

  const positiveLength = (data.positive.percentage / 100) * circumference;
  const neutralLength = (data.neutral.percentage / 100) * circumference;
  const negativeLength = (data.negative.percentage / 100) * circumference;

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 160 160" className="w-40 h-40">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth="20"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth="20"
          strokeDasharray={`${positiveLength} ${circumference}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="20"
          strokeDasharray={`${neutralLength} ${circumference}`}
          strokeDashoffset={-positiveLength}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#EF4444"
          strokeWidth="20"
          strokeDasharray={`${negativeLength} ${circumference}`}
          strokeDashoffset={-(positiveLength + neutralLength)}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-semibold fill-slate-50"
        >
          {total}
        </text>
      </svg>
      <div className="ml-6 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-slate-300">
            Positive: {data.positive.count} ({data.positive.percentage.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-slate-300">
            Neutral: {data.neutral.count} ({data.neutral.percentage.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span className="text-slate-300">
            Negative: {data.negative.count} ({data.negative.percentage.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: AnalyticsOutcomes }) {
  // Guard against undefined or incomplete data
  if (!data || data.successful === undefined || data.failed === undefined) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500">
        No outcomes data available
      </div>
    );
  }

  const max = Math.max(
    data.successful,
    data.failed,
    data.appointments_booked ?? 0,
    data.transfers_to_human ?? 0
  );

  const bars = [
    { label: "Calls Successful", value: data.successful, color: "bg-emerald-500" },
    { label: "Calls Failed", value: data.failed, color: "bg-rose-500" },
    ...(data.appointments_booked != null
      ? [
          {
            label: "Appointments Booked",
            value: data.appointments_booked,
            color: "bg-sky-500",
          },
        ]
      : []),
    ...(data.transfers_to_human != null
      ? [
          {
            label: "Transfers to Human",
            value: data.transfers_to_human,
            color: "bg-amber-500",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-sm text-slate-300">{bar.label}</span>
            <span className="text-sm font-semibold text-slate-50">
              {bar.value}
            </span>
          </div>
          <div className="h-6 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full ${bar.color} transition-all`}
              style={{ width: `${(bar.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const now = useMemo(() => new Date(), []);
  const defaultEnd = now.toISOString().slice(0, 10);
  const defaultStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, [now]);

  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(defaultEnd);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Fetch calls directly from Firestore with caching
  const { 
    calls, 
    loading: callsLoading, 
    error,
    ready: callsReady 
  } = useCalls(user?.uid, { 
    pageSize: 200,     // Larger batches for analytics
    maxCalls: 1000,    // Need more data for analytics
    enabled: !!user,   // Only fetch when user is authenticated
  });

  const { start, end } = useMemo(
    () => getDateRange(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd]
  );

  // Handle authentication state
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Combined loading state
  const loading = !authReady || (!!user && callsLoading && !callsReady);

  // Filter calls by date range
  const filteredCalls = useMemo(() => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    return calls.filter((call) => {
      const callDate = new Date(call.startTime);
      return callDate >= startDate && callDate <= endDate;
    });
  }, [calls, start, end]);

  // Compute volume data (calls per day)
  const volume = useMemo<AnalyticsVolume | null>(() => {
    if (filteredCalls.length === 0) return null;
    const dateMap = new Map<string, number>();
    filteredCalls.forEach((call) => {
      const date = new Date(call.startTime).toISOString().slice(0, 10);
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    const data = Array.from(dateMap.entries())
      .map(([date, calls]) => ({ date, calls }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      data,
      granularity: data.length > 30 ? "weekly" : "daily",
    };
  }, [filteredCalls]);

  // Compute sentiment distribution
  const sentiment = useMemo<AnalyticsSentiment | null>(() => {
    if (filteredCalls.length === 0) return null;
    let positive = 0, neutral = 0, negative = 0;
    filteredCalls.forEach((call) => {
      const s = call.callAnalysis?.userSentiment;
      if (s === "Positive") positive++;
      else if (s === "Neutral") neutral++;
      else if (s === "Negative") negative++;
    });
    const total = positive + neutral + negative || 1;
    return {
      positive: { count: positive, percentage: (positive / total) * 100 },
      neutral: { count: neutral, percentage: (neutral / total) * 100 },
      negative: { count: negative, percentage: (negative / total) * 100 },
    };
  }, [filteredCalls]);

  // Compute outcomes
  const outcomes = useMemo<AnalyticsOutcomes | null>(() => {
    if (filteredCalls.length === 0) return null;
    let successful = 0, failed = 0;
    filteredCalls.forEach((call) => {
      if (call.callAnalysis?.callSuccessful) successful++;
      else if (call.status === "ended" || call.status === "failed") failed++;
    });
    return { successful, failed };
  }, [filteredCalls]);

  // Compute metrics
  const metrics = useMemo<AnalyticsMetrics | null>(() => {
    if (filteredCalls.length === 0) return null;
    const totalDuration = filteredCalls.reduce((sum, c) => sum + c.durationSeconds, 0);
    const successful = filteredCalls.filter((c) => c.callAnalysis?.callSuccessful).length;
    return {
      avg_call_duration_seconds: totalDuration / filteredCalls.length,
      avg_response_time_seconds: 0, // Not available from call data
      success_rate: filteredCalls.length > 0 ? successful / filteredCalls.length : 0,
      trends: undefined as any, // Trends require historical comparison
    };
  }, [filteredCalls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PRD 3.4.1 Date Range Selector - Default: Last 30 days */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              Date Range
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Select a time period to analyze call data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "7d", label: "Last 7 days" },
              { id: "30d", label: "Last 30 days" },
              { id: "90d", label: "Last 90 days" },
              { id: "this_month", label: "This month" },
              { id: "last_month", label: "Last month" },
              { id: "custom", label: "Custom range" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDateRange(opt.id as DateRange)}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
                  dateRange === opt.id
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {dateRange === "custom" && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              From
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              To
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </label>
          </div>
        )}
        <div className="mt-3 text-xs text-slate-500">
          {start} to {end}
        </div>
      </section>

      {/* PRD 3.4.2 Call Volume Chart - Line with area fill, X: Date, Y: Calls, granularity daily/weekly */}
      {volume && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-sm font-semibold text-slate-50">
            Call Volume
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            X-Axis: Date · Y-Axis: Number of calls ·{" "}
            {volume.granularity === "daily" ? "Daily" : "Weekly"} granularity
          </p>
          <div className="mt-4">
            <CallVolumeLineChart data={volume.data} granularity={volume.granularity} />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* PRD 3.4.3 Sentiment Distribution - Donut: Positive (green), Neutral (yellow), Negative (red), % + count */}
        {sentiment && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Sentiment Distribution
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Percentage and count per segment.
            </p>
            <div className="mt-4">
              <DonutChart data={sentiment} />
            </div>
          </section>
        )}

        {/* PRD 3.4.4 Call Outcomes - Horizontal bar: Successful, Failed, Appointments Booked, Transfers to Human */}
        {outcomes && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Call Outcomes
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Calls Successful, Failed, Appointments Booked, Transfers to Human.
            </p>
            <div className="mt-4">
              <HorizontalBarChart data={outcomes} />
            </div>
          </section>
        )}
      </div>

      {/* PRD 3.4.5 Average Metrics Table - Metric | Value | Trend (e.g. 3m 45s, ↑ 8%) */}
      {metrics && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-sm font-semibold text-slate-50">
            Average Metrics
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Avg Call Duration, Avg Response Time, Success Rate with trend.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2 pr-4">Value</th>
                  <th className="py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800/80">
                  <td className="py-3 pr-4 font-medium">Avg Call Duration</td>
                  <td className="py-3 pr-4">
                    {formatDurationShort(metrics.avg_call_duration_seconds ?? 0)}
                  </td>
                  <td className="py-3">
                    {metrics.trends?.avg_duration ? (
                      <span
                        className={
                          metrics.trends.avg_duration.positive
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {metrics.trends.avg_duration.change_percent >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(metrics.trends.avg_duration.change_percent)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-800/80">
                  <td className="py-3 pr-4 font-medium">Avg Response Time</td>
                  <td className="py-3 pr-4">
                    {(metrics.avg_response_time_seconds ?? 0).toFixed(1)}s
                  </td>
                  <td className="py-3">
                    {metrics.trends?.avg_response_time ? (
                      <span
                        className={
                          metrics.trends.avg_response_time.positive
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {metrics.trends.avg_response_time.change_percent >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(metrics.trends.avg_response_time.change_percent)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Success Rate</td>
                  <td className="py-3 pr-4">
                    {((metrics.success_rate ?? 0) * 100).toFixed(0)}%
                  </td>
                  <td className="py-3">
                    {metrics.trends?.success_rate ? (
                      <span
                        className={
                          metrics.trends.success_rate.positive
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }
                      >
                        {metrics.trends.success_rate.change_percent >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(metrics.trends.success_rate.change_percent)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
