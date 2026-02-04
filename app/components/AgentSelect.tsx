"use client";

import type { Agent } from "../lib/types";

export interface AgentSelectProps {
  /** List of agents to display */
  agents: Agent[];
  /** Currently selected agent ID ("all" for all agents) */
  value: string;
  /** Callback when selection changes */
  onChange: (agentId: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Label text (default: "Agent") */
  label?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to show "All Agents" option (default: true) */
  showAllOption?: boolean;
}

/**
 * Reusable agent selection dropdown component.
 * Displays registered agents with their names and IDs.
 * Consistent with existing design system.
 */
export function AgentSelect({
  agents,
  value,
  onChange,
  loading = false,
  label = "Agent",
  className = "",
  showAllOption = true,
}: AgentSelectProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-slate-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50"
      >
        {showAllOption && <option value="all">All Agents</option>}
        {loading ? (
          <option disabled>Loading agents...</option>
        ) : agents.length === 0 ? (
          <option disabled>No agents found</option>
        ) : (
          agents.map((agent) => (
            <option key={agent.agentId} value={agent.agentId}>
              {agent.agentName || agent.agentId}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

/**
 * Compact agent filter badge component.
 * Shows current selection as a pill/badge.
 */
export function AgentFilterBadge({
  agents,
  selectedAgentId,
  onClear,
}: {
  agents: Agent[];
  selectedAgentId: string;
  onClear: () => void;
}) {
  if (selectedAgentId === "all") return null;

  const agent = agents.find((a) => a.agentId === selectedAgentId);
  const displayName = agent?.agentName || selectedAgentId.slice(0, 12) + "...";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300">
      <span>🤖</span>
      <span>{displayName}</span>
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-sky-400 hover:text-sky-200"
        aria-label="Clear agent filter"
      >
        ×
      </button>
    </span>
  );
}
