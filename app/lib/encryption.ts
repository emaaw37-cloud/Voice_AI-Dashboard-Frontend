/**
 * API Key Encryption Utilities
 * PRD 3.1.2 - AES-256-GCM encryption for API keys
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Get encryption key (32 bytes for AES-256)
 * Throws if ENCRYPTION_KEY env var is not set in production
 */
function getKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY environment variable is required in production");
    }
    // Development fallback - NEVER use in production
    console.warn("[DEV ONLY] Using development encryption key. Set ENCRYPTION_KEY in production!");
    return Buffer.from("dev-only-key-not-for-production!!", "utf-8");
  }
  
  // Ensure key is exactly 32 bytes for AES-256
  if (encryptionKey.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  
  return Buffer.from(encryptionKey.slice(0, 32), "utf-8");
}

/**
 * Encrypt API key using AES-256-GCM
 * Returns: { encrypted: string, iv: string, authTag: string }
 */
export function encryptApiKey(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getKey();
  const iv = crypto.randomBytes(16); // 16 bytes for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt API key using AES-256-GCM
 */
export function decryptApiKey(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const key = getKey();
  const ivBuffer = Buffer.from(iv, "hex");
  const authTagBuffer = Buffer.from(authTag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
