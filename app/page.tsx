import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-xl border border-black/10 bg-white/50 p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
        <h1 className="text-2xl font-semibold">VoiceAI Dashboard</h1>
        <p className="mt-2 text-sm opacity-75">
          White-label analytics and billing for Sassle. Connect your Retell &
          OpenRouter keys, view call analytics and transcripts, get automated
          invoices via Fanbasis. BYOK—zero PCI burden.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Sign up
          </Link>
          <Link
            href="/dashbord"
            className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
