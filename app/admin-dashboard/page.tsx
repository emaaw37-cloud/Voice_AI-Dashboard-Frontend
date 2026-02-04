"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AdminRoute } from "../components/ProtectedRoute";
import {
  type AdminAgentItem,
  type AdminApiKeyStatus,
  type AdminUserItem,
  type GetAdminAgentsResponse,
  type GetAdminApiKeysResponse,
  type ListUsersResponse,
  assignAgentToUser,
  createUserByAdmin,
  deleteAgent,
  getAdminAgents,
  getAdminApiKeys,
  listUsers,
  saveAdminApiKeys,
  updateUserActiveStatus,
} from "../services/adminService";

function AdminDashboardContent() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  
  // Users state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  
  // API Keys state
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    retell: AdminApiKeyStatus;
    openrouter: AdminApiKeyStatus;
  } | null>(null);
  const [retellKey, setRetellKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);

  // Agents state
  const [agents, setAgents] = useState<AdminAgentItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [newAgentId, setNewAgentId] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [savingAgent, setSavingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentSuccess, setAgentSuccess] = useState<string | null>(null);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const data: ListUsersResponse = await listUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user]);

  // Fetch API key status
  const fetchApiKeyStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const data: GetAdminApiKeysResponse = await getAdminApiKeys();
      setApiKeyStatus(data);
    } catch (err) {
      console.error("Failed to fetch API key status:", err);
    }
  }, [user]);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    if (!user) return;
    
    try {
      const data: GetAdminAgentsResponse = await getAdminAgents();
      setAgents(data.agents || []);
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
    fetchApiKeyStatus();
    fetchAgents();
  }, [fetchUsers, fetchApiKeyStatus, fetchAgents]);

  const agentByUserId = new Map<string, AdminAgentItem>();
  agents.forEach((agent) => {
    if (!agentByUserId.has(agent.userId)) {
      agentByUserId.set(agent.userId, agent);
    }
  });

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const data = await createUserByAdmin({
        email: newEmail.trim(),
        businessName: newBusinessName.trim() || undefined,
        password: newPassword,
        role: newRole,
      });

      const createdUserId = data.user?.uid as string | undefined;

      if (createdUserId && newAgentId.trim()) {
        await assignAgentToUser({
          agentId: newAgentId.trim(),
          userId: createdUserId,
          agentName: newAgentName.trim() || undefined,
        });
      }

      setCreateSuccess(`User ${data.user.email} created successfully!`);
      setNewEmail("");
      setNewBusinessName("");
      setNewPassword("");
      setNewRole("user");
      setNewAgentId("");
      setNewAgentName("");
      fetchUsers();
      fetchAgents();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (uid: string, currentlyActive: boolean) => {
    if (!user) return;

    try {
      await updateUserActiveStatus({ uid, isActive: !currentlyActive });
      fetchUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  // Save API keys
  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingKeys(true);
    setKeyError(null);
    setKeySuccess(null);

    try {
      const body: Record<string, string> = {};
      
      if (retellKey.trim()) body.retell = retellKey.trim();
      if (openrouterKey.trim()) body.openrouter = openrouterKey.trim();

      if (Object.keys(body).length === 0) {
        setKeyError("Please enter at least one API key");
        return;
      }

      await saveAdminApiKeys(body);

      setKeySuccess("API keys updated successfully!");
      setRetellKey("");
      setOpenrouterKey("");
      fetchApiKeyStatus();
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : "Failed to save API keys");
    } finally {
      setSavingKeys(false);
    }
  };

  // Assign agent to user
  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingAgent(true);
    setAgentError(null);
    setAgentSuccess(null);

    try {
      await assignAgentToUser({
        agentId: newAgentId.trim(),
        userId: selectedUserId,
        agentName: newAgentName.trim() || undefined,
      });

      setAgentSuccess(`Agent ${newAgentId} assigned successfully!`);
      setNewAgentId("");
      setNewAgentName("");
      setSelectedUserId("");
      fetchAgents();
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Failed to assign agent");
    } finally {
      setSavingAgent(false);
    }
  };

  // Delete agent
  const handleDeleteAgent = async (agentId: string) => {
    if (!user) return;
    if (!confirm(`Remove agent ${agentId}? Calls from this agent will no longer sync to any user.`)) {
      return;
    }

    setDeletingAgentId(agentId);

    try {
      await deleteAgent({ agentId });

      fetchAgents();
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">{profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-xl bg-slate-800/80 border border-slate-700/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-slate-600 transition-all duration-200 shadow-lg shadow-slate-950/20"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Create User Section - Full Width */}
        <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-8 shadow-xl shadow-slate-950/50 backdrop-blur-sm mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Create New User</h2>
          </div>
          
          <form onSubmit={handleCreateUser} className="space-y-5">
            {/* Retell API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Retell API Key
              </label>
              <input
                type="password"
                value={retellKey}
                onChange={(e) => setRetellKey(e.target.value)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
                placeholder="Enter Retell API Key"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
                placeholder="user@example.com"
              />
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
                placeholder="Enter business name"
              />
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
                placeholder="Minimum 8 characters"
              />
            </div>
            
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200 cursor-pointer"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Retell Agent ID */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Retell Agent ID
              </label>
              <input
                type="text"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
                placeholder="agent_abc123..."
              />
            </div>

            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:outline-none transition-all duration-200"
                placeholder="My Sales Agent"
              />
            </div>

            {/* Error/Success Messages */}
            {createError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{createError}</p>
              </div>
            )}
            
            {createSuccess && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-400">{createSuccess}</p>
              </div>
            )}

            {keyError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{keyError}</p>
              </div>
            )}
            
            {keySuccess && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-emerald-400">{keySuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3.5 font-semibold text-white hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                "Create User"
              )}
            </button>
          </form>
        </section>

        {/* User Management Section */}
        <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/90 to-slate-900/50 p-8 shadow-xl shadow-slate-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">User Management</h2>
          </div>
          
          {loadingUsers ? (
            <div className="py-16 text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-sky-500 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-slate-400">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-slate-400">No users found</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/40 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Business Name</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Created Date</th>
                      <th className="px-6 py-4 font-semibold">Agent ID</th>
                      <th className="px-6 py-4 font-semibold">Agent Name</th>
                      <th className="px-6 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {users.map((u) => (
                      (() => {
                        const agent = agentByUserId.get(u.uid);
                        return (
                      <tr key={u.uid} className="hover:bg-slate-800/30 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <span className="font-medium text-white">{u.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{u.businessName || "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            u.role === "admin" 
                              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
                              : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                          }`}>
                            {u.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            u.isActive 
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-red-400"}`}></span>
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : "—"}
                        </td>
                        <td className="px-6 py-4">
                          {agent?.agentId ? (
                            <code className="rounded-lg bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 text-xs text-sky-400 font-mono">
                              {agent.agentId}
                            </code>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {agent?.agentName || <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleToggleActive(u.uid, u.isActive)}
                              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                                u.isActive
                                  ? "bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50"
                                  : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50"
                              }`}
                            >
                              {u.isActive ? "Deactivate" : "Activate"}
                            </button>
                            {agent?.agentId && (
                              <button
                                onClick={() => handleDeleteAgent(agent.agentId)}
                                disabled={deletingAgentId === agent.agentId}
                                className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                {deletingAgentId === agent.agentId ? "Removing..." : "Remove Agent"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                        );
                      })()
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
    </AdminRoute>
  );
}
