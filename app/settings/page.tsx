"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Loader } from "../components/Loader";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  // Profile Settings
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Billing Settings
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setContactEmail(user.email || "");
      setBusinessName(user.displayName || "");
    }
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    setProfileSaved(false);

    try {
      // In a real implementation, you would save to Firestore here
      // For now, we'll just simulate a save
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <Loader />
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Simple header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              ← Back
            </button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="space-y-6">
          {/* Account Info */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Account Information
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Email</span>
                <span className="text-sm text-slate-200">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Role</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  profile?.role === "admin" 
                    ? "bg-purple-500/20 text-purple-300" 
                    : "bg-slate-500/20 text-slate-300"
                }`}>
                  {profile?.role || "user"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Account Status</span>
                <span className="text-sm text-green-400">Active</span>
              </div>
            </div>
          </section>

          {/* Profile Settings */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Profile Settings
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Update your business and contact information.
            </p>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Business Name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {profileSaved && (
              <p className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-2 text-xs text-emerald-200">
                Profile saved successfully.
              </p>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving}
                className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </section>

          {/* Billing Settings */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Billing Settings
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configure autopay and billing preferences.
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Autopay
                  </div>
                  <div className="text-xs text-slate-400">
                    Automatically charge payment method when invoice is generated
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autopayEnabled}
                    onChange={(e) => setAutopayEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-500 peer-checked:after:translate-x-full" />
                </label>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-200">
                  Payment Method
                </div>
                <a
                  href="https://fanbasis.com/payment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-sky-400 hover:underline"
                >
                  Link to update card on Fanbasis
                </a>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="mt-2 w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
                  placeholder="Invoices sent to this address"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Email address for invoices (default: account email)
                </p>
              </div>
            </div>
          </section>

          {/* API Keys Info (for regular users) */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              API Configuration
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              API keys (Retell, OpenRouter) are managed by your administrator.
              <br />
              Contact your admin if you need to update API configurations.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
