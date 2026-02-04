"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === "admin") {
        router.replace("/admin-dashboard");
      } else {
        router.replace("/dashbord");
      }
    }
  }, [user, role, authLoading, router]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 8 && !submitting;
  }, [email, password, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!auth || !db) {
        setError("App not configured. Check Firebase in .env.local.");
        return;
      }
      
      // Sign in with Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Fetch user role from Firestore
      const userRef = doc(db, "users", credential.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setError("User profile not found. Contact administrator.");
        return;
      }
      
      const userData = userSnap.data();
      
      // Check if user is active
      if (userData.isActive === false) {
        setError("Your account has been deactivated. Contact administrator.");
        return;
      }
      
      // Redirect based on role
      if (userData.role === "admin") {
        router.replace("/admin-dashboard");
      } else {
        router.replace("/dashbord");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Log in</h1>
          <p className="mt-1 text-sm opacity-80">
            Access your Voice AI Dashboard.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-black/10 bg-white/50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
        >
          <label className="block text-sm font-medium">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:focus:ring-white/20"
              placeholder="you@company.com"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:focus:ring-white/20"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>

          <div className="mt-4 text-sm opacity-90">
            Don’t have an account?{" "}
            <Link className="underline" href="/signup">
              Sign up
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center text-xs opacity-70">
          <Link className="underline" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
