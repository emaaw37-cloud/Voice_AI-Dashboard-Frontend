"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { User } from "firebase/auth";
import type { Agent } from "./types";
import { callBackend } from "@/services/backend";

export interface UseAgentsOptions {
  /** Whether to enable the query (default: true when user is provided) */
  enabled?: boolean;
}

export interface UseAgentsResult {
  /** Array of agents */
  agents: Agent[];
  /** Loading state - true when fetching data */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch agents manually (no-op if user is null) */
  refetch: () => Promise<void>;
  /** Whether the hook is ready (user is valid and data has been fetched) */
  ready: boolean;
}

/**
 * Hook to fetch agents from the backend API for the authenticated user.
 * 
 * IMPORTANT: Only queries data when user is provided and enabled is true.
 * Returns empty agents with loading=false when user is null/undefined.
 * 
 * @param user - The authenticated Firebase user (null/undefined = no fetch)
 * @param options - Configuration options
 * @returns Agents data, loading state, error, and refetch function
 */
export function useAgents(
  user: User | null | undefined,
  options: UseAgentsOptions = {}
): UseAgentsResult {
  const { enabled = true } = options;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Determine if we should fetch
  const shouldFetch = Boolean(user) && enabled;

  const fetchAgents = useCallback(async () => {
    // Guard: Don't fetch without valid user
    if (!user) {
      if (isMountedRef.current) {
        setAgents([]);
        setLoading(false);
        setError(null);
      }
      return;
    }

    // Guard: Don't fetch if disabled
    if (!enabled) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await callBackend("getAgents", { method: "GET" });
      
      if (isMountedRef.current) {
        if (data?.agents && Array.isArray(data.agents)) {
          setAgents(data.agents);
        } else {
          setAgents([]);
        }
        setHasFetched(true);
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      if (isMountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load agents. Please try again."
        );
        setAgents([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;

    if (shouldFetch) {
      setLoading(true);
      fetchAgents();
    } else {
      // Reset state when user becomes null (logout)
      setAgents([]);
      setLoading(false);
      setError(null);
      setHasFetched(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [shouldFetch, fetchAgents]);

  // Safe refetch that checks if still valid
  const safeRefetch = useCallback(async () => {
    if (shouldFetch) {
      await fetchAgents();
    }
  }, [shouldFetch, fetchAgents]);

  return {
    agents,
    loading: shouldFetch ? loading : false,
    error,
    refetch: safeRefetch,
    ready: !shouldFetch || hasFetched,
  };
}

/**
 * Fetch agents directly (non-hook version for use in callbacks)
 */
export async function fetchAgentsFromApi(user: User): Promise<Agent[]> {
  if (!user) {
    throw new Error("User not authenticated");
  }

  const data = await callBackend("getAgents", { method: "GET" });
  return data?.agents || [];
}
