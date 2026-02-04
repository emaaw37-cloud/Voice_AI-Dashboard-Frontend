"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Signup Page - Public signup disabled
 * 
 * Users are created by administrators only.
 * This page informs users and redirects to login.
 */
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <div className="rounded-xl border border-black/10 bg-white/50 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-4 text-center text-4xl">🔒</div>
          <h1 className="text-center text-xl font-semibold">
            Public Registration Disabled
          </h1>
          <p className="mt-3 text-center text-sm opacity-80">
            New user accounts are created by administrators only.
            <br />
            Please contact your administrator if you need an account.
          </p>
          
          <div className="mt-6 flex justify-center">
            <Link
              href="/login"
              className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Go to Login
            </Link>
          </div>

          <p className="mt-4 text-center text-xs opacity-60">
            Redirecting to login in 5 seconds...
          </p>
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
