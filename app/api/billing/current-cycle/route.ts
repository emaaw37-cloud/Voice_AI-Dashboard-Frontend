import { NextResponse } from "next/server";
import type { BillingCurrentCycle } from "../../../lib/types";

/**
 * GET /api/billing/current-cycle
 * PRD 3.5.1 - Current billing period usage and projected cost. In production: auth + Fanbasis.
 */
export async function GET() {
  const now = new Date();
  const period_end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const period_start = new Date(now.getFullYear(), now.getMonth(), 1);
  const invoice_date = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const days_remaining = Math.max(0, period_end.getDate() - now.getDate());

  const data: BillingCurrentCycle = {
    cycle_number: (now.getFullYear() - 2026) * 12 + now.getMonth() + 1,
    period_start: period_start.toISOString().slice(0, 10),
    period_end: period_end.toISOString().slice(0, 10),
    days_remaining,
    usage: {
      retell_minutes: 1247.5,
      retell_cost_usd: 187.12,
      openrouter_tokens: 2400000,
      openrouter_cost_usd: 24.5,
    },
    costs: {
      dashboard_fee: 49,
      retell_passthrough: 187.12,
      openrouter_passthrough: 24.5,
      total_projected: 260.62,
    },
    invoice_date: invoice_date.toISOString().slice(0, 10),
  };
  return NextResponse.json(data);
}
