"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";

type Role = "user" | "ai" | "agent";

type Message = {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
};

type TicketStatus = "open" | "escalated" | "closed";

function loadMessages(ticketId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`support:${ticketId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return parsed;
  } catch {
    return [];
  }
}

function saveMessages(ticketId: string, messages: Message[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`support:${ticketId}`, JSON.stringify(messages));
}

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<TicketStatus>("open");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = auth?.currentUser?.uid ?? "anonymous";
    const existing = window.localStorage.getItem(`support:activeTicket:${uid}`);
    const id =
      existing ??
      `TCK-${uid.slice(0, 6) || "guest"}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    if (!existing) {
      window.localStorage.setItem(`support:activeTicket:${uid}`, id);
    }
    setTicketId(id);
    setMessages(loadMessages(id));
  }, []);

  useEffect(() => {
    if (!ticketId) return;
    saveMessages(ticketId, messages);
  }, [ticketId, messages]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !pending && status !== "closed",
    [input, pending, status]
  );

  function pushMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  async function handleSend() {
    if (!canSend || !ticketId) return;
    const text = input.trim();
    setInput("");
    const now = Date.now();
    pushMessage({
      id: `m-${now}`,
      role: "user",
      text,
      createdAt: now,
    });

    if (status === "escalated") {
      return;
    }

    setPending(true);
    // Placeholder AI reply; in production call your OpenRouter backend here.
    setTimeout(() => {
      const reply: Message = {
        id: `m-ai-${Date.now()}`,
        role: "ai",
        text:
          "Thanks for your message. This is a placeholder AI reply. In production this would come from your support model via OpenRouter.",
        createdAt: Date.now(),
      };
      pushMessage(reply);
      setPending(false);
    }, 800);
  }

  function escalate() {
    setStatus("escalated");
    const msg: Message = {
      id: `m-escalate-${Date.now()}`,
      role: "agent",
      text:
        "This ticket has been escalated to a human support agent. We will get back to you as soon as possible.",
      createdAt: Date.now(),
    };
    pushMessage(msg);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-sky-500 px-4 py-3 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
      >
        {open ? "Close support" : "Need help?"}
      </button>

      {open ? (
        <div className="fixed bottom-20 right-4 z-40 w-80 rounded-3xl border border-slate-800 bg-slate-950/95 p-4 text-slate-50 shadow-2xl shadow-slate-950/70 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Support</h2>
              <p className="text-xs text-slate-400">
                Ask a question and we’ll help you.
              </p>
            </div>
            <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] text-slate-400">
              Ticket {ticketId?.slice(0, 8)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Status:{" "}
              <span className="font-medium text-sky-300">{status}</span>
            </span>
            {status === "open" ? (
              <button
                type="button"
                onClick={escalate}
                className="rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-500/30"
              >
                Escalate to human
              </button>
            ) : null}
          </div>

          <div className="mt-3 h-52 space-y-2 overflow-y-auto rounded-2xl bg-slate-900/80 p-2 text-xs">
            {messages.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Start a conversation and we’ll keep the history here for you.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      "max-w-[80%] rounded-2xl px-3 py-2 " +
                      (m.role === "user"
                        ? "bg-sky-500 text-slate-950"
                        : m.role === "ai"
                        ? "bg-slate-800 text-slate-50"
                        : "bg-emerald-500/20 text-emerald-100")
                    }
                  >
                    <div className="text-[10px] opacity-70">
                      {m.role === "user"
                        ? "You"
                        : m.role === "ai"
                        ? "Assistant"
                        : "Support"}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug">
                      {m.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                status === "closed"
                  ? "Ticket is closed"
                  : "Type your question..."
              }
              disabled={status === "closed"}
              className="flex-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="rounded-full bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

