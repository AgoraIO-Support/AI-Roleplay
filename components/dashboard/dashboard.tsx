"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { AuthSessionUser } from "@/src/lib/auth/session";

type HealthStatus = "operational" | "attention";

type RootDashboardData = {
  kind: "root_admin";
  user: AuthSessionUser;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    courseAdmins: number;
    trainees: number;
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    assessments: number;
    averageScore: number | null;
    passRate: number | null;
    attempts: number;
  };
  health: Array<{
    id: string;
    label: string;
    status: HealthStatus;
    detail: string;
    meta: string;
  }>;
  recentCourses: CourseSummary[];
  recentAssessments: Array<{
    id: string;
    title: string;
    learnerName: string;
    learnerEmail: string;
    score: number;
    outcome: "passed" | "needs_review";
    createdAt: string;
  }>;
  roleBreakdown: Array<{ label: string; value: number }>;
};

type LearnerDashboardData = {
  kind: "learner";
  user: AuthSessionUser;
  roleLabel: string;
  metrics: {
    assignedCourses: number;
    completedCourses: number;
    remainingCourses: number;
    assessments: number;
    averageScore: number | null;
    passed: number;
    createdCourses: number;
    publishedCreatedCourses: number;
  };
  assignedCourses: Array<
    CourseSummary & { completed: boolean; maxAttempts: number }
  >;
  createdCourses: CourseSummary[];
  recentAssessments: Array<{
    id: string;
    title: string;
    score: number;
    outcome: "passed" | "needs_review";
    summary: string;
    createdAt: string;
  }>;
};

type CourseSummary = {
  id: string;
  title: string;
  status: "draft" | "published";
  characterName: string;
  durationMinutes: number;
  assignedCount: number;
  ownerName: string;
  updatedAt?: string;
  scenario: string;
};

type DashboardData = RootDashboardData | LearnerDashboardData;

function formatDate(value?: string) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "N/A";
  return `${new Intl.NumberFormat("en-US").format(value)}${suffix}`;
}

function statusTone(status: HealthStatus) {
  return status === "operational"
    ? "border-success/30 bg-success-subtle text-success-subtle-foreground"
    : "border-warning/30 bg-warning-subtle text-warning-subtle-foreground";
}

function MiniBars({ tone = "bg-primary" }: { tone?: string }) {
  return (
    <div className="flex h-10 items-end gap-1">
      {[38, 52, 45, 64, 58, 72, 68, 82, 76, 88].map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-1.5 rounded-full ${tone}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function NetworkChart() {
  return (
    <div className="mt-6 h-64 rounded-2xl bg-background p-4">
      <svg
        viewBox="0 0 760 220"
        className="h-full w-full"
        role="img"
        aria-label="Dashboard activity trend"
      >
        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1="0"
            x2="760"
            y1={30 + line * 40}
            y2={30 + line * 40}
            stroke="#e2e8f0"
            strokeDasharray="4 6"
          />
        ))}
        <path
          d="M0 155 C70 125 110 115 175 122 C250 132 285 158 355 110 C425 62 490 110 560 82 C640 50 695 62 760 72"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M0 175 C75 145 120 138 175 148 C250 160 295 170 358 132 C435 92 495 142 560 122 C635 92 690 98 760 108"
          fill="none"
          stroke="#60a5fa"
          strokeDasharray="8 8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M0 155 C70 125 110 115 175 122 C250 132 285 158 355 110 C425 62 490 110 560 82 C640 50 695 62 760 72 L760 220 L0 220 Z"
          fill="url(#activityGradient)"
          opacity="0.45"
        />
        <defs>
          <linearGradient id="activityGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#99f6e4" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent,
  children,
}: {
  label: string;
  value: string;
  helper: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className={`mt-1 text-sm font-medium ${accent}`}>{helper}</p>
        </div>
        {children}
      </div>
    </article>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <section className="rounded-2xl border border-warning/30 bg-warning-subtle p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-warning-subtle-foreground">
        Dashboard unavailable
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
        We could not load the dashboard.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-warning-subtle-foreground">
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-panel min-h-control px-4 py-2 text-sm font-semibold text-panel-foreground transition hover:bg-panel/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Try again
      </button>
    </section>
  );
}

function LoadingDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-28 animate-pulse rounded-xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}

function RootAdminDashboard({ data }: { data: RootDashboardData }) {
  const criticalHealth = data.health.filter(
    (item) => item.status !== "operational",
  ).length;

  return (
    <div className="-m-4 space-y-5 bg-surface-sunken p-4 text-foreground sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Overview
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Root Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Database-backed platform operations, course health, and model
            configuration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/control-panel/users"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface min-h-control px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            User Management
          </Link>
          <Link
            href="/course-builder/new"
            className="inline-flex items-center justify-center rounded-lg bg-primary min-h-control px-4 py-2 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            + Create Course
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Users"
          value={formatNumber(data.metrics.totalUsers)}
          helper={`${data.metrics.activeUsers} active / ${data.metrics.inactiveUsers} inactive`}
          accent="text-success-subtle-foreground"
        >
          <MiniBars tone="bg-success/70" />
        </MetricCard>
        <MetricCard
          label="Courses"
          value={formatNumber(data.metrics.totalCourses)}
          helper={`${data.metrics.publishedCourses} published / ${data.metrics.draftCourses} drafts`}
          accent="text-primary"
        >
          <MiniBars tone="bg-primary/70" />
        </MetricCard>
        <MetricCard
          label="Assessments"
          value={formatNumber(data.metrics.assessments)}
          helper={`Avg score ${formatNumber(data.metrics.averageScore, "%")}`}
          accent="text-warning-subtle-foreground"
        >
          <MiniBars tone="bg-warning/70" />
        </MetricCard>
        <MetricCard
          label="Attempts"
          value={formatNumber(data.metrics.attempts)}
          helper="Saved learner completions"
          accent="text-success-subtle-foreground"
        />
        <MetricCard
          label="Pass Rate"
          value={formatNumber(data.metrics.passRate, "%")}
          helper="Across final assessments"
          accent="text-danger-subtle-foreground"
        />
        <MetricCard
          label="Health Alerts"
          value={formatNumber(criticalHealth)}
          helper={
            criticalHealth === 0 ? "All systems ready" : "Needs configuration"
          }
          accent={
            criticalHealth === 0
              ? "text-success-subtle-foreground"
              : "text-warning-subtle-foreground"
          }
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.7fr]">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">
                Platform Activity
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {formatNumber(data.metrics.attempts + data.metrics.assessments)}
              </p>
              <p className="text-sm text-muted-foreground">
                Attempts + final assessments recorded
              </p>
            </div>
            <div className="rounded-lg bg-muted p-1 text-xs font-semibold text-muted-foreground">
              <span className="rounded-md bg-surface px-3 py-1.5 shadow-sm">
                7 days
              </span>
              <span className="px-3 py-1.5">30 days</span>
              <span className="px-3 py-1.5">90 days</span>
            </div>
          </div>
          <NetworkChart />
        </article>

        <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <div className="border-b border-border p-5">
            <p className="text-sm font-bold text-foreground">System Health</p>
          </div>
          <div className="divide-y divide-border">
            {data.health.map((item) => (
              <div key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.detail}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
                      {item.meta}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(item.status)}`}
                  >
                    {item.status === "operational" ? "OK" : "Check"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <p className="text-sm font-bold text-foreground">Role Breakdown</p>
          <div className="mt-5 space-y-4">
            {data.roleBreakdown.map((item, index) => {
              const total = Math.max(1, data.metrics.totalUsers);
              const width = Math.max(6, Math.round((item.value / total) * 100));
              const colors = ["bg-success", "bg-primary/70", "bg-warning"];
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="font-bold text-foreground">
                      {item.value}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${colors[index]}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-foreground">
              Recent Assessments
            </p>
            <Link
              href="/assessment"
              className="text-sm font-semibold text-primary hover:text-primary"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-subtle-foreground">
                <tr>
                  <th className="border-b border-border py-3">Learner</th>
                  <th className="border-b border-border py-3">Course</th>
                  <th className="border-b border-border py-3">Score</th>
                  <th className="border-b border-border py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAssessments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No assessments yet.
                    </td>
                  </tr>
                ) : (
                  data.recentAssessments.map((assessment) => (
                    <tr key={assessment.id} className="text-muted-foreground">
                      <td className="border-b border-border py-3 font-semibold text-foreground">
                        {assessment.learnerName}
                      </td>
                      <td className="border-b border-border py-3">
                        {assessment.title}
                      </td>
                      <td className="border-b border-border py-3 font-bold text-foreground">
                        {assessment.score}%
                      </td>
                      <td className="border-b border-border py-3">
                        {formatDate(assessment.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

function LearnerStatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "emerald" | "amber" | "slate";
}) {
  const tones = {
    blue: "from-primary-subtle to-surface text-primary ring-ring/30",
    emerald:
      "from-success-subtle to-surface text-success-subtle-foreground ring-success/30",
    amber:
      "from-warning-subtle to-surface text-warning-subtle-foreground ring-warning/30",
    slate: "from-muted to-surface text-muted-foreground ring-border",
  };

  return (
    <article
      className={`rounded-3xl bg-gradient-to-br p-5 shadow-soft ring-1 ${tones[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium opacity-80">{helper}</p>
    </article>
  );
}

function LearnerDashboard({ data }: { data: LearnerDashboardData }) {
  const completionRate = useMemo(() => {
    if (data.metrics.assignedCourses === 0) return null;
    return Math.round(
      (data.metrics.completedCourses / data.metrics.assignedCourses) * 100,
    );
  }, [data.metrics.assignedCourses, data.metrics.completedCourses]);
  const latestAssessment = data.recentAssessments[0];
  const nextCourse =
    data.assignedCourses.find((course) => !course.completed) ??
    data.assignedCourses[0];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-hero-grid p-6 shadow-soft sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-center">
          <div>
            <span className="inline-flex rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary ring-1 ring-ring/30">
              {data.roleLabel} Learning Dashboard
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-foreground">
              Welcome back, {data.user.name}.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Focus on assigned roleplay courses, review your latest coaching
              feedback, and keep your training momentum visible without the
              root-admin operations view.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="inline-flex items-center justify-center rounded-2xl bg-primary min-h-control px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Start Assigned Course
              </Link>
              <Link
                href="/assessment"
                className="inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-surface min-h-control px-5 py-2.5 text-sm font-semibold text-muted-foreground shadow-soft transition hover:bg-primary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Review Assessments
              </Link>
              {data.user.role === "course_admin" && (
                <Link
                  href="/course-builder/new"
                  className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface min-h-control px-5 py-2.5 text-sm font-semibold text-muted-foreground shadow-soft transition hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Create Roleplay
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-surface/85 p-5 shadow-soft backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-subtle-foreground">
              Training Progress
            </p>
            <div className="mt-5 flex items-center gap-5">
              <div
                className="grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(hsl(var(--primary))_var(--progress),hsl(var(--muted))_0)] p-2"
                style={
                  {
                    "--progress": `${completionRate ?? 0}%`,
                  } as React.CSSProperties
                }
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-surface text-2xl font-semibold text-foreground">
                  {formatNumber(completionRate, "%")}
                </div>
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Course completion
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {data.metrics.completedCourses} completed out of{" "}
                  {data.metrics.assignedCourses} assigned courses.
                </p>
              </div>
            </div>
            {nextCourse && (
              <div className="mt-5 rounded-2xl bg-primary-subtle/80 p-4 ring-1 ring-ring/30">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Next up
                </p>
                <p className="mt-2 font-semibold text-foreground">
                  {nextCourse.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextCourse.durationMinutes} min with{" "}
                  {nextCourse.characterName}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LearnerStatCard
          label="Assigned"
          value={formatNumber(data.metrics.assignedCourses)}
          helper={`${data.metrics.remainingCourses} still open`}
          tone="blue"
        />
        <LearnerStatCard
          label="Completed"
          value={formatNumber(data.metrics.completedCourses)}
          helper="Courses finished"
          tone="emerald"
        />
        <LearnerStatCard
          label="Average Score"
          value={formatNumber(data.metrics.averageScore, "%")}
          helper={`${data.metrics.assessments} assessments`}
          tone="amber"
        />
        <LearnerStatCard
          label={data.user.role === "course_admin" ? "Created" : "Passed"}
          value={formatNumber(
            data.user.role === "course_admin"
              ? data.metrics.createdCourses
              : data.metrics.passed,
          )}
          helper={
            data.user.role === "course_admin"
              ? `${data.metrics.publishedCreatedCourses} published`
              : "Final assessments passed"
          }
          tone="slate"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Assigned Practice
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Roleplay courses
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start a course or revisit a completed simulation for practice.
              </p>
            </div>
            <Link
              href="/courses"
              className="text-sm font-semibold text-primary hover:text-primary"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {data.assignedCourses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/20 bg-primary-subtle/60 p-8 text-center text-sm text-muted-foreground">
                No assigned roleplay courses yet.
              </div>
            ) : (
              data.assignedCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-3xl border border-primary/20 bg-primary-subtle/40 p-4 transition hover:bg-primary-subtle"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {course.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${course.completed ? "bg-success-subtle text-success-subtle-foreground ring-1 ring-success/30" : "bg-surface text-primary ring-1 ring-ring/30"}`}
                        >
                          {course.completed ? "Completed" : "Ready"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {course.characterName} · {course.durationMinutes} min ·{" "}
                        {course.maxAttempts} max attempts
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {course.scenario}
                      </p>
                    </div>
                    <Link
                      href={`/admin/roleplays/preview/${course.id}/session`}
                      className="shrink-0 inline-flex items-center justify-center rounded-2xl bg-primary min-h-control px-4 py-2 text-center text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {course.completed ? "Practice Again" : "Start"}
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Latest Feedback
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Final assessment
          </h2>
          {!latestAssessment ? (
            <div className="mt-6 rounded-3xl border border-dashed border-primary/20 bg-primary-subtle/60 p-6 text-sm leading-6 text-muted-foreground">
              Complete a roleplay session to generate your first final
              assessment.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-panel-border bg-panel p-5 text-panel-foreground shadow-soft">
                <p className="text-sm font-semibold text-panel-muted-foreground">
                  {latestAssessment.title}
                </p>
                <p className="mt-4 text-5xl font-semibold">
                  {latestAssessment.score}%
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-subtle-foreground">
                  {formatDate(latestAssessment.createdAt)}
                </p>
                <p className="mt-4 text-sm leading-6 text-subtle-foreground">
                  {latestAssessment.summary}
                </p>
              </div>
              <Link
                href={`/assessment/${latestAssessment.id}`}
                className="inline-flex w-full justify-center rounded-2xl bg-primary min-h-control px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Open Assessment
              </Link>
            </div>
          )}
        </article>
      </section>

      {data.user.role === "course_admin" && (
        <section className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Creator Workspace
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                Your created courses
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Course admins can create simulations and take courses assigned
                by other admins.
              </p>
            </div>
            <Link
              href="/course-builder"
              className="text-sm font-semibold text-primary hover:text-primary"
            >
              Manage
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {data.createdCourses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/20 bg-primary-subtle/60 p-6 text-sm text-muted-foreground md:col-span-2">
                No created courses yet.
              </div>
            ) : (
              data.createdCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-3xl border border-primary/20 bg-primary-subtle/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {course.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.assignedCount} assigned · Updated{" "}
                        {formatDate(course.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${course.status === "published" ? "bg-success-subtle text-success-subtle-foreground ring-1 ring-success/30" : "bg-warning-subtle text-warning-subtle-foreground ring-1 ring-warning/30"}`}
                    >
                      {course.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const payload = (await response
          .json()
          .catch(() => ({}))) as Partial<DashboardData> & {
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.message ??
              payload.error ??
              `Unable to load dashboard. HTTP ${response.status}.`,
          );
        }

        setData(payload as DashboardData);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) return <LoadingDashboard />;
  if (errorMessage) return <DashboardError message={errorMessage} />;
  if (!data) return <DashboardError message="Dashboard data was empty." />;

  return data.kind === "root_admin" ? (
    <RootAdminDashboard data={data} />
  ) : (
    <LearnerDashboard data={data} />
  );
}
