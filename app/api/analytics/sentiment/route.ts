import { NextRequest, NextResponse } from "next/server";
import type { AnalyticsSentiment } from "../../../lib/types";

/**
 * GET /api/analytics/sentiment?start_date=2026-01-01&end_date=2026-01-31
 * PRD 3.4.3 - Sentiment distribution. In production: aggregate from call_records + auth.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  // Stub: replace with real aggregation
  const total = 247;
  const positive = 142;
  const neutral = 78;
  const negative = 27;

  const data: AnalyticsSentiment = {
    positive: { count: positive, percentage: (positive / total) * 100 },
    neutral: { count: neutral, percentage: (neutral / total) * 100 },
    negative: { count: negative, percentage: (negative / total) * 100 },
  };
  return NextResponse.json(data);
}
