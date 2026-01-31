import { NextResponse } from "next/server";
import type { Invoice } from "../../../lib/types";

/**
 * GET /api/billing/invoices
 * PRD 3.5.3 - Past invoices. In production: auth + Fanbasis payment status.
 */
export async function GET() {
  // Stub: replace with DB query by user_id
  const invoices: Invoice[] = [
    {
      id: "inv_1",
      user_id: "user_1",
      cycle_number: 2,
      period_start: "2025-12-01",
      period_end: "2025-12-31",
      total_amount: 245.3,
      payment_status: "paid",
      paid_at: "2026-01-02T12:00:00Z",
      dashboard_fee: 49,
      retell_cost: 171.8,
      openrouter_cost: 24.5,
      fanbasis_payment_link: "https://fanbasis.com/invoices/inv_1",
    },
    {
      id: "inv_2",
      user_id: "user_1",
      cycle_number: 1,
      period_start: "2025-11-01",
      period_end: "2025-11-30",
      total_amount: 198.5,
      payment_status: "paid",
      paid_at: "2025-12-01T10:00:00Z",
      dashboard_fee: 49,
      retell_cost: 125,
      openrouter_cost: 24.5,
      fanbasis_payment_link: "https://fanbasis.com/invoices/inv_2",
    },
  ];
  return NextResponse.json(invoices);
}
