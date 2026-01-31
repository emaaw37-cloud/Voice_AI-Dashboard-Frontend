"use client";

import { useState } from "react";

type Tab = "users" | "tickets" | "billing";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin Panel
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage users, API keys, and support tickets.
            </p>
          </div>
          <nav className="flex gap-2 rounded-full bg-slate-900/80 p-1 text-xs">
            {[
              { id: "users", label: "Users" },
              { id: "tickets", label: "Tickets" },
              { id: "billing", label: "Billing" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as Tab)}
                className={`rounded-full px-4 py-1.5 ${
                  tab === t.id
                    ? "bg-sky-500 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {tab === "users" ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Users & API Keys
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Example management view. Wire this to Firestore when ready.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Retell Key</th>
                    <th className="py-2 pr-4">OpenRouter Key</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/80">
                    <td className="py-3 pr-4">
                      <div className="font-medium">demo@user.com</div>
                      <div className="text-[11px] text-slate-500">UID1234</div>
                    </td>
                    <td className="py-3 pr-4">
                      <select className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs">
                        <option>user</option>
                        <option>admin</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">sk_retell_••••</td>
                    <td className="py-3 pr-4 text-slate-400">
                      sk_openrouter_••••
                    </td>
                    <td className="py-3">
                      <button className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-100 hover:bg-slate-700">
                        Edit
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {tab === "tickets" ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Support Tickets
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              View and respond to escalated tickets from the support widget.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
              <div className="space-y-2">
                <button className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">TCK-demo-123</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                      escalated
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    demo@user.com • 2 messages
                  </div>
                </button>
              </div>
              <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
                <div className="mb-2 text-[11px] text-slate-400">
                  Ticket: <span className="font-medium">TCK-demo-123</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-900/80 p-2">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl bg-slate-800 px-3 py-2 text-[11px] text-slate-50">
                      User: “My calls are failing with error 500.”
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl bg-emerald-500/20 px-3 py-2 text-[11px] text-emerald-100">
                      AI: “We’re looking into this issue. Can you confirm if it
                      happens for all numbers?”
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    placeholder="Reply as admin..."
                    className="flex-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 outline-none placeholder:text-slate-500"
                  />
                  <button className="rounded-full bg-sky-500 px-3 py-2 text-[11px] font-medium text-slate-950">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "billing" ? (
          <section className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Billing & Invoices
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Overview of invoices generated per user. Hook this into your
              Fanbasis integration.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Invoice</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/80">
                    <td className="py-3 pr-4">demo@user.com</td>
                    <td className="py-3 pr-4">Sassle_Invoice_001_24th_Jan_2026</td>
                    <td className="py-3 pr-4">$29.00</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300">
                        paid
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-100 hover:bg-slate-700">
                        Download
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

