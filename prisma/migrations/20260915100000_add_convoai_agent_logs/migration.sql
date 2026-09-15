-- Store only redacted ConvoAI launch metadata for root-admin troubleshooting.
CREATE TABLE "ConvoAiAgentLog" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "channelName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "safePayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConvoAiAgentLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConvoAiAgentLog_agentId_key" ON "ConvoAiAgentLog"("agentId");
CREATE INDEX "ConvoAiAgentLog_createdAt_idx" ON "ConvoAiAgentLog"("createdAt");
CREATE INDEX "ConvoAiAgentLog_channelName_idx" ON "ConvoAiAgentLog"("channelName");
