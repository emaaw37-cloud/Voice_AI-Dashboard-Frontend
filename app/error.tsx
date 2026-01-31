"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
        <h1 className="text-xl font-semibold text-rose-200">Something went wrong</h1>
        <p className="mt-2 text-sm text-rose-200/80">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
        >
          Try again
        </button>
        <p className="mt-4 text-xs text-slate-400">
          If this keeps happening, check the browser console and ensure{" "}
          <code className="rounded bg-slate-800 px-1">.env.local</code> has your
          Firebase config.
        </p>
      </div>
    </main>
  );
}
