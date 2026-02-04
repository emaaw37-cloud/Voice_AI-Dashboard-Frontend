"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { callBackend } from "@/services/backend";
import {
  formatSeconds,
  formatUSD,
  formatDurationShort,
} from "../../../lib/functions";
import { WaveformPlayer, type WaveformPlayerHandle } from "../../../components/WaveformPlayer";
import type { CallDetail, TranscriptSegment } from "../../../lib/types";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatSegmentTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallDetailPage() {
  const params = useParams();
  const callId = params.callId as string;
  const [call, setCall] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const waveformRef = useRef<WaveformPlayerHandle | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!callId) {
      setLoading(false);
      return;
    }
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCall(null);
        setLoading(false);
        return;
      }
      try {
        const data = (await callBackend(
          `getCall?call_id=${encodeURIComponent(callId)}`,
          { method: "GET" }
        )) as CallDetail;
        setCall(data);
      } catch (e) {
        console.error(e);
        setCall(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [callId]);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  const handleTranscriptClick = useCallback((timestamp: number) => {
    const ws = waveformRef.current;
    if (!ws) return;
    const duration = ws.getDuration();
    if (duration > 0) {
      ws.seekToProgress(timestamp / duration);
    }
  }, []);

  const copyCallId = useCallback(() => {
    if (!callId) return;
    navigator.clipboard.writeText(callId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [callId]);

  const fullTranscriptText = useMemo(() => {
    if (!call?.transcript_object?.length) return call?.transcript ?? "";
    return call.transcript_object
      .map(
        (s: TranscriptSegment) =>
          `${s.role === "agent" ? "Agent" : "Customer"}: ${s.content}`
      )
      .join("\n\n");
  }, [call]);

  const copyTranscript = useCallback(() => {
    if (!fullTranscriptText) return;
    navigator.clipboard.writeText(fullTranscriptText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  }, [fullTranscriptText]);

  const filteredSegments = useMemo(() => {
    if (!call?.transcript_object) return [];
    const q = transcriptSearch.trim().toLowerCase();
    if (!q) return call.transcript_object;
    return call.transcript_object.filter((s: TranscriptSegment) =>
      s.content.toLowerCase().includes(q)
    );
  }, [call?.transcript_object, transcriptSearch]);

  const highlightContent = useCallback(
    (content: string) => {
      const q = transcriptSearch.trim();
      if (!q) return content;
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      return content.replace(re, "<mark class='bg-amber-500/30 text-amber-200 rounded'>$1</mark>");
    },
    [transcriptSearch]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading call…</div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-4">
        <p className="text-slate-400">Call not found.</p>
        <Link
          href="/dashbord"
          className="text-sky-400 underline hover:no-underline"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const durationSec = call.duration_ms 
    ? Math.floor(call.duration_ms / 1000) 
    : call.durationSeconds ?? 0;
  const costTotal = call.call_cost?.total ?? (call.call_cost_cents ? call.call_cost_cents / 100 : 0);
  const costBreakdown =
    call.call_cost?.products?.length
      ? call.call_cost.products
          .map((p: { product: string; cost: number }) =>
            p.product === "voice_minutes"
              ? `Retell: ${formatUSD(p.cost)}`
              : p.product === "llm_tokens"
              ? `LLM: ${formatUSD(p.cost)}`
              : `${p.product}: ${formatUSD(p.cost)}`
          )
          .join(", ")
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashbord"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* PRD 3.3.1 Call Metadata Section */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
        <h2 className="text-sm font-semibold text-slate-50">Call Details</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-400">{call.call_id}</span>
          <button
            type="button"
            onClick={copyCallId}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            {copiedId ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">📞</span>
            <a
              href={`tel:${call.phone_number ?? ""}`}
              className="font-medium text-sky-400 hover:underline"
            >
              {formatPhone(call.phone_number ?? "Unknown")}
            </a>
            <span className="text-slate-500">→</span>
            <span className="text-slate-300 capitalize">
              {call.direction ?? "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">📅</span>
            <span className="text-slate-200">
              {formatDateTime(call.start_timestamp ?? call.startTime)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">⏱️</span>
            <span className="text-slate-200">
              {formatDurationShort(durationSec)} ({durationSec} seconds)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">😊</span>
            <span className="text-slate-200">
              Sentiment:{" "}
              {call.user_sentiment === "Positive"
                ? "😊 Positive"
                : call.user_sentiment === "Neutral"
                ? "😐 Neutral"
                : "😞 Negative"}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-200">
              {call.call_successful ? "✅ Successful" : "❌ Failed"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">💰</span>
            <span className="text-slate-200">
              Cost: {formatUSD(costTotal)}
              {costBreakdown && ` (${costBreakdown})`}
            </span>
          </div>
        </div>
      </section>

      {/* PRD 3.3.2 Audio Player with Waveform */}
      {call.recording_url && (
        <section
          id="recording"
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40"
        >
          <h2 className="text-sm font-semibold text-slate-50">
            Recording
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Play/pause, seek, speed (0.5x–2x), download.
          </p>
          <div className="mt-4">
            <WaveformPlayer
              url={call.recording_url}
              onTimeUpdate={handleTimeUpdate}
              height={80}
              waveColor="#4ADE80"
              progressColor="#60A5FA"
              playerRef={waveformRef}
            />
          </div>
        </section>
      )}

      {/* PRD 3.3.3 Transcript Display */}
      <section
        id="transcript"
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-50">Transcript</h2>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search…"
              value={transcriptSearch}
              onChange={(e) => setTranscriptSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={copyTranscript}
              className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              {copiedTranscript ? "Copied!" : "Copy transcript"}
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Click a sentence to jump audio to that timestamp.
        </p>

        <div className="mt-4 max-h-[480px] space-y-4 overflow-y-auto pr-2">
          {call.transcript_object?.length ? (
            (transcriptSearch.trim() ? filteredSegments : call.transcript_object).map(
              (segment: TranscriptSegment, idx: number) => {
                const startTime = segment.words?.[0]?.start ?? 0;
                const isAgent = segment.role === "agent";
                const isCurrent =
                  segment.words?.some(
                    (w) => currentTime >= w.start && currentTime <= w.end
                  ) ?? false;

                return (
                  <div
                    key={`${idx}-${startTime}`}
                    className={`rounded-xl border p-4 transition-colors ${
                      isCurrent
                        ? "border-sky-500/50 bg-sky-500/10"
                        : "border-slate-800 bg-slate-950/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleTranscriptClick(startTime)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <span className="text-lg">
                        {isAgent ? "🤖" : "👤"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-400">
                          {isAgent ? "Agent" : "Customer"} (
                          {formatSegmentTime(startTime)})
                        </div>
                        <div
                          className="mt-1 text-sm text-slate-200"
                          dangerouslySetInnerHTML={{
                            __html: highlightContent(segment.content),
                          }}
                        />
                      </div>
                    </button>
                  </div>
                );
              }
            )
          ) : call.transcript ? (
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-950/60 p-4 text-sm text-slate-200">
              {call.transcript}
            </pre>
          ) : (
            <p className="text-slate-500">No transcript available.</p>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </section>
    </div>
  );
}
