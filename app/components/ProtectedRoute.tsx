"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps pages that require authentication and/or specific roles.
 * 
 * Usage:
 * - For authenticated users only: <ProtectedRoute>...</ProtectedRoute>
 * - For admin only: <ProtectedRoute allowedRoles={["admin"]}>...</ProtectedRoute>
 * - For user only: <ProtectedRoute allowedRoles={["user"]}>...</ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, role, loading, error } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      router.replace(redirectTo);
      return;
    }

    // Role check if allowedRoles is specified
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role)) {
        // Redirect based on actual role
        if (role === "admin") {
          router.replace("/admin-dashboard");
        } else if (role === "user") {
          router.replace("/dashbord");
        } else {
          router.replace(redirectTo);
        }
      }
    }
  }, [user, role, loading, allowedRoles, router, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-400">Access Error</h2>
          <p className="mt-2 text-sm text-red-300">{error}</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Role check failed
  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return null;
  }

  return <>{children}</>;
}

/**
 * AdminRoute - Shorthand for admin-only routes
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["admin"]} redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
}

/**
 * UserRoute - Shorthand for user-only routes
 */
export function UserRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["user"]} redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;
