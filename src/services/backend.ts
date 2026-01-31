import { auth } from "@/lib/firebase";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL_BASE ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/[^/]+$/, "") ||
  "";

export async function callBackend(
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> {
  const user = auth?.currentUser;
  const token = user ? await user.getIdToken() : null;

  if (!BACKEND_BASE) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL_BASE is not set");
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BACKEND_BASE}/${endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Backend ${endpoint} failed:`, res.status, text);
    throw new Error(text || "Backend request failed");
  }

  return res.json();
}
