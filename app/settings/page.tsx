"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Topbar } from "../components/Topbar";
import { Loader } from "../components/Loader";
import type { UserProfile, KeyConnectionStatus } from "../lib/types";

function formatConnectedDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastSynced(iso: string | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

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

type ServiceName = "retell" | "openrouter";

export default function SettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Connected Services (PRD 3.6.1)
  const [retellStatus, setRetellStatus] = useState<KeyConnectionStatus | null>(null);
  const [openrouterStatus, setOpenrouterStatus] = useState<KeyConnectionStatus | null>(null);
  const [updateKeyService, setUpdateKeyService] = useState<ServiceName | null>(null);
  const [updateKeyValue, setUpdateKeyValue] = useState("");
  const [updateKeyValidating, setUpdateKeyValidating] = useState(false);
  const [updateKeyError, setUpdateKeyError] = useState<string | null>(null);
  const [disconnectService, setDisconnectService] = useState<ServiceName | null>(null);
  const [disconnectConfirming, setDisconnectConfirming] = useState(false);
  const [disconnectWarningShown, setDisconnectWarningShown] = useState(false);

  // Profile (PRD 3.6.2)
  const [profile, setProfile] = useState<Partial<UserProfile> | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Billing (PRD 3.6.3)
  const [autopayEnabled, setAutopayEnabled] = useState(false);
  const [billingEmail, setBillingEmail] = useState("");
  const [billingSaving, setBillingSaving] = useState(false);

  useEffect(() => {
    if (!auth) {
      setReady(true);
      router.replace("/login");
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setReady(true);
      setUser(u);
      if (!u) {
        router.replace("/login");
        return;
      }
    });
    return () => unsub();
  }, [router]);

  // Fetch key status and profile when user is ready (backend only — no /api/keys/store)
  useEffect(() => {
    if (!user?.uid) return;

    const fetchKeyStatus = async (service: ServiceName) => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/getApiKeyStatus?provider=${service}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) return (await res.json()) as KeyConnectionStatus;
      } catch (_) {
        /* backend may not expose getApiKeyStatus yet */
      }
      return { connected: false };
    };

    Promise.all([
      fetchKeyStatus("retell").then(setRetellStatus),
      fetchKeyStatus("openrouter").then(setOpenrouterStatus),
    ]).catch(console.error);

    fetch(`/api/profile?userId=${user.uid}`)
      .then((r) => r.json())
      .then((data: Partial<UserProfile>) => {
        setProfile(data);
        setBusinessName(data.business_name ?? "");
        setContactEmail(data.contact_email ?? data.email ?? user.email ?? "");
        setPhoneNumber(data.phone_number ?? "");
        setTimezone(data.timezone ?? "America/New_York");
        const billing = data.billing_email ?? data.email ?? user.email ?? "";
        setBillingEmail(billing);
        const autopay = data.autopay_enabled ?? false;
        setAutopayEnabled(autopay);
        prevBillingRef.current = { autopayEnabled: autopay, billingEmail: billing };
      })
      .catch(console.error);
  }, [user?.uid, user?.email]);

  async function refreshKeyStatus() {
    if (!user?.uid) return;
    const token = await user.getIdToken();
    const opts = { method: "GET" as const, headers: { Authorization: `Bearer ${token}` } };
    try {
      const [rRetell, rOpen] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/getApiKeyStatus?provider=retell`, opts),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/getApiKeyStatus?provider=openrouter`, opts),
      ]);
      if (rRetell.ok) setRetellStatus((await rRetell.json()) as KeyConnectionStatus);
      else setRetellStatus({ connected: false });
      if (rOpen.ok) setOpenrouterStatus((await rOpen.json()) as KeyConnectionStatus);
      else setOpenrouterStatus({ connected: false });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdateKey() {
    if (!user || !updateKeyService || !updateKeyValue.trim()) return;
    setUpdateKeyError(null);
    setUpdateKeyValidating(true);
    try {
      const body =
        updateKeyService === "retell"
          ? { retell_key: updateKeyValue.trim(), openrouter_key: "" }
          : { retell_key: "", openrouter_key: updateKeyValue.trim() };
      const validateRes = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await validateRes.json();
      const valid =
        updateKeyService === "retell"
          ? result.retell?.valid
          : result.openrouter?.valid;
      const err =
        updateKeyService === "retell"
          ? result.retell?.error
          : result.openrouter?.error;

      if (!valid) {
        setUpdateKeyError(err ?? "Validation failed");
        return;
      }

      const token = await user.getIdToken();
      const storeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/storeApiKey`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.uid,
            service: updateKeyService,
            apiKey: updateKeyValue.trim(),
          }),
        }
      );
      if (!storeRes.ok) {
        const data = await storeRes.json().catch(() => ({}));
        setUpdateKeyError(data.error ?? "Failed to save key");
        return;
      }
      setUpdateKeyService(null);
      setUpdateKeyValue("");
      refreshKeyStatus();
    } catch (e) {
      setUpdateKeyError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setUpdateKeyValidating(false);
    }
  }

  async function handleDisconnect() {
    if (!user || !disconnectService) return;
    setDisconnectConfirming(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/disconnectApiKey`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ userId: user.uid, service: disconnectService }),
        }
      );
      if (res.ok) {
        setDisconnectService(null);
        setDisconnectWarningShown(true);
        setTimeout(() => setDisconnectWarningShown(false), 8000);
        if (disconnectService === "retell") setRetellStatus({ connected: false });
        else setOpenrouterStatus({ connected: false });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDisconnectConfirming(false);
    }
  }

  async function saveProfile() {
    if (!user?.uid) return;
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          business_name: businessName.trim(),
          contact_email: contactEmail.trim(),
          phone_number: phoneNumber.trim(),
          timezone,
        }),
      });
      if (res.ok) setProfileSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveBilling() {
    if (!user?.uid) return;
    setBillingSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          autopay_enabled: autopayEnabled,
          billing_email: billingEmail.trim(),
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setBillingSaving(false);
    }
  }

  const prevBillingRef = useRef({ autopayEnabled: false, billingEmail: "" });
  useEffect(() => {
    if (
      prevBillingRef.current.autopayEnabled === autopayEnabled &&
      prevBillingRef.current.billingEmail === billingEmail
    )
      return;
    prevBillingRef.current = { autopayEnabled, billingEmail };
    const t = setTimeout(saveBilling, 600);
    return () => clearTimeout(t);
  }, [autopayEnabled, billingEmail]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <Topbar />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Loader />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Topbar />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-50">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your API connections, profile, and account preferences.
          </p>
        </div>

        {disconnectWarningShown && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            You will not be able to view call data until you reconnect.
          </div>
        )}

        <div className="space-y-6">
          {/* PRD 3.6.1 Connected Services */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Connected Services
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Display API connection status. Update or disconnect keys.
            </p>

            <div className="mt-4 space-y-6">
              {/* Retell AI */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        retellStatus?.connected ? "bg-emerald-400" : "bg-slate-500"
                      }`}
                    />
                    <span className="font-medium text-slate-100">Retell AI</span>
                  </div>
                </div>
                {retellStatus?.connected ? (
                  <>
                    <div className="mt-2 text-xs text-slate-400">
                      Connected: {formatConnectedDate(retellStatus.connected_at)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Last Synced: {formatLastSynced(retellStatus.last_validated_at)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUpdateKeyService("retell");
                          setUpdateKeyValue("");
                          setUpdateKeyError(null);
                        }}
                        className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                      >
                        Update Key
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisconnectService("retell")}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">
                    Not connected. Add your key in API Keys or Update Key below.
                  </div>
                )}
              </div>

              {/* OpenRouter */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        openrouterStatus?.connected
                          ? "bg-emerald-400"
                          : "bg-slate-500"
                      }`}
                    />
                    <span className="font-medium text-slate-100">OpenRouter</span>
                  </div>
                </div>
                {openrouterStatus?.connected ? (
                  <>
                    <div className="mt-2 text-xs text-slate-400">
                      Connected:{" "}
                      {formatConnectedDate(openrouterStatus.connected_at)}
                    </div>
                    <div className="text-xs text-slate-400">
                      Last Synced:{" "}
                      {formatLastSynced(openrouterStatus.last_validated_at)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUpdateKeyService("openrouter");
                          setUpdateKeyValue("");
                          setUpdateKeyError(null);
                        }}
                        className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                      >
                        Update Key
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisconnectService("openrouter")}
                        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">
                    Not connected. Add your key in API Keys or Update Key below.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* PRD 3.6.2 Profile Settings */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Profile Settings
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Editable: Business Name, Contact Email, Phone Number, Timezone.
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
                  Timezone (for date/time display)
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
                Profile saved.
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

          {/* PRD 3.6.3 Billing Settings */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/40">
            <h2 className="text-sm font-semibold text-slate-50">
              Billing Settings
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Autopay, payment method, and billing email for invoices.
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    Autopay
                  </div>
                  <div className="text-xs text-slate-400">
                    Toggle on/off — charge payment method when invoice is generated
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
                  placeholder="Invoices sent to this address (default: account email)"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Email address for invoices (default: account email)
                </p>
              </div>

              {billingSaving && (
                <p className="text-xs text-slate-400">Saving billing preferences...</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Update Key Modal */}
      {updateKeyService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-50">
              Update {updateKeyService === "retell" ? "Retell AI" : "OpenRouter"} Key
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Paste new API key. We will re-validate and update encrypted storage.
            </p>
            <input
              type="password"
              value={updateKeyValue}
              onChange={(e) => setUpdateKeyValue(e.target.value)}
              placeholder={`Enter ${updateKeyService} API key`}
              className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
              autoFocus
            />
            {updateKeyError && (
              <p className="mt-2 text-xs text-rose-300">{updateKeyError}</p>
            )}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleUpdateKey}
                disabled={updateKeyValidating || !updateKeyValue.trim()}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                {updateKeyValidating ? "Validating..." : "Validate & Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdateKeyService(null);
                  setUpdateKeyValue("");
                  setUpdateKeyError(null);
                }}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-50">
              Disconnect {disconnectService === "retell" ? "Retell AI" : "OpenRouter"}?
            </h3>
            <p className="mt-2 text-xs text-slate-400">
              This will delete your stored API key. You will not be able to view call
              data until you reconnect.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnectConfirming}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {disconnectConfirming ? "Disconnecting..." : "Disconnect"}
              </button>
              <button
                type="button"
                onClick={() => setDisconnectService(null)}
                disabled={disconnectConfirming}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
