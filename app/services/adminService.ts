import { callBackend } from "@/services/backend";

type CreateUserByAdminInput = {
  email: string;
  password: string;
  role: string;
  businessName?: string;
};

export type AdminUserItem = {
  uid: string;
  email: string;
  businessName?: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
};

export type AdminAgentItem = {
  agentId: string;
  agentName: string | null;
  userId: string;
  userEmail: string | null;
  userBusinessName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserByAdminResponse = {
  user: {
    uid: string;
    email: string;
  };
};

export type ListUsersResponse = {
  users: AdminUserItem[];
};

export type AdminApiKeyStatus = {
  configured: boolean;
  lastUpdated: string | null;
};

export type GetAdminApiKeysResponse = {
  retell: AdminApiKeyStatus;
  openrouter: AdminApiKeyStatus;
};

export type GetAdminAgentsResponse = {
  agents: AdminAgentItem[];
};

type UpdateUserInput = {
  uid: string;
  isActive: boolean;
};

type AssignAgentInput = {
  agentId: string;
  userId: string;
  agentName?: string;
};

type DeleteAgentInput = {
  agentId: string;
};

type ApiKeyPayload = {
  retell?: string;
  openrouter?: string;
};

export async function createUserByAdmin({
  email,
  password,
  role,
  businessName,
}: CreateUserByAdminInput) {
  const payload = {
    email,
    password,
    role,
    ...(businessName ? { businessName } : {}),
  };

  return callBackend("createUserByAdmin", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<CreateUserByAdminResponse>;
}

export async function listUsers() {
  return callBackend("listUsers", { method: "GET" }) as Promise<ListUsersResponse>;
}

export async function getAdminApiKeys() {
  return callBackend("adminApiKeys", { method: "GET" }) as Promise<GetAdminApiKeysResponse>;
}

export async function getAdminAgents() {
  return callBackend("adminAgents", { method: "GET" }) as Promise<GetAdminAgentsResponse>;
}

export async function updateUserActiveStatus({ uid, isActive }: UpdateUserInput) {
  return callBackend("updateUser", {
    method: "POST",
    body: JSON.stringify({ uid, isActive }),
  }) as Promise<void>;
}

export async function assignAgentToUser({
  agentId,
  userId,
  agentName,
}: AssignAgentInput) {
  return callBackend("adminAgents", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      userId,
      agentName,
    }),
  }) as Promise<void>;
}

export async function deleteAgent({ agentId }: DeleteAgentInput) {
  return callBackend("adminAgents", {
    method: "DELETE",
    body: JSON.stringify({ agentId }),
  }) as Promise<void>;
}

export async function saveAdminApiKeys(payload: ApiKeyPayload) {
  return callBackend("adminApiKeys", {
    method: "POST",
    body: JSON.stringify(payload),
  }) as Promise<void>;
}
