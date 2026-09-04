"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  ActivityLogAction,
  ActivityLogEntry,
} from "@/src/lib/activity-log/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function actionLabel(action: ActivityLogAction) {
  const labels: Record<ActivityLogAction, string> = {
    course_created: "Created",
    course_updated: "Edited",
    course_published: "Published",
    course_unpublished: "Unpublished",
    course_deleted: "Deleted",
  };

  return labels[action];
}

function actionClass(action: ActivityLogAction) {
  if (action === "course_deleted") {
    return "bg-danger-subtle text-danger-subtle-foreground ring-1 ring-danger/30";
  }

  if (action === "course_created" || action === "course_published") {
    return "bg-success-subtle text-success-subtle-foreground ring-1 ring-success/30";
  }

  if (action === "course_unpublished") {
    return "bg-warning-subtle text-warning-subtle-foreground ring-1 ring-warning/30";
  }

  return "bg-primary-subtle text-primary ring-1 ring-ring/30";
}

export function ActivityLogPanel() {
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function refreshActivity() {
    setErrorMessage(null);
    const response = await fetch("/api/admin/activity-log?limit=150", {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      activity?: ActivityLogEntry[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.error ??
          `Unable to load activity log. HTTP ${response.status}.`,
      );
    }

    setActivity(Array.isArray(payload.activity) ? payload.activity : []);
  }

  useEffect(() => {
    void (async () => {
      try {
        await refreshActivity();
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load activity log.",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(
    () => ({
      total: activity.length,
      created: activity.filter((entry) => entry.action === "course_created")
        .length,
      edited: activity.filter(
        (entry) =>
          entry.action === "course_updated" ||
          entry.action === "course_published" ||
          entry.action === "course_unpublished",
      ).length,
      deleted: activity.filter((entry) => entry.action === "course_deleted")
        .length,
    }),
    [activity],
  );

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-primary/20 bg-surface p-6 text-sm text-muted-foreground shadow-soft">
        Loading activity log...
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-hero-grid p-7 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Root Admin
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              Activity Log
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              See who created, edited, published, unpublished, or deleted
              roleplay courses. The log captures course activity from this point
              forward.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshActivity()}
            className="inline-flex rounded-2xl border border-primary/20 bg-surface min-h-control px-5 py-2.5 text-sm font-semibold text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Refresh Log
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Events", value: counts.total },
            { label: "Created", value: counts.created },
            { label: "Edited", value: counts.edited },
            { label: "Deleted", value: counts.deleted },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-primary/20 bg-surface/85 p-4"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-3xl border border-warning/30 bg-warning-subtle p-5 text-sm font-medium text-warning-subtle-foreground">
          {errorMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Course activity
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Latest activity appears first and is visible only to root
                admins.
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {activity.length} events
            </span>
          </div>
        </div>

        {activity.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              No activity yet
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Course changes will appear here
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Create, edit, publish, unpublish, or delete a roleplay course to
              generate the first activity log entry.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-surface-sunken text-muted-foreground">
                <tr>
                  <th className="border-b border-border px-5 py-3 font-medium">
                    Action
                  </th>
                  <th className="border-b border-border px-5 py-3 font-medium">
                    Course
                  </th>
                  <th className="border-b border-border px-5 py-3 font-medium">
                    Actor
                  </th>
                  <th className="border-b border-border px-5 py-3 font-medium">
                    When
                  </th>
                  <th className="border-b border-border px-5 py-3 font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {activity.map((entry) => (
                  <tr
                    key={entry.id}
                    className="text-muted-foreground transition hover:bg-surface-sunken"
                  >
                    <td className="border-b border-border px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${actionClass(entry.action)}`}
                      >
                        {actionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {entry.target.title}
                      </p>
                      <p className="mt-1 text-xs text-subtle-foreground">
                        {entry.target.id}
                      </p>
                    </td>
                    <td className="border-b border-border px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {entry.actor.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.actor.email}
                      </p>
                    </td>
                    <td className="border-b border-border px-5 py-4 text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="border-b border-border px-5 py-4 text-muted-foreground">
                      {entry.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
