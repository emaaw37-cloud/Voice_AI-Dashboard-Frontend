"use client";

import Link from "next/link";
import { classNames } from "../lib/functions";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  const action =
    actionHref && actionLabel ? (
      <Link
        href={actionHref}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {actionLabel}
      </Link>
    ) : actionLabel && onAction ? (
      <button
        onClick={onAction}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        {actionLabel}
      </button>
    ) : null;

  return (
    <div
      className={classNames(
        "rounded-xl border border-black/10 bg-white/50 p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-sm font-semibold dark:bg-white/10">
        —
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm opacity-75">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
