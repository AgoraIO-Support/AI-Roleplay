"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  BarChart3Icon,
  EditIcon,
  EyeIcon,
  Trash2Icon,
  UsersIcon,
} from "@/components/ui/icons";
import type { SavedFinalAssessment } from "@/src/lib/assessments/types";
import type { AuthSessionUser } from "@/src/lib/auth/session";
import { canUserManageRolePlay } from "@/src/lib/roleplays/access";
import { analyticsForCourse } from "@/src/lib/roleplays/courseAnalytics";
import {
  fetchRolePlayConfigs,
  removeRolePlayConfig,
} from "@/src/lib/roleplays/storage";
import type { RolePlayConfig } from "@/src/lib/roleplays/types";

function formatDate(value?: string) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: RolePlayConfig["status"] }) {
  const isPublished = status === "published";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
        isPublished
          ? "border-success/30 bg-surface text-success-subtle-foreground"
          : "border-warning/30 bg-surface text-warning-subtle-foreground"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-surface p-7 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

function ActionIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-ring/30"
    >
      {children}
      <span className="sr-only">{label}</span>
    </Link>
  );
}

export function CreatedRoleplaysList() {
  const [roleplays, setRoleplays] = useState<RolePlayConfig[]>([]);
  const [assessments, setAssessments] = useState<SavedFinalAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadRoleplays() {
    const [sessionResponse, configs, assessmentsResponse] = await Promise.all([
      fetch("/api/auth/session", { cache: "no-store" }),
      fetchRolePlayConfigs(),
      fetch("/api/assessments", { cache: "no-store" }),
    ]);

    let currentUser: AuthSessionUser | null = null;
    if (sessionResponse.ok) {
      const payload = (await sessionResponse.json()) as {
        user?: AuthSessionUser;
      };
      currentUser = payload.user ?? null;
    }

    setRoleplays(
      currentUser
        ? configs.filter((roleplay) =>
            canUserManageRolePlay(currentUser, roleplay),
          )
        : [],
    );

    if (assessmentsResponse.ok) {
      const payload = (await assessmentsResponse.json()) as {
        assessments?: SavedFinalAssessment[];
      };
      setAssessments(
        Array.isArray(payload.assessments) ? payload.assessments : [],
      );
    }
  }

  useEffect(() => {
    void loadRoleplays()
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load created courses.",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const counts = useMemo(
    () => ({
      total: roleplays.length,
      drafts: roleplays.filter((roleplay) => roleplay.status === "draft")
        .length,
      published: roleplays.filter((roleplay) => roleplay.status === "published")
        .length,
    }),
    [roleplays],
  );

  function assessmentsForCourse(roleplayId: string) {
    return assessments.filter(
      (assessment) => assessment.scenarioId === roleplayId,
    );
  }

  async function deleteRolePlay(rolePlayId: string) {
    if (!window.confirm("Delete this saved roleplay course?")) return;

    setMessage(null);
    setErrorMessage(null);
    try {
      await removeRolePlayConfig(rolePlayId);
      setMessage("Course deleted.");
      await loadRoleplays();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete course.",
      );
    }
  }

  return (
    <section id="course-builder" className="space-y-6">
      <header className="px-1">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
          Course Builder
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground">
          Managed Roleplay Courses
        </h1>
        <p className="mt-3 max-w-4xl text-base leading-7 text-muted-foreground">
          Courses you created through the roleplay workflow. Course admins can
          create, edit, and monitor only their own courses; root admins can
          access all courses.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard label="Managed Courses" value={counts.total} />
        <MetricCard label="Draft" value={counts.drafts} />
        <MetricCard label="Published" value={counts.published} />
      </div>

      {(message || errorMessage) && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            errorMessage
              ? "border-danger/30 bg-danger-subtle text-danger-subtle-foreground"
              : "border-success/30 bg-success-subtle text-success-subtle-foreground"
          }`}
        >
          {errorMessage ?? message}
        </div>
      )}

      <section className="rounded-[2rem] border border-border bg-surface p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              My Created Courses
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create, edit, monitor analytics, review exam attempts, and manage
              deadlines for the roleplay courses you own.
            </p>
          </div>
          <Link
            href="/course-builder/new"
            className="inline-flex items-center justify-center rounded-2xl bg-primary min-h-control-lg px-5 py-3 text-sm font-bold text-primary-foreground shadow-raised transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Create Course
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-border-strong bg-surface-sunken p-10 text-center text-sm font-semibold text-muted-foreground">
            Loading created courses...
          </div>
        ) : roleplays.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] border border-dashed border-border-strong bg-surface-sunken p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              No roleplay courses
            </p>
            <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              No roleplay courses created yet
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              Start with the Role Play Builder to create a draft, publish it
              when ready, then preview the learner-facing experience from this
              page.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {roleplays.map((roleplay) => {
              const courseAssessments = assessmentsForCourse(roleplay.id);
              const courseAnalytics = analyticsForCourse(courseAssessments);

              return (
                <article
                  key={roleplay.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-foreground">
                        {roleplay.settings.meetingTitle}
                      </h3>
                      <StatusBadge status={roleplay.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                      <span>
                        {roleplay.settings.assignedTraineeIds?.length ?? 0}{" "}
                        invitations
                      </span>
                      <span>{courseAnalytics.totalAttempts} attempts</span>
                      <span>
                        {courseAnalytics.passRate === null
                          ? "N/A"
                          : `${courseAnalytics.passRate}%`}{" "}
                        pass rate
                      </span>
                      <span>
                        Deadline: {formatDate(roleplay.settings.deadlineAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 md:justify-end">
                    <ActionIconLink
                      href={`/course-builder?preview=${roleplay.id}`}
                      label="Preview course"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </ActionIconLink>
                    <ActionIconLink
                      href={`/course-builder/${roleplay.id}/attempts`}
                      label="View attempts"
                    >
                      <UsersIcon className="h-4 w-4" />
                    </ActionIconLink>
                    <ActionIconLink
                      href={`/course-builder/${roleplay.id}/analytics`}
                      label="View analytics"
                    >
                      <BarChart3Icon className="h-4 w-4" />
                    </ActionIconLink>
                    <ActionIconLink
                      href={`/course-builder/${roleplay.id}/edit`}
                      label="Edit course"
                    >
                      <EditIcon className="h-4 w-4" />
                    </ActionIconLink>
                    <button
                      type="button"
                      onClick={() => void deleteRolePlay(roleplay.id)}
                      title="Delete course"
                      aria-label="Delete course"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-danger-subtle-foreground transition hover:bg-danger-subtle hover:text-danger focus:outline-none focus:ring-4 focus:ring-danger/30"
                    >
                      <Trash2Icon className="h-4 w-4" />
                      <span className="sr-only">Delete course</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
