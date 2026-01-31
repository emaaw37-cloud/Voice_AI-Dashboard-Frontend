/**
 * VoiceAI Dashboard - PRD-aligned constants and success metrics
 * White-label analytics & billing platform for Sassle's end clients.
 */

/** PRD Success Metrics */
export const SUCCESS_METRICS = {
  onboarding_time_minutes: 5,
  billing_accuracy_match_percent: 100,
  dashboard_load_seconds: 2,
  transcript_view_seconds: 3,
  payment_collection_rate_percent: 90,
  payment_collection_days: 7,
} as const;

/** Product copy */
export const PRODUCT = {
  name: "VoiceAI Dashboard",
  tagline: "White-label analytics and billing for Sassle's end clients",
  byok_note: "BYOK Architecture: Use your own Retell & OpenRouter API keys—no proxy costs, transparent pricing.",
  zero_pci_note: "Zero PCI compliance burden: Fanbasis handles all payment storage.",
} as const;

/** API base URLs (PRD - users provide their own keys) */
export const EXTERNAL_API = {
  retell: "https://api.retellai.com",
  openrouter: "https://openrouter.ai/api/v1",
} as const;

/** Default billing (PRD 3.5, 5.2) */
export const BILLING_DEFAULTS = {
  dashboard_fee_monthly: 49,
  cycle_day: 1,
} as const;
