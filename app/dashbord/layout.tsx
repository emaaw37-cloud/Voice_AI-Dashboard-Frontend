"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Sidebar, type SidebarItem } from "../components/Sidebar";
import { Loader } from "../components/Loader";
import { SupportWidget } from "../components/SupportWidget";

const NAV: SidebarItem[] = [
  { href: "/dashbord", label: "🏠 Dashboard" },
  { href: "/calls", label: "📞 Calls" },
  { href: "/dashbord/analytics", label: "📊 Analytics" },
  { href: "/dashbord/billing", label: "💳 Billing" },
  { href: "/settings", label: "⚙ Settings" },
];

export default function DashbordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();

  // Redirect if not authenticated or not a user role
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.replace("/login");
      return;
    }
    
    // Redirect admins to admin dashboard
    if (role === "admin") {
      router.replace("/admin-dashboard");
    }
  }, [user, role, loading, router]);

  const title = useMemo(() => {
    const hit = NAV.find((n) => n.href === pathname);
    return hit?.label ?? "Dashboard";
  }, [pathname]);

  async function doLogout() {
    await signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Loader />
        </div>
      </main>
    );
  }

  // Don't render if not authenticated or is admin
  if (!user || role === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 py-6 md:px-6">
        <Sidebar
          items={NAV}
          footer={
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold">Voice AI</div>
                <div className="text-xs text-slate-400">
                  {user?.email ?? "—"}
                </div>
              </div>
              <button
                onClick={doLogout}
                className="w-full rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                Log out
              </button>
              <div>
                <Link className="text-slate-400 underline" href="/">
                  Home
                </Link>
              </div>
            </div>
          }
        />

        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage your calls, analytics, billing and settings.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="hidden h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300 md:flex">
                🔔
              </button>
              <div className="flex items-center gap-3 rounded-full bg-slate-900/80 px-3 py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-slate-950">
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="hidden text-right text-xs md:block">
                  <div className="font-medium">
                    {user?.displayName ?? "Acme Corp"}
                  </div>
                  <div className="text-slate-400">Workspace</div>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6 space-y-6">{children}</div>
        </main>
      </div>
      <SupportWidget />
    </div>
  );
}
