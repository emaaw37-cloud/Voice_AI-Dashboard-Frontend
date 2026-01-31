import { NextResponse } from "next/server";
import type { DashboardOverview } from "../../../lib/types";

/**
 * GET /api/dashboard/overview
 * PRD 3.2.1 - Key metrics for dashboard home. In production: aggregate from Retell/OpenRouter + Redis cache.
 */
export async function GET() {
  // Stub: replace with real aggregation and auth (user_id from session)
  const data: DashboardOverview = {
    total_calls_this_month: 247,
    total_calls_last_month: 220,
    success_rate: 0.82,
    avg_duration_seconds: 225,
    avg_duration_last_month_seconds: 237,
    sparkline_data: [45, 52, 61, 58, 49, 55, 62, 58, 51, 48, 54, 59, 63, 57, 52, 50, 56, 60, 58, 55, 52, 59, 61, 57, 53, 49, 55, 58, 62, 59],
    current_month_cost: {
      dashboard_fee: 49,
      retell_cost: 187.12,
      openrouter_cost: 24.5,
      total: 260.62,
    },
    last_month_cost_total: 245.3,
  };
  return NextResponse.json(data);
}
