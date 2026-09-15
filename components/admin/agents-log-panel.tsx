"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertCircleIcon,
  EyeIcon,
  SearchIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";

type AgentLog = {
  id: string;
  agentId: string;
  channelName: string;
  status: string;
  startedByName?: string | null;
  startedByEmail?: string | null;
  safePayload: unknown;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function statusClass(status: string) {
  return status.toLowerCase() === "running"
    ? "bg-success-subtle text-success-subtle-foreground ring-1 ring-success/30"
    : "bg-muted text-muted-foreground ring-1 ring-border";
}

function statusLabel(status: string) {
  if (status.toLowerCase() === "running") return "Running";
  if (status.toLowerCase() === "starting") return "Starting";
  if (status.toLowerCase() === "stopping") return "Stopping";
  if (status.toLowerCase() === "stopped" || status.toLowerCase() === "ended")
    return "Stopped";
  if (status.toLowerCase() === "failed") return "Failed";
  return status;
}

export function AgentsLogPanel() {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadLogs() {
    setErrorMessage(null);
    const response = await fetch("/api/admin/agents?limit=200", {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      logs?: AgentLog[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to load agent logs.");
    }

    const nextLogs = Array.isArray(payload.logs) ? payload.logs : [];
    setLogs(nextLogs);
    setSelectedLogId((current) =>
      current && nextLogs.some((log) => log.id === current) ? current : null,
    );
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadLogs();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load agent logs.",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function refreshLogs() {
    setIsRefreshing(true);
    try {
      await loadLogs();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load agent logs.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      [
        log.agentId,
        log.channelName,
        log.status,
        log.startedByName,
        log.startedByEmail,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [logs, searchQuery]);

  const selectedLog =
    filteredLogs.find((log) => log.id === selectedLogId) ??
    logs.find((log) => log.id === selectedLogId) ??
    null;

  if (isLoading) {
    return (
      <section className="flex min-h-56 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-soft">
        <SpinnerIcon className="mr-2 h-4 w-4" /> Loading agent logs...
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents Log"
        description="Trace each started ConvoAI agent. Payload previews are redacted before they are stored, so session tokens and server credentials never appear here."
        actions={
          <Button
            variant="secondary"
            onClick={() => void refreshLogs()}
            loading={isRefreshing}
            loadingText="Refreshing"
          >
            Refresh log
          </Button>
        }
      />

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger-subtle-foreground"
        >
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Recent agent starts
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Payloads stay hidden until you deliberately select Preview JSON.
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search agent ID or channel"
              className="pl-9"
              aria-label="Search agents log"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<EyeIcon className="h-5 w-5" />}
            title={logs.length === 0 ? "No agents logged yet" : "No matching agent starts"}
            description={
              logs.length === 0
                ? "A record is added as soon as a ConvoAI roleplay agent starts successfully."
                : "Try a shorter agent ID or channel name."
            }
            className="m-5 border-0 bg-surface-sunken sm:m-6"
          />
        ) : (
          <div
            className={
              selectedLog
                ? "grid min-h-[34rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]"
                : "min-h-[34rem]"
            }
          >
            <div className={selectedLog ? "min-w-0 border-b border-border lg:border-b-0 lg:border-r" : "min-w-0"}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[62rem] text-left text-sm">
                  <thead className="bg-surface-sunken text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 sm:px-6">Agent ID</th>
                      <th className="px-5 py-3">Created</th>
                      <th className="px-5 py-3">Channel name</th>
                      <th className="px-5 py-3">Started by</th>
                      <th className="px-5 py-3 text-right sm:px-6">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => {
                      const isSelected = selectedLog?.id === log.id;
                      return (
                        <tr
                          key={log.id}
                          className={
                            isSelected
                              ? "bg-primary-subtle/70 text-foreground"
                              : "text-muted-foreground transition-colors hover:bg-surface-sunken"
                          }
                        >
                          <td className="border-t border-border px-5 py-4 sm:px-6">
                            <p className="whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                              {log.agentId}
                            </p>
                            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(log.status)}`}>
                              {statusLabel(log.status)}
                            </span>
                          </td>
                          <td className="border-t border-border px-5 py-4 text-xs tabular-nums">
                            {formatDate(log.createdAt)}
                          </td>
                          <td className="border-t border-border px-5 py-4">
                            <p className="whitespace-nowrap font-mono text-xs">
                              {log.channelName}
                            </p>
                          </td>
                          <td className="border-t border-border px-5 py-4">
                            {log.startedByName ? (
                              <>
                                <p className="whitespace-nowrap font-medium text-foreground">
                                  {log.startedByName}
                                </p>
                                {log.startedByEmail && (
                                  <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                                    {log.startedByEmail}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not recorded</p>
                            )}
                          </td>
                          <td className="border-t border-border px-5 py-4 text-right sm:px-6">
                            <Button
                              variant={isSelected ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => setSelectedLogId(log.id)}
                            >
                              Preview JSON
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedLog && (
              <aside className="bg-surface-sunken/50 p-5 sm:p-6">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        Safe payload preview
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(selectedLog.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(selectedLog.status)}`}>
                        {statusLabel(selectedLog.status)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Close payload preview"
                        onClick={() => setSelectedLogId(null)}
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <dl className="mt-6 grid gap-4 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Agent ID
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs font-semibold text-foreground">
                        {selectedLog.agentId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Channel name
                      </dt>
                      <dd className="mt-1 break-all font-mono text-xs text-foreground">
                        {selectedLog.channelName}
                      </dd>
                    </div>
                  </dl>
                  <pre className="surface-scrollbar mt-6 min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-5 text-foreground">
                    {JSON.stringify(selectedLog.safePayload, null, 2)}
                  </pre>
                </div>
              </aside>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
