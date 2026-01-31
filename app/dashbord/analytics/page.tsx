"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { formatDurationShort } from "../../lib/functions";
import type {
  AnalyticsVolume,
  AnalyticsSentiment,
  AnalyticsOutcomes,
  AnalyticsMetrics,
} from "../../lib/types";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL_BASE || "";

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
  const [volume, setVolume] = useState<AnalyticsVolume | null>(null);
  const [sentiment, setSentiment] = useState<AnalyticsSentiment | null>(null);
  const [outcomes, setOutcomes] = useState<AnalyticsOutcomes | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(
    () => getDateRange(dateRange, customStart, customEnd),
    [dateRange, customStart, customEnd]
  );

  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    if (!auth) {
      setUserReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => setUserReady(!!u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userReady || !BACKEND_BASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const user = auth?.currentUser;
        if (!user || cancelled) return;
        const token = await user.getIdToken();
        if (cancelled) return;
        const q = `start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
        const [volRes, sentRes, outRes, metRes] = await Promise.all([
          fetch(`${BACKEND_BASE}/getAnalyticsVolume?${q}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${BACKEND_BASE}/getAnalyticsSentiment?${q}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${BACKEND_BASE}/getAnalyticsOutcomes?${q}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${BACKEND_BASE}/getAnalyticsMetrics?${q}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);
        if (cancelled) return;
        const [v, s, o, m] = await Promise.all([
          volRes.ok ? volRes.json() : null,
          sentRes.ok ? sentRes.json() : null,
          outRes.ok ? outRes.json() : null,
          metRes.ok ? metRes.json() : null,
        ]);
        if (cancelled) return;
        setVolume(v ?? null);
        setSentiment(s ?? null);
        setOutcomes(o ?? null);
        setMetrics(m ?? null);
        if (!volRes.ok) console.error("getAnalyticsVolume failed", volRes.status, await volRes.text());
        if (!sentRes.ok) console.error("getAnalyticsSentiment failed", sentRes.status, await sentRes.text());
        if (!outRes.ok) console.error("getAnalyticsOutcomes failed", outRes.status, await outRes.text());
        if (!metRes.ok) console.error("getAnalyticsMetrics failed", metRes.status, await metRes.text());
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setVolume(null);
          setSentiment(null);
          setOutcomes(null);
          setMetrics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userReady, start, end]);

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
                    {formatDurationShort(metrics.avg_call_duration_seconds)}
                  </td>
                  <td className="py-3">
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
                  </td>
                </tr>
                <tr className="border-b border-slate-800/80">
                  <td className="py-3 pr-4 font-medium">Avg Response Time</td>
                  <td className="py-3 pr-4">
                    {metrics.avg_response_time_seconds.toFixed(1)}s
                  </td>
                  <td className="py-3">
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
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium">Success Rate</td>
                  <td className="py-3 pr-4">
                    {(metrics.success_rate * 100).toFixed(0)}%
                  </td>
                  <td className="py-3">
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
