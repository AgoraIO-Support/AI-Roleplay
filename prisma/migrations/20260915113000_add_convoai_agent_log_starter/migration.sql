-- Older agent records remain valid; future starts capture the triggering account.
ALTER TABLE "ConvoAiAgentLog"
  ADD COLUMN "startedById" TEXT,
  ADD COLUMN "startedByName" TEXT,
  ADD COLUMN "startedByEmail" TEXT;

CREATE INDEX "ConvoAiAgentLog_startedById_idx" ON "ConvoAiAgentLog"("startedById");
