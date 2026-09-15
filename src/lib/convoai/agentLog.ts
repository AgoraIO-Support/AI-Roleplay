import type { Prisma } from "@prisma/client";

import { isDatabaseConfigured, prisma } from "@/src/lib/db/prisma";

const terminalStatuses = new Set(["ENDED", "STOPPED", "FAILED"]);
const knownAgoraStatuses = new Set([
  "IDLE",
  "STARTING",
  "RUNNING",
  "STOPPING",
  "STOPPED",
  "FAILED",
]);

export type ConvoAiAgentLogEntry = {
  id: string;
  agentId: string;
  channelName: string;
  status: string;
  startedById: string | null;
  startedByName: string | null;
  startedByEmail: string | null;
  safePayload: Prisma.JsonValue;
  createdAt: string;
};

export async function recordConvoAiAgentLog({
  agentId,
  channelName,
  status,
  startedBy,
  safePayload,
}: {
  agentId: string;
  channelName: string;
  status: string;
  startedBy: {
    id: string;
    name: string;
    email: string;
  };
  safePayload: Prisma.InputJsonValue;
}) {
  if (!isDatabaseConfigured()) return null;

  return prisma.convoAiAgentLog.upsert({
    where: { agentId },
    create: {
      agentId,
      channelName,
      status,
      startedById: startedBy.id,
      startedByName: startedBy.name,
      startedByEmail: startedBy.email,
      safePayload,
    },
    update: {
      channelName,
      status,
      startedById: startedBy.id,
      startedByName: startedBy.name,
      startedByEmail: startedBy.email,
      safePayload,
    },
  });
}

export async function listConvoAiAgentLogs(limit = 200): Promise<ConvoAiAgentLogEntry[]> {
  if (!isDatabaseConfigured()) return [];

  const logs = await prisma.convoAiAgentLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(250, limit)),
    select: {
      id: true,
      agentId: true,
      channelName: true,
      status: true,
      startedById: true,
      startedByName: true,
      startedByEmail: true,
      safePayload: true,
      createdAt: true,
    },
  });

  return logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));
}

export async function updateConvoAiAgentLogStatus(
  agentId: string,
  status: string,
) {
  if (!isDatabaseConfigured()) return null;

  // updateMany makes ending older, pre-log sessions harmlessly idempotent.
  return prisma.convoAiAgentLog.updateMany({
    where: { agentId },
    data: { status },
  });
}

function readStatus(value: unknown) {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  return knownAgoraStatuses.has(status) ? status : null;
}

export async function refreshConvoAiAgentLogStatuses(logs: ConvoAiAgentLogEntry[]) {
  const appId = process.env.AGORA_APP_ID ?? process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";
  const customerId = process.env.AGORA_CUSTOMER_ID ?? "";
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET ?? "";

  if (!appId || !customerId || !customerSecret) return;

  const baseUrl = (
    process.env.CONVOAI_BASE_URL ??
    "https://api.agora.io/api/conversational-ai-agent/v2"
  ).replace(/\/$/, "");
  const activeLogs = logs
    .filter((log) => !terminalStatuses.has(log.status.toUpperCase()))
    .slice(0, 50);
  const authHeader = `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString("base64")}`;

  await Promise.all(
    activeLogs.map(async (log) => {
      try {
        const response = await fetch(
          `${baseUrl}/projects/${appId}/agents/${encodeURIComponent(log.agentId)}`,
          {
            headers: { Authorization: authHeader },
            cache: "no-store",
          },
        );
        if (!response.ok) return;

        const payload = (await response.json().catch(() => null)) as {
          status?: unknown;
        } | null;
        const status = readStatus(payload?.status);
        if (status && status !== log.status.toUpperCase()) {
          await updateConvoAiAgentLogStatus(log.agentId, status);
        }
      } catch {
        // Preserve the last known local status if the provider cannot be reached.
      }
    }),
  );
}
