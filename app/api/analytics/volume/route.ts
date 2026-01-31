import { NextRequest, NextResponse } from "next/server";
import type { AnalyticsVolume } from "../../../lib/types";

/**
 * GET /api/analytics/volume?start_date=2026-01-01&end_date=2026-01-31
 * PRD 3.4.2 - Call volume chart data. In production: aggregate from call_records + auth.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endDate = searchParams.get("end_date") ?? new Date().toISOString().slice(0, 10);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const granularity: "daily" | "weekly" = daysDiff > 90 ? "weekly" : "daily";

  // Stub: generate sample data
  const data: AnalyticsVolume["data"] = [];
  const step = granularity === "daily" ? 1 : 7;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
    data.push({
      date: d.toISOString().slice(0, 10),
      calls: 40 + Math.floor(Math.random() * 30),
    });
  }

  const result: AnalyticsVolume = { data, granularity };
  return NextResponse.json(result);
}
