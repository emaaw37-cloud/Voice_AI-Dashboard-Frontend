"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "../lib/functions";

export type SidebarItem = {
  href: string;
  label: string;
};

export function Sidebar({
  items,
  footer,
  className,
}: {
  items: SidebarItem[];
  footer?: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={classNames(
        "rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-slate-200",
        className
      )}
    >
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                "block rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-300 hover:bg-slate-800"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {footer ? (
        <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-400">
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
