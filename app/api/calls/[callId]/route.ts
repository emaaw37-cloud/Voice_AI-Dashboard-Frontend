import { NextRequest, NextResponse } from "next/server";
import type { CallDetail } from "../../../lib/types";

/**
 * GET /api/calls/:callId
 * PRD 3.2.2, 3.3 - Single call detail. In production: query call_records + auth.
 * NOTE: This is a stub route. Real data comes from Firebase backend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { callId } = await params;
  if (!callId) {
    return NextResponse.json({ error: "callId required" }, { status: 400 });
  }

  // Stub: replace with DB/Retell lookup (PRD 3.3 - transcript_object with words for click-to-seek)
  const call: CallDetail = {
    // New format properties
    id: callId,
    agentId: "agent_001",
    agentName: "Sassle AI Agent",
    dynamicVariables: null,
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3600000 + 202000).toISOString(),
    durationSeconds: 202,
    direction: "inbound",
    status: "ended",
    recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    transcriptText: "Agent: Hi, this is calling from Sassle AI. How can I help you today?\nCustomer: Yes, I'm interested in learning more about your services.\nAgent: Great! I'd be happy to help. What's the best time to schedule a consultation?",
    callAnalysis: {
      userSentiment: "Positive",
      callSuccessful: true,
      callSummary: "Customer inquiry about services",
      inVoicemail: false,
    },
    costUsd: 0.56,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    
    // Legacy format properties for backward compatibility
    call_id: callId,
    phone_number: "+15551234567",
    start_timestamp: new Date(Date.now() - 3600000).toISOString(),
    end_timestamp: new Date(Date.now() - 3600000 + 202000).toISOString(),
    duration_ms: 202000,
    recording_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    user_sentiment: "Positive",
    call_successful: true,
    transcript: "Agent: Hi, this is calling from Sassle AI. How can I help you today?\nCustomer: Yes, I'm interested in learning more about your services.\nAgent: Great! I'd be happy to help. What's the best time to schedule a consultation?",
    transcript_object: [
      {
        role: "agent",
        content: "Hi, this is calling from Sassle AI. How can I help you today?",
        words: [
          { word: "Hi", start: 0.5, end: 0.7 },
          { word: "this", start: 0.8, end: 1.0 },
          { word: "is", start: 1.1, end: 1.2 },
          { word: "calling", start: 1.3, end: 1.6 },
          { word: "from", start: 1.7, end: 1.9 },
          { word: "Sassle", start: 2.0, end: 2.3 },
          { word: "AI.", start: 2.4, end: 2.6 },
          { word: "How", start: 2.7, end: 2.9 },
          { word: "can", start: 3.0, end: 3.1 },
          { word: "I", start: 3.2, end: 3.3 },
          { word: "help", start: 3.4, end: 3.6 },
          { word: "you", start: 3.7, end: 3.9 },
          { word: "today?", start: 4.0, end: 4.5 },
        ],
      },
      {
        role: "user",
        content: "Yes, I'm interested in learning more about your hair restoration services.",
        words: [
          { word: "Yes,", start: 5.0, end: 5.3 },
          { word: "I'm", start: 5.4, end: 5.6 },
          { word: "interested", start: 5.7, end: 6.2 },
          { word: "in", start: 6.3, end: 6.4 },
          { word: "learning", start: 6.5, end: 6.9 },
          { word: "more", start: 7.0, end: 7.2 },
          { word: "about", start: 7.3, end: 7.6 },
          { word: "your", start: 7.7, end: 7.9 },
          { word: "services.", start: 8.9, end: 9.4 },
        ],
      },
      {
        role: "agent",
        content: "Great! I'd be happy to help. What's the best time to schedule a consultation?",
        words: [
          { word: "Great!", start: 10.0, end: 10.4 },
          { word: "I'd", start: 10.5, end: 10.7 },
          { word: "be", start: 10.8, end: 11.0 },
          { word: "happy", start: 11.1, end: 11.5 },
          { word: "to", start: 11.6, end: 11.7 },
          { word: "help.", start: 11.8, end: 12.2 },
          { word: "consultation?", start: 14.7, end: 15.3 },
        ],
      },
    ],
    transcriptSegments: [
      {
        role: "agent",
        content: "Hi, this is calling from Sassle AI. How can I help you today?",
      },
      {
        role: "user",
        content: "Yes, I'm interested in learning more about your services.",
      },
      {
        role: "agent",
        content: "Great! I'd be happy to help. What's the best time to schedule a consultation?",
      },
    ],
    call_cost: {
      products: [
        { product: "voice_minutes", cost: 0.5 },
        { product: "llm_tokens", cost: 0.06 },
      ],
      total: 0.56,
    },
    call_cost_cents: 56,
  };

  return NextResponse.json(call);
}
