"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      businessName.trim().length >= 2 &&
      email.trim().length > 3 &&
      phoneNumber.trim().length >= 10 &&
      password.length >= 8 &&
      !submitting
    );
  }, [businessName, email, phoneNumber, password, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!auth || !db) {
        setError("App not configured. Check Firebase in .env.local.");
        return;
      }
      const trimmedEmail = email.trim();
      const trimmedBusiness = businessName.trim();
      const trimmedPhone = phoneNumber.trim();

      const cred = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      await sendEmailVerification(cred.user);

      if (trimmedBusiness) {
        await updateProfile(cred.user, { displayName: trimmedBusiness });
      }

      const userRef = doc(db, "users", cred.user.uid);
      await setDoc(userRef, {
        email: trimmedEmail,
        business_name: trimmedBusiness,
        phone_number: trimmedPhone,
        email_verified: false,
        created_at: new Date(),
      });

      setEmailSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
          <div className="rounded-xl border border-black/10 bg-white/50 p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="mt-3 text-sm opacity-90">
              Verification email sent. Please check your inbox.
            </p>
            <p className="mt-2 text-xs opacity-70">
              Click the link in the email to verify your account, then log in.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Go to Log in
            </Link>
          </div>
          <div className="mt-6 text-center text-xs opacity-70">
            <Link className="underline" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="mt-1 text-sm opacity-80">
            Start managing calls and API keys in minutes.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-black/10 bg-white/50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
        >
          <label className="block text-sm font-medium">
            Business Name
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              type="text"
              autoComplete="organization"
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:focus:ring-white/20"
              placeholder="Acme Corp"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
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
            Phone Number
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
              autoComplete="tel"
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:focus:ring-white/20"
              placeholder="+1 (555) 123-4567"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:focus:ring-white/20"
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs opacity-70">
              Password must be at least 8 characters long
            </p>
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
            {submitting ? "Creating…" : "Create account"}
          </button>

          <div className="mt-4 text-sm opacity-90">
            Already have an account?{" "}
            <Link className="underline" href="/login">
              Log in
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
