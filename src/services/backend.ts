import { auth } from "@/lib/firebase";

/**
 * Base URL for Firebase Cloud Functions
 * MUST be set in .env.local and Vercel
 */
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function callBackend(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  if (!BACKEND_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BACKEND_BASE}/${endpoint.replace(/^\//, "")}`;

  const res = await fetch(url, {
    method: options.method ?? "POST", // 🔥 DEFAULT POST (fixes 405)
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // 🔥 REQUIRED by backend
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Backend error:", res.status, text);
    throw new Error(text || `Backend request failed (${res.status})`);
  }

  return res.json();
}
