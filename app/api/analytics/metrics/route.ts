import { NextRequest, NextResponse } from "next/server";
import type { AnalyticsMetrics } from "../../../lib/types";

/**
 * GET /api/analytics/metrics?start_date=2026-01-01&end_date=2026-01-31
 * PRD 3.4.5 - Average metrics table. In production: calculate from call_records + auth.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  // Stub: replace with real calculations
  const data: AnalyticsMetrics = {
    avg_call_duration_seconds: 225,
    avg_response_time_seconds: 1.2,
    success_rate: 0.82,
    trends: {
      avg_duration: { change_percent: 8, positive: true },
      avg_response_time: { change_percent: -15, positive: true },
      success_rate: { change_percent: 3, positive: true },
    },
  };
  return NextResponse.json(data);
}
