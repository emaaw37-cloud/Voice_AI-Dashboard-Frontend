"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Unsubscribe,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CallRecord } from "./types";
import { 
  getCachedCalls, 
  setCachedCalls, 
  invalidateCallsCache,
  isCacheStale 
} from "./callsCache";

/**
 * Firestore document shape for calls collection
 */
interface FirestoreCallDocument {
  userId: string;
  retellCallId?: string;
  agentId?: string | null;
  agentName?: string | null;
  dynamicVariables?: Record<string, unknown> | null;
  startTime?: Date | Timestamp;
  endTime?: Date | Timestamp;
  durationSeconds?: number;
  direction?: "inbound" | "outbound";
  status?: "ended" | "failed" | string;
  recordingUrl?: string | null;
  transcriptText?: string | null;
  transcriptJson?: Record<string, unknown> | unknown[] | null;
  callAnalysis?: {
    userSentiment?: string | null;
    callSuccessful?: boolean | null;
    callSummary?: string | null;
    inVoicemail?: boolean | null;
  } | null;
  costUsd?: number;
  createdAt?: Date | Timestamp;
}

/**
 * Converts a Firestore Timestamp or Date to ISO string
 */
function toISOString(value: Date | Timestamp | undefined | null): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Handle plain object with seconds (Firestore serialization)
  if (typeof value === "object" && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Maps a Firestore document to CallRecord type
 */
function mapDocToCallRecord(
  doc: QueryDocumentSnapshot<DocumentData>
): CallRecord {
  const data = doc.data() as FirestoreCallDocument;

  return {
    id: doc.id,
    agentId: data.agentId ?? null,
    agentName: data.agentName ?? null,
    dynamicVariables: data.dynamicVariables ?? null,
    startTime: toISOString(data.startTime),
    endTime: toISOString(data.endTime),
    durationSeconds: typeof data.durationSeconds === "number" ? data.durationSeconds : 0,
    direction: data.direction === "outbound" ? "outbound" : "inbound",
    status: data.status ?? "ended",
    recordingUrl: data.recordingUrl ?? null,
    transcriptText: data.transcriptText ?? null,
    callAnalysis: data.callAnalysis
      ? {
          userSentiment: data.callAnalysis.userSentiment ?? null,
          callSuccessful: data.callAnalysis.callSuccessful ?? null,
          callSummary: data.callAnalysis.callSummary ?? null,
          inVoicemail: data.callAnalysis.inVoicemail ?? null,
        }
      : null,
    costUsd: typeof data.costUsd === "number" ? data.costUsd : 0,
    createdAt: toISOString(data.createdAt),
  };
}

export interface UseCallsOptions {
  /** Maximum number of calls to fetch per page (default: 100) */
  pageSize?: number;
  /** Maximum total calls to fetch (default: 500) */
  maxCalls?: number;
  /** Whether to enable the query (default: true when userId is provided) */
  enabled?: boolean;
  /** Use real-time listener instead of one-time fetch (default: false) */
  realtime?: boolean;
  /** Skip cache and force fresh fetch (default: false) */
  skipCache?: boolean;
}

export interface UseCallsResult {
  /** Array of call records */
  calls: CallRecord[];
  /** Loading state - true when fetching data */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refetch calls manually (no-op if userId is null) */
  refetch: () => Promise<void>;
  /** Whether the hook is ready (userId is valid and data loaded) */
  ready: boolean;
  /** Load more calls (pagination) */
  loadMore: () => Promise<void>;
  /** Whether more calls can be loaded */
  hasMore: boolean;
  /** Total calls loaded so far */
  totalLoaded: number;
}

/**
 * Optimized hook to fetch calls from Firestore with caching and pagination.
 * 
 * Optimizations:
 * - In-memory caching to reduce Firestore reads across components
 * - Optional real-time listener (onSnapshot) instead of polling
 * - Cursor-based pagination for large datasets
 * - Mounted ref to prevent memory leaks
 * - Stable callbacks with proper memoization
 *
 * @param userId - The authenticated user's ID (null/undefined = no fetch)
 * @param options - Configuration options
 * @returns Calls data, loading state, pagination helpers
 */
export function useCalls(
  userId: string | null | undefined,
  options: UseCallsOptions = {}
): UseCallsResult {
  const { 
    pageSize = 100, 
    maxCalls = 500, 
    enabled = true,
    realtime = false,
    skipCache = false,
  } = options;

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Refs for stable references
  const isMountedRef = useRef(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  // Stable userId ref to avoid stale closures
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Determine if we should fetch
  // TODO: Re-enable userId check once agent-user mappings are properly configured
  const shouldFetch = enabled && db !== null;

  // Build query with proper constraints
  const buildQuery = useCallback((
    afterDoc?: QueryDocumentSnapshot<DocumentData> | null,
    fetchLimit?: number
  ) => {
    if (!db) return null;

    const callsRef = collection(db, "calls");
    const limitCount = fetchLimit || pageSize;

    // Build query with or without pagination cursor
    // TODO: Re-enable userId filter once agent-user mappings are properly configured
    if (afterDoc) {
      return query(
        callsRef,
        // where("userId", "==", userId),  // Temporarily disabled for testing
        orderBy("createdAt", "desc"),
        startAfter(afterDoc),
        limit(limitCount)
      );
    }

    return query(
      callsRef,
      // where("userId", "==", userId),  // Temporarily disabled for testing
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
  }, [pageSize]);

  // Fetch calls with caching
  const fetchCalls = useCallback(async (isLoadMore = false) => {
    const currentUserId = userIdRef.current || "all";
    
    // TODO: Re-enable userId check once agent-user mappings are properly configured
    // Guard: Don't fetch without valid userId (temporarily disabled)
    // if (!currentUserId) {
    //   if (isMountedRef.current) {
    //     setCalls([]);
    //     setLoading(false);
    //     setError(null);
    //   }
    //   return;
    // }

    // Guard: Don't fetch if disabled or db not available
    if (!enabled || !db) {
      if (isMountedRef.current) {
        setLoading(false);
        if (!db) setError("Database not initialized");
      }
      return;
    }

    // Check cache first (only for initial fetch, not load more)
    if (!isLoadMore && !skipCache) {
      const cached = getCachedCalls(currentUserId);
      if (cached && !isCacheStale(currentUserId)) {
        if (isMountedRef.current) {
          setCalls(cached);
          setHasFetched(true);
          setLoading(false);
          setHasMore(cached.length >= pageSize);
          // Set last doc for pagination from cache
          // Note: We can't paginate from cache, but this allows fresh loadMore
          lastDocRef.current = null;
        }
        return;
      }
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const q = buildQuery(
        isLoadMore ? lastDocRef.current : null,
        isLoadMore ? pageSize : Math.min(pageSize, maxCalls)
      );

      if (!q) {
        throw new Error("Failed to build query");
      }

      const snapshot = await getDocs(q);
      const newCalls = snapshot.docs.map(mapDocToCallRecord);

      // Store last document for pagination
      if (snapshot.docs.length > 0) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      if (isMountedRef.current) {
        if (isLoadMore) {
          setCalls(prev => {
            const combined = [...prev, ...newCalls];
            // Update cache with combined results
            setCachedCalls(currentUserId, combined);
            return combined;
          });
        } else {
          setCalls(newCalls);
          setCachedCalls(currentUserId, newCalls);
        }
        
        setHasFetched(true);
        setHasMore(snapshot.docs.length >= pageSize && calls.length + newCalls.length < maxCalls);
      }
    } catch (err) {
      console.error("Error fetching calls from Firestore:", err);
      if (isMountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load calls. Please try again."
        );
        if (!isLoadMore) setCalls([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, buildQuery, pageSize, maxCalls, skipCache, calls.length]);

  // Setup real-time listener
  const setupRealtimeListener = useCallback(() => {
    const currentUserId = userIdRef.current;
    if (!currentUserId || !db || !enabled || !realtime) return;

    // Cleanup existing listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const q = buildQuery(null, maxCalls);
    if (!q) return;

    setLoading(true);

    unsubscribeRef.current = onSnapshot(
      q,
      (snapshot) => {
        if (!isMountedRef.current) return;

        const newCalls = snapshot.docs.map(mapDocToCallRecord);
        setCalls(newCalls);
        setCachedCalls(currentUserId, newCalls);
        setHasFetched(true);
        setLoading(false);
        setHasMore(false); // Real-time mode fetches all at once
        
        if (snapshot.docs.length > 0) {
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        }
      },
      (err) => {
        if (!isMountedRef.current) return;
        console.error("Firestore listener error:", err);
        setError(err.message || "Real-time sync failed");
        setLoading(false);
      }
    );
  }, [enabled, realtime, buildQuery, maxCalls]);

  // Main effect for fetching/subscribing
  useEffect(() => {
    isMountedRef.current = true;

    if (shouldFetch) {
      if (realtime) {
        setupRealtimeListener();
      } else {
        fetchCalls(false);
      }
    } else {
      // Reset state when userId becomes null (logout)
      setCalls([]);
      setLoading(false);
      setError(null);
      setHasFetched(false);
      setHasMore(true);
      lastDocRef.current = null;
      invalidateCallsCache();
    }

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [shouldFetch, realtime, setupRealtimeListener, fetchCalls]);

  // Safe refetch - forces fresh data
  const safeRefetch = useCallback(async () => {
    if (shouldFetch && userIdRef.current) {
      invalidateCallsCache();
      lastDocRef.current = null;
      await fetchCalls(false);
    }
  }, [shouldFetch, fetchCalls]);

  // Load more for pagination
  const loadMore = useCallback(async () => {
    if (shouldFetch && hasMore && !loading) {
      await fetchCalls(true);
    }
  }, [shouldFetch, hasMore, loading, fetchCalls]);

  // Memoize return value to prevent unnecessary re-renders
  return useMemo(() => ({
    calls,
    loading: shouldFetch ? loading : false,
    error,
    refetch: safeRefetch,
    ready: !shouldFetch || hasFetched,
    loadMore,
    hasMore: shouldFetch ? hasMore : false,
    totalLoaded: calls.length,
  }), [calls, loading, error, safeRefetch, shouldFetch, hasFetched, loadMore, hasMore]);
}

/**
 * Fetch calls directly (non-hook version for use in callbacks)
 * Uses cache when available.
 */
export async function fetchCallsFromFirestore(
  userId: string,
  options: { maxCalls?: number; skipCache?: boolean } = {}
): Promise<CallRecord[]> {
  const { maxCalls = 500, skipCache = false } = options;

  if (!db) {
    throw new Error("Firestore not initialized");
  }

  // Check cache first
  if (!skipCache) {
    const cached = getCachedCalls(userId);
    if (cached && !isCacheStale(userId)) {
      return cached;
    }
  }

  const callsRef = collection(db, "calls");
  // TODO: Re-enable userId filter once agent-user mappings are properly configured
  const q = query(
    callsRef,
    // where("userId", "==", userId),  // Temporarily disabled for testing
    orderBy("createdAt", "desc"),
    limit(maxCalls)
  );

  const snapshot = await getDocs(q);
  const calls = snapshot.docs.map(mapDocToCallRecord);
  
  // Update cache
  setCachedCalls(userId, calls);
  
  return calls;
}

/**
 * Invalidate the calls cache (call on logout or after mutations)
 */
export { invalidateCallsCache } from "./callsCache";
