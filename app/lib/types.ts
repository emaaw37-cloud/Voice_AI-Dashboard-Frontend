/**
 * VoiceAI Dashboard - PRD-aligned types (white-label analytics & billing for Sassle)
 * See PRD sections 3.x and 5.2 for API shapes and DB schema.
 */

/** GET /api/dashboard/overview - PRD 3.2.1 */
export interface DashboardOverview {
  total_calls_this_month: number;
  total_calls_last_month: number;
  success_rate: number;
  avg_duration_seconds: number;
  avg_duration_last_month_seconds?: number; // for "X% vs last month"
  sparkline_data: number[];
  current_month_cost: {
    dashboard_fee: number;
    retell_cost: number;
    openrouter_cost: number;
    total: number;
  };
  last_month_cost_total?: number; // for >20% warning
}

/** GET /api/calls - PRD 3.2.2 */
export interface CallRecord {
  id: string;
  agentId: string | null;
  agentName: string | null;
  dynamicVariables: Record<string, unknown> | null;
  startTime: string; // ISO
  endTime: string; // ISO
  durationSeconds: number;
  direction: "inbound" | "outbound";
  status: "ended" | "failed" | string;
  recordingUrl: string | null;
  transcriptText: string | null;
  callAnalysis: {
    userSentiment: string | null;
    callSuccessful: boolean | null;
    callSummary: string | null;
    inVoicemail: boolean | null;
  } | null;
  costUsd: number;
  createdAt: string; // ISO
}

export interface CallsListResponse {
  calls: CallRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_calls: number;
  };
}

/** GET /api/calls/:id - PRD 3.3 */
export interface CallDetail extends CallRecord {
  // Additional fields for detail view
  transcriptSegments?: TranscriptSegment[];
  
  // Legacy property aliases for backward compatibility
  call_id: string;
  phone_number?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  duration_ms?: number;
  recording_url?: string | null;
  transcript?: string | null;
  transcript_object?: TranscriptSegment[];
  user_sentiment?: string | null;
  call_successful?: boolean | null;
  call_summary?: string | null;
  in_voicemail?: boolean | null;
  call_cost?: {
    total: number;
    products?: Array<{ product: string; cost: number }>;
  };
  call_cost_cents?: number;
}

export interface TranscriptSegment {
  role: "agent" | "user";
  content: string;
  words?: Array<{ word: string; start: number; end: number }>;
}

/** GET /api/billing/current-cycle - PRD 3.5.1 */
export interface BillingCurrentCycle {
  cycle_number: number;
  period_start: string;
  period_end: string;
  days_remaining: number;
  usage: {
    retell_minutes: number;
    retell_cost_usd: number;
    openrouter_tokens: number;
    openrouter_cost_usd: number;
  };
  costs: {
    dashboard_fee: number;
    retell_passthrough: number;
    openrouter_passthrough: number;
    total_projected: number;
  };
  invoice_date: string;
}

/** GET /api/billing/invoices - PRD 3.5.3 */
export interface Invoice {
  id: string;
  user_id: string;
  cycle_number: number;
  period_start: string;
  period_end: string;
  total_amount: number;
  payment_status: "pending" | "paid" | "failed" | "overdue";
  paid_at?: string;
  fanbasis_payment_link?: string;
  dashboard_fee?: number;
  retell_cost?: number;
  openrouter_cost?: number;
}

/** POST /api/keys/validate - PRD 3.1.2 */
export interface ValidateKeysRequest {
  retell_key: string;
  openrouter_key: string;
}

export interface ValidateKeysResponse {
  retell: { valid: boolean; error?: string; account_info?: unknown };
  openrouter: { valid: boolean; error?: string; account_info?: unknown };
}

/** GET /api/analytics/volume - PRD 3.4.2 */
export interface AnalyticsVolume {
  data: Array<{ date: string; calls: number }>;
  granularity: "daily" | "weekly";
}

/** GET /api/analytics/sentiment - PRD 3.4.3 */
export interface AnalyticsSentiment {
  positive: { count: number; percentage: number };
  neutral: { count: number; percentage: number };
  negative: { count: number; percentage: number };
}

/** GET /api/analytics/outcomes - PRD 3.4.4 */
export interface AnalyticsOutcomes {
  successful: number;
  failed: number;
  appointments_booked?: number;
  transfers_to_human?: number;
}

/** GET /api/analytics/metrics - PRD 3.4.5 */
export interface AnalyticsMetrics {
  avg_call_duration_seconds: number;
  avg_response_time_seconds: number;
  success_rate: number;
  trends: {
    avg_duration: { change_percent: number; positive: boolean };
    avg_response_time: { change_percent: number; positive: boolean };
    success_rate: { change_percent: number; positive: boolean };
  };
}

/** User profile (PRD 3.1.1, 3.6.2, 3.6.3) */
export interface UserProfile {
  id: string;
  email: string;
  business_name: string;
  contact_email?: string;
  phone_number?: string;
  timezone?: string;
  billing_email?: string;
  email_verified: boolean;
  autopay_enabled?: boolean;
  fanbasis_customer_id?: string;
}

/** Key connection status (PRD 3.6.1) */
export interface KeyConnectionStatus {
  connected: boolean;
  connected_at?: string;
  last_validated_at?: string;
}

/** Agent registered for the user */
export interface Agent {
  agentId: string;
  agentName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /getAgents response */
export interface AgentsResponse {
  agents: Agent[];
}
