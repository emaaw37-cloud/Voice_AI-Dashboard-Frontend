import { NextRequest, NextResponse } from "next/server";
import type { CallsListResponse } from "../../lib/types";

/**
 * GET /api/calls?page=1&limit=20&sort=desc
 * PRD 3.2.2 - Paginated call list. In production: query call_records + auth.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  // Stub: replace with DB query and Retell sync (PRD 3.2.2 - last 20 calls)
  const total_calls = 247;
  const total_pages = Math.ceil(total_calls / limit);
  const calls = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    call_id: `retell_abc${String(i + 1).padStart(3, "0")}`,
    start_timestamp: new Date(Date.now() - i * 3600000 - i * 60000).toISOString(),
    phone_number: `+1 (555) ${String(100 + (i % 10)).padStart(3, "0")}-${String(4000 + i).padStart(4, "0")}`,
    duration_ms: (120 + i * 22) * 1000,
    call_status: i === 1 || i === 5 ? "failed" : "ended",
    user_sentiment: (["Positive", "Neutral", "Negative"] as const)[i % 3],
    recording_url: i !== 1 && i !== 5 ? "https://example.com/recording.mp3" : undefined,
    call_successful: i !== 1 && i !== 5,
    direction: (i % 2 === 0 ? "inbound" : "outbound") as "inbound" | "outbound",
    call_cost_cents: 45 + i * 5,
  }));

  const data: CallsListResponse = {
    calls,
    pagination: {
      current_page: page,
      total_pages,
      total_calls,
    },
  };
  return NextResponse.json(data);
}
