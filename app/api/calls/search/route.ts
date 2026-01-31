import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/calls/search?q=interested&call_id=abc123
 * PRD 3.3.3 - Full-text transcript search. Returns matching segments with context.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");
  const callId = searchParams.get("call_id");

  if (!q || !callId) {
    return NextResponse.json(
      { error: "q and call_id are required" },
      { status: 400 }
    );
  }

  // Stub: in production query transcript_object for call_id and match q
  const matches = [
    {
      segment_index: 1,
      role: "user",
      content: "Yes, I'm interested in learning more about your hair restoration services.",
      timestamp: 5.7,
      highlight: `I'm <mark>interested</mark> in learning`,
    },
  ].filter((m) => m.content.toLowerCase().includes(q.toLowerCase()));

  return NextResponse.json({ matches });
}
