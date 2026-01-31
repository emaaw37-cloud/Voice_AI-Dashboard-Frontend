import { NextRequest, NextResponse } from "next/server";
import type { AnalyticsOutcomes } from "../../../lib/types";

/**
 * GET /api/analytics/outcomes?start_date=2026-01-01&end_date=2026-01-31
 * PRD 3.4.4 - Call outcomes. In production: aggregate from call_records + auth.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  // Stub: replace with real aggregation
  const data: AnalyticsOutcomes = {
    successful: 215,
    failed: 32,
    appointments_booked: 47,
    transfers_to_human: 12,
  };
  return NextResponse.json(data);
}
