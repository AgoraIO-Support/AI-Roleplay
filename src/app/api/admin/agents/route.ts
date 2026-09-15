import { NextResponse } from "next/server";

import { getAuthSession } from "@/src/lib/auth/session";
import { isDatabaseConfigured } from "@/src/lib/db/prisma";
import {
  listConvoAiAgentLogs,
  refreshConvoAiAgentLogStatuses,
} from "@/src/lib/convoai/agentLog";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session || session.role !== "root_admin") {
    return NextResponse.json({ error: "Root admin access required." }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Agents Log is unavailable until the database is configured." },
      { status: 503 },
    );
  }

  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 200);
  const limit =
    Number.isFinite(requestedLimit) ? requestedLimit : 200;
  const logs = await listConvoAiAgentLogs(limit);
  await refreshConvoAiAgentLogStatuses(logs);

  return NextResponse.json({ logs: await listConvoAiAgentLogs(limit) });
}
