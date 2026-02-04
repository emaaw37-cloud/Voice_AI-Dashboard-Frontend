"use client";

import { useState } from "react";
import { createUserByAdmin } from "@/app/services/adminService";

type Tab = "users" | "tickets" | "billing";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [loading, setLoading] = useState(false);

  async function handleCreateUser() {
    try {
      setLoading(true);
      const res = await createUserByAdmin({
        email: "testuser@example.com",
        password: "Password@123",
        role: "user",
      });
      alert("✅ User created successfully");
      console.log(res);
    } catch (err) {
      alert("❌ " + String(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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

        {tab === "users" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Users
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Admin user management (live backend).
                </p>
              </div>

              {/* 🔥 TEST BUTTON */}
              <button
                onClick={handleCreateUser}
                disabled={loading}
                className="rounded-full bg-sky-500 px-4 py-2 text-xs font-medium text-slate-950 disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create User (TEST)"}
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800/80">
                    <td className="py-3 pr-4">
                      <div className="font-medium">demo@user.com</div>
                      <div className="text-[11px] text-slate-500">UID1234</div>
                    </td>
                    <td className="py-3 pr-4">user</td>
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
        )}

        {tab === "tickets" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            Tickets coming soon
          </section>
        )}

        {tab === "billing" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            Billing coming soon
          </section>
        )}
      </div>
    </main>
  );
}
