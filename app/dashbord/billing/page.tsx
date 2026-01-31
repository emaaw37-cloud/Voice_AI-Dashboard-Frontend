"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { formatUSD } from "../../lib/functions";
import type { BillingCurrentCycle, Invoice } from "../../lib/types";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL_BASE || "";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startFormatted = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endFormatted = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFormatted} - ${endFormatted}`;
}

/** PRD 3.5.3 - Billing period column e.g. "Dec 1-31, 2025" */
function formatBillingPeriodShort(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startPart = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endPart = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startPart}-${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function getStatusBadge(status: Invoice["payment_status"]) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
          💳 Paid
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
          ⏳ Pending
        </span>
      );
    case "overdue":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300">
          ❌ Overdue
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300">
          ❌ Failed
        </span>
      );
    default:
      return null;
  }
}

export default function BillingPage() {
  const [currentCycle, setCurrentCycle] = useState<BillingCurrentCycle | null>(
    null
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !BACKEND_BASE) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const [cycleRes, invoicesRes] = await Promise.all([
          fetch(`${BACKEND_BASE}/getBillingCurrentCycle`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${BACKEND_BASE}/getInvoices`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);
        if (cycleRes.ok) {
          const data = (await cycleRes.json()) as BillingCurrentCycle;
          setCurrentCycle(data);
        } else {
          console.error("getBillingCurrentCycle failed", cycleRes.status, await cycleRes.text());
          setCurrentCycle(null);
        }
        if (invoicesRes.ok) {
          const data = (await invoicesRes.json()) as Invoice[];
          setInvoices(data);
        } else {
          console.error("getInvoices failed", invoicesRes.status, await invoicesRes.text());
          setInvoices([]);
        }
      } catch (e) {
        console.error(e);
        setCurrentCycle(null);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Loading billing information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Billing Cycle - PRD 3.5.1 */}
      {currentCycle && (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-50">
              Current Billing Cycle
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Billing period: Month #{currentCycle.cycle_number} (
              {formatPeriod(
                currentCycle.period_start,
                currentCycle.period_end
              )}
              )
            </p>
          </div>

          {/* Usage Meters */}
          <div className="space-y-4">
            {/* Retell Minutes */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-300">Retell Minutes</span>
                <span className="font-medium text-slate-50">
                  {currentCycle.usage.retell_minutes.toFixed(1)} minutes
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{
                    width: `${Math.min(
                      (currentCycle.usage.retell_minutes / 5000) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Estimated monthly total: ~5,000 minutes
              </div>
            </div>

            {/* OpenRouter Tokens */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-slate-300">OpenRouter Tokens</span>
                <span className="font-medium text-slate-50">
                  {currentCycle.usage.openrouter_tokens.toLocaleString()}{" "}
                  tokens
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      (currentCycle.usage.openrouter_tokens / 5000000) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Estimated monthly total: ~5M tokens
              </div>
            </div>
          </div>

          {/* Cost Breakdown - PRD 3.5.1: Dashboard Fee (fixed), Retell/OpenRouter (live calculation), Projected Total */}
          <div className="mt-6 rounded-2xl bg-slate-950/70 p-4">
            <h3 className="mb-3 text-xs font-semibold text-slate-300">
              Cost Breakdown
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dashboard Fee (fixed)</span>
                <span className="font-medium text-slate-50">
                  {formatUSD(currentCycle.costs.dashboard_fee)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Retell Cost (live calculation)</span>
                <span className="font-medium text-slate-50">
                  {formatUSD(currentCycle.costs.retell_passthrough)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">OpenRouter Cost (live calculation)</span>
                <span className="font-medium text-slate-50">
                  {formatUSD(currentCycle.costs.openrouter_passthrough)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="font-semibold text-slate-50">
                  Projected Total
                </span>
                <span className="text-lg font-bold text-slate-50">
                  {formatUSD(currentCycle.costs.total_projected)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice date - PRD 3.5.1 */}
          <div className="mt-4 text-xs text-slate-400">
            Invoice will be generated on{" "}
            <span className="font-medium text-slate-300">
              {formatDate(currentCycle.invoice_date)}
            </span>
            {currentCycle.days_remaining > 0 && (
              <span className="ml-2">
                ({currentCycle.days_remaining} days remaining)
              </span>
            )}
          </div>
        </section>
      )}

      {/* PRD 3.5.2 Autopay Toggle - Enable Autopay checkbox, Update Payment Method link, warning when enabled */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-50">
              Autopay
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              When enabled, automatically charge your payment method on file when each invoice is generated.
            </p>
            {autopayEnabled && currentCycle && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⚠️ Your card will be charged on {formatDate(currentCycle.invoice_date)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={autopayEnabled}
                onChange={(e) => setAutopayEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-700 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-sky-500 peer-focus:ring-offset-2 peer-focus:ring-offset-slate-900" />
              <span className="text-xs font-medium text-slate-300">
                Enable Autopay
              </span>
            </label>
          </div>
        </div>
        <div className="mt-4">
          <a
            href="https://fanbasis.com/payment"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700"
          >
            Update Payment Method
          </a>
        </div>
      </section>

      {/* PRD 3.5.3 Past Invoices Table - Month #, Billing Period (Dec 1-31 2025), Amount, Status (💳 Paid, ⏳ Pending, ❌ Overdue), Actions (View Invoice, Download PDF) */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-50">Past Invoices</h2>
          <p className="mt-1 text-xs text-slate-400">
            Month number, billing period, amount, status. View or download PDF.
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No invoices yet. Invoices will appear here after your first billing cycle.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Billing Period</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-800/80 last:border-b-0"
                  >
                    <td className="py-3 pr-4 font-medium">
                      Month #{inv.cycle_number}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatBillingPeriodShort(inv.period_start, inv.period_end)}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-50">
                      {formatUSD(inv.total_amount)}
                    </td>
                    <td className="py-3 pr-4">{getStatusBadge(inv.payment_status)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {inv.fanbasis_payment_link ? (
                          <a
                            href={inv.fanbasis_payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                          >
                            View
                          </a>
                        ) : (
                          <span className="rounded-xl bg-slate-800/50 px-3 py-1.5 text-xs text-slate-500">
                            View
                          </span>
                        )}
                        <button
                          type="button"
                          className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                          onClick={() => {
                            // In production: Firebase Function getInvoicePdf or generate client-side
                            console.log("Download PDF for invoice", inv.id);
                          }}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
