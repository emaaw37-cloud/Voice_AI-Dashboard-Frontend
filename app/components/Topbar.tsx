"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { classNames } from "../lib/functions";
import { useLanguage } from "./LanguageProvider";

export function Topbar({
  title = "Voice AI",
  items = [
    { href: "/dashbord", label: "Dashboard" },
    { href: "/calls", label: "Calls" },
    { href: "/analytics", label: "Analytics" },
    { href: "/billing", label: "Billing" },
    { href: "/settings", label: "Settings" },
  ],
  right,
  className,
}: {
  title?: string;
  items?: Array<{ href: string; label: string }>;
  right?: React.ReactNode;
  className?: string;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { lang, setLang } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("theme") as
      | "light"
      | "dark"
      | null;
    const systemPrefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initial: "light" | "dark" =
      stored ?? (systemPrefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next: "light" | "dark" = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("theme", next);
      return next;
    });
  }

  return (
    <header
      className={classNames(
        "border-b border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/5",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-sm font-semibold">
          {title}
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              className="underline-offset-4 hover:underline"
              href={i.href}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value === "es" ? "es" : "en")}
            className="hidden rounded-lg border border-black/10 bg-transparent px-2 py-1 text-xs dark:border-white/10 md:block"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          {right}
        </div>
      </div>
    </header>
  );
}
