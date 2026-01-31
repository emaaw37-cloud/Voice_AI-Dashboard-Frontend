"use client";

import { classNames } from "../lib/functions";

export function Loader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "flex items-center gap-3 rounded-xl border border-black/10 bg-white/50 p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white"
        aria-hidden="true"
      />
      <span className="opacity-80">{label}</span>
    </div>
  );
}
