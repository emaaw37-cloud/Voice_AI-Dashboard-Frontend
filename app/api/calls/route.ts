import { NextRequest, NextResponse } from "next/server";
import type { CallsListResponse, CallRecord } from "../../lib/types";

/**
 * GET /api/calls?page=1&limit=20&sort=desc
 * PRD 3.2.2 - Paginated call list. In production: query call_records + auth.
 * NOTE: This is a stub route. Real data comes from Firebase backend.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  // Stub: replace with DB query and Retell sync (PRD 3.2.2 - last 20 calls)
  const total_calls = 247;
  const total_pages = Math.ceil(total_calls / limit);
  
  const calls: CallRecord[] = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
    id: `retell_abc${String(i + 1).padStart(3, "0")}`,
    agentId: `agent_${i % 3}`,
    agentName: `Agent ${i % 3}`,
    dynamicVariables: null,
    startTime: new Date(Date.now() - i * 3600000 - i * 60000).toISOString(),
    endTime: new Date(Date.now() - i * 3600000).toISOString(),
    durationSeconds: 120 + i * 22,
    direction: (i % 2 === 0 ? "inbound" : "outbound") as "inbound" | "outbound",
    status: i === 1 || i === 5 ? "failed" : "ended",
    recordingUrl: i !== 1 && i !== 5 ? "https://example.com/recording.mp3" : null,
    transcriptText: null,
    callAnalysis: {
      userSentiment: (["Positive", "Neutral", "Negative"] as const)[i % 3],
      callSuccessful: i !== 1 && i !== 5,
      callSummary: null,
      inVoicemail: false,
    },
    costUsd: (45 + i * 5) / 100,
    createdAt: new Date(Date.now() - i * 3600000 - i * 60000).toISOString(),
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
