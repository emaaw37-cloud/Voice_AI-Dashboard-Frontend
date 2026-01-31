/**
 * API Key Encryption Utilities
 * PRD 3.1.2 - AES-256-GCM encryption for API keys
 */

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production-32-chars!!";
const ALGORITHM = "aes-256-gcm";

/**
 * Get encryption key (32 bytes for AES-256)
 */
function getKey(): Buffer {
  // Ensure key is exactly 32 bytes
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"), "utf-8");
  return key;
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
