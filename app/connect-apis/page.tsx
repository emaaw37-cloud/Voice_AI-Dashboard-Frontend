"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

/**
 * Connect APIs Page - Now deprecated
 * 
 * This page previously handled API key configuration.
 * API keys are now managed by admins only through the admin dashboard.
 * 
 * This page now redirects users based on their role:
 * - Admin → /admin-dashboard
 * - User → /dashbord
 */
export default function ConnectApisPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Redirect based on role
    if (role === "admin") {
      router.replace("/admin-dashboard");
    } else {
      router.replace("/dashbord");
    }
  }, [user, role, loading, router]);

  // Show loading while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <p className="text-slate-400">Redirecting...</p>
      </div>
    </div>
  );
}
