import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileStats } from "@/components/dashboard/profile-stats";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listFinalAssessments } from "@/src/lib/assessments/storage";
import { getAuthSession } from "@/src/lib/auth/session";
import { findAuthUserById, listAuthUsers } from "@/src/lib/auth/userStore";
import {
  canUserManageRolePlay,
  canUserTakeRolePlay,
} from "@/src/lib/roleplays/access";
import { listRolePlayConfigs } from "@/src/lib/roleplays/serverStorage";
import type { RolePlayConfig } from "@/src/lib/roleplays/types";

function roleLabel(role: string) {
  if (role === "root_admin") return "Root Admin";
  if (role === "course_admin") return "Course Admin";
  return "Trainee";
}

function formatDate(value?: string) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function passRate(outcomes: Array<"passed" | "needs_review">) {
  if (outcomes.length === 0) return null;
  return Math.round(
    (outcomes.filter((outcome) => outcome === "passed").length /
      outcomes.length) *
      100,
  );
}

function courseDeadline(course: RolePlayConfig) {
  if (!course.settings.deadlineAt) return "No deadline";
  return `${formatDate(course.settings.deadlineAt)}${course.settings.deadlineTimezone ? ` (${course.settings.deadlineTimezone})` : ""}`;
}

export default async function ProfilePage() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  const [roleplays, assessments, fullUser, users] = await Promise.all([
    listRolePlayConfigs(),
    listFinalAssessments(),
    findAuthUserById(session.id),
    session.role === "root_admin" ? listAuthUsers() : Promise.resolve([]),
  ]);

  const assignedCourses = roleplays.filter((roleplay) =>
    canUserTakeRolePlay(session, roleplay),
  );
  const managedCourses = roleplays.filter((roleplay) =>
    canUserManageRolePlay(session, roleplay),
  );
  const personalAssessments = assessments.filter(
    (assessment) => assessment.learnerId === session.id,
  );
  const managedCourseIds = new Set(managedCourses.map((course) => course.id));
  const managedAssessments = assessments.filter((assessment) =>
    managedCourseIds.has(assessment.scenarioId),
  );
  const completedCourseIds = new Set(
    personalAssessments.map((assessment) => assessment.scenarioId),
  );
  const recentPersonalAssessments = personalAssessments.slice(0, 4);
  const averageScore = average(
    personalAssessments.map((assessment) => assessment.overallScore),
  );
  const personalPassRate = passRate(
    personalAssessments.map((assessment) => assessment.outcome),
  );
  const initials =
    session.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || session.email.charAt(0).toUpperCase();

  const metrics =
    session.role === "root_admin"
      ? [
          {
            label: "Users",
            value: users.length.toString(),
            helper: `${users.filter((user) => user.isActive).length} active`,
          },
          {
            label: "Courses",
            value: roleplays.length.toString(),
            helper: `${roleplays.filter((course) => course.status === "published").length} published`,
          },
          {
            label: "Assessments",
            value: assessments.length.toString(),
            helper: "Generated reviews",
          },
          {
            label: "Average Score",
            value:
              average(
                assessments.map((assessment) => assessment.overallScore),
              ) === null
                ? "N/A"
                : `${average(assessments.map((assessment) => assessment.overallScore))}%`,
            helper: "Across all attempts",
          },
        ]
      : [
          {
            label: "Assigned Courses",
            value: assignedCourses.length.toString(),
            helper: `${Math.max(0, assignedCourses.length - completedCourseIds.size)} remaining`,
          },
          {
            label: "Completed Courses",
            value: completedCourseIds.size.toString(),
            helper: "Unique simulations",
          },
          {
            label: "Average Score",
            value: averageScore === null ? "N/A" : `${averageScore}%`,
            helper: "Your attempts",
          },
          {
            label: "Pass Rate",
            value: personalPassRate === null ? "N/A" : `${personalPassRate}%`,
            helper: "Your outcomes",
          },
        ];

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-foreground text-background">
          <CardHeader>
            <CardDescription className="text-subtle-foreground">
              Account profile
            </CardDescription>
            <CardTitle className="text-primary-foreground">
              {session.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-raised ">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {session.email}
                </p>
                <p className="text-sm text-subtle-foreground">
                  {fullUser?.position ?? roleLabel(session.role)}
                </p>
              </div>
            </div>
            <p className="text-sm leading-7 text-subtle-foreground">
              This page summarizes your role, assigned simulations, assessment
              performance, and account settings for the AI RolePlay Academy
              workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge>{roleLabel(session.role)}</Badge>
              <Badge className="bg-surface/10 text-primary-foreground">
                {fullUser?.isActive === false ? "Inactive" : "Active account"}
              </Badge>
            </div>
            <Link
              href="/profile/password"
              className="inline-flex rounded-2xl bg-surface min-h-control px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Change Password
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-surface/90">
          <CardHeader>
            <CardDescription>Workspace summary</CardDescription>
            <CardTitle className="text-3xl">Your current access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            {session.role === "root_admin" ? (
              <p>
                You can manage users, review all courses, monitor activity logs,
                and inspect system-wide training outcomes across the workspace.
              </p>
            ) : session.role === "course_admin" ? (
              <p>
                You can build and manage your own roleplay courses, review
                attempts for courses you own, and complete any simulations
                assigned to your account.
              </p>
            ) : (
              <p>
                You can start assigned simulation courses, complete AI customer
                roleplays, and review your generated assessment feedback after
                each attempt.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-primary/20 bg-primary-subtle/60 p-4">
                <p className="font-semibold text-foreground">
                  Last sign-in identity
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.email}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary-subtle/60 p-4">
                <p className="font-semibold text-foreground">Account role</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {roleLabel(session.role)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <ProfileStats metrics={metrics} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-surface/90">
          <CardHeader>
            <CardDescription>
              {session.role === "trainee" ? "Learning path" : "Course access"}
            </CardDescription>
            <CardTitle>
              {session.role === "trainee"
                ? "Assigned simulations"
                : "Managed and assigned courses"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(session.role === "root_admin"
              ? managedCourses
              : [
                  ...assignedCourses,
                  ...managedCourses.filter(
                    (course) =>
                      !assignedCourses.some(
                        (assigned) => assigned.id === course.id,
                      ),
                  ),
                ]
            )
              .slice(0, 5)
              .map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border bg-surface-sunken p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {course.settings.meetingTitle}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {course.character.name} ·{" "}
                        {course.settings.durationMinutes} min ·{" "}
                        {courseDeadline(course)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        course.status === "published" ? "success" : "warning"
                      }
                    >
                      {course.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </div>
              ))}
            {assignedCourses.length === 0 && managedCourses.length === 0 && (
              <div className="rounded-2xl border border-dashed bg-surface-sunken p-6 text-center text-sm text-muted-foreground">
                No courses are connected to your profile yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface/90">
          <CardHeader>
            <CardDescription>Recent feedback</CardDescription>
            <CardTitle>
              {session.role === "root_admin"
                ? "Latest workspace assessments"
                : "Your latest assessments"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(session.role === "root_admin"
              ? assessments.slice(0, 4)
              : recentPersonalAssessments
            ).map((assessment) => (
              <Link
                key={assessment.id}
                href={`/assessment/${assessment.id}`}
                className="block rounded-2xl border bg-surface-sunken p-4 transition hover:border-primary/40 hover:bg-primary-subtle/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {assessment.scenarioTitle}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(assessment.createdAt)}
                      {assessment.learnerName
                        ? ` · ${assessment.learnerName}`
                        : ""}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {assessment.summary}
                    </p>
                  </div>
                  <Badge
                    variant={
                      assessment.outcome === "passed" ? "success" : "warning"
                    }
                  >
                    {assessment.overallScore}%
                  </Badge>
                </div>
              </Link>
            ))}
            {(session.role === "root_admin"
              ? assessments.length === 0
              : recentPersonalAssessments.length === 0) && (
              <div className="rounded-2xl border border-dashed bg-surface-sunken p-6 text-center text-sm text-muted-foreground">
                No assessment feedback has been generated yet.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {session.role === "course_admin" && (
        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="bg-surface/90 xl:col-span-2">
            <CardHeader>
              <CardDescription>Course admin view</CardDescription>
              <CardTitle>Owned course performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">
                You own {managedCourses.length} course
                {managedCourses.length === 1 ? "" : "s"}. These courses have
                generated {managedAssessments.length} assessment attempt
                {managedAssessments.length === 1 ? "" : "s"} so far.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/course-builder"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary min-h-control px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Manage Courses
                </Link>
                <Link
                  href="/course-builder/new"
                  className="inline-flex items-center justify-center rounded-2xl border border-border bg-surface min-h-control px-4 py-2 text-sm font-bold text-muted-foreground transition hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Create Course
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
