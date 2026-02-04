"use client";

import type { CallRecord } from "./types";

/**
 * Simple in-memory cache for calls data.
 * Reduces Firestore reads by caching across components.
 */

interface CacheEntry {
  calls: CallRecord[];
  timestamp: number;
  userId: string;
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Global cache (survives component unmounts within same session)
let callsCache: CacheEntry | null = null;

/**
 * Get cached calls if valid and for same user
 */
export function getCachedCalls(userId: string): CallRecord[] | null {
  if (!callsCache) return null;
  if (callsCache.userId !== userId) return null;
  if (Date.now() - callsCache.timestamp > CACHE_TTL_MS) {
    callsCache = null;
    return null;
  }
  return callsCache.calls;
}

/**
 * Set calls in cache
 */
export function setCachedCalls(userId: string, calls: CallRecord[]): void {
  callsCache = {
    calls,
    timestamp: Date.now(),
    userId,
  };
}

/**
 * Invalidate cache (call after mutations or on logout)
 */
export function invalidateCallsCache(): void {
  callsCache = null;
}

/**
 * Check if cache is stale (older than TTL/2)
 */
export function isCacheStale(userId: string): boolean {
  if (!callsCache || callsCache.userId !== userId) return true;
  return Date.now() - callsCache.timestamp > CACHE_TTL_MS / 2;
}

/**
 * Get cache age in seconds (for debugging)
 */
export function getCacheAge(): number | null {
  if (!callsCache) return null;
  return Math.floor((Date.now() - callsCache.timestamp) / 1000);
}
