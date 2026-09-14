"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronRightIcon } from "@/components/ui/icons";
import { groupTranscriptTurns } from "@/src/lib/assessments/transcriptTurns";
import type {
  AssessmentDimension,
  AssessmentScoreOverride,
  CoachTurnFeedback,
  SavedFinalAssessment,
} from "@/src/lib/assessments/types";
import {
  effectiveAssessmentOutcome,
  effectiveAssessmentScore,
} from "@/src/lib/assessments/types";
import type { AuthSessionUser } from "@/src/lib/auth/session";
import { canUserManageRolePlay } from "@/src/lib/roleplays/access";
import type { RolePlayConfig } from "@/src/lib/roleplays/types";

function formatRubricPoints(value: number) {
  return String(Math.round(value));
}

function weightedRubricDimensions(
  dimensions: AssessmentDimension[],
  scoreOverride?: AssessmentScoreOverride,
) {
  const fallbackWeight = dimensions.length > 0 ? 100 / dimensions.length : 0;
  const reviewedPoints = new Map(
    scoreOverride?.type === "rubric"
      ? scoreOverride.dimensions?.map((dimension) => [dimension.label, dimension.points])
      : [],
  );

  const calculatedDimensions = dimensions.map((dimension) => {
    const maximumPoints = dimension.weight > 0 ? dimension.weight : fallbackWeight;
    const reviewedPointsForDimension = reviewedPoints.get(dimension.label);
    const earnedPoints =
      typeof reviewedPointsForDimension === "number"
        ? reviewedPointsForDimension
        : (dimension.score / 100) * maximumPoints;

    return {
      ...dimension,
      maximumPoints,
      earnedPoints,
    };
  });

  // Distribute rounding so the whole-number rows still match the displayed total.
  const targetTotal = Math.round(
    calculatedDimensions.reduce((total, dimension) => total + dimension.earnedPoints, 0),
  );
  const roundedPoints = calculatedDimensions.map((dimension) => Math.floor(dimension.earnedPoints));
  let remainingPoints = targetTotal - roundedPoints.reduce((total, points) => total + points, 0);
  const fractionalIndexes = calculatedDimensions
    .map((dimension, index) => ({
      index,
      fractionalPart: dimension.earnedPoints - Math.floor(dimension.earnedPoints),
    }))
    .sort((first, second) => second.fractionalPart - first.fractionalPart);

  for (const { index } of fractionalIndexes) {
    if (remainingPoints <= 0) break;
    roundedPoints[index] += 1;
    remainingPoints -= 1;
  }

  return calculatedDimensions.map((dimension, index) => {
    const earnedPoints = roundedPoints[index];
    return {
      ...dimension,
      earnedPoints,
      score:
        dimension.maximumPoints > 0
          ? (earnedPoints / dimension.maximumPoints) * 100
          : 0,
    };
  });
}

export default function FinalAssessmentDetailPage() {
  const params = useParams<{ assessmentId: string }>();
  const searchParams = useSearchParams();
  const assessmentId = params.assessmentId;
  const [assessment, setAssessment] = useState<SavedFinalAssessment | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coachFeedbackByTurnId, setCoachFeedbackByTurnId] = useState<
    Record<string, CoachTurnFeedback>
  >({});
  const [coachErrorByTurnId, setCoachErrorByTurnId] = useState<
    Record<string, string>
  >({});
  const [coachLoadingTurnId, setCoachLoadingTurnId] = useState<string | null>(
    null,
  );
  const [canDownloadTranscript, setCanDownloadTranscript] = useState(false);
  const [overrideScoreDraft, setOverrideScoreDraft] = useState("");
  const [overrideReasonDraft, setOverrideReasonDraft] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [showOverallOverrideDialog, setShowOverallOverrideDialog] = useState(false);
  const [isEditingRubric, setIsEditingRubric] = useState(false);
  const [rubricPointDrafts, setRubricPointDrafts] = useState<Record<string, string>>({});
  const [rubricOverrideReason, setRubricOverrideReason] = useState("");
  const [isSavingRubric, setIsSavingRubric] = useState(false);
  const [rubricOverrideMessage, setRubricOverrideMessage] = useState<string | null>(null);
  const [showRubricConfirmDialog, setShowRubricConfirmDialog] = useState(false);
  const [showConfirmScoreDialog, setShowConfirmScoreDialog] = useState(false);
  const [isConfirmingScore, setIsConfirmingScore] = useState(false);
  const rubricSectionRef = useRef<HTMLElement>(null);

  const transcriptTurns = useMemo(
    () => (assessment ? groupTranscriptTurns(assessment.transcript) : []),
    [assessment],
  );

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      setErrorMessage("Assessment id is required.");
      return;
    }

    setCanDownloadTranscript(false);
    setErrorMessage(null);
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch(`/api/assessments/${assessmentId}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Unable to load final assessment. HTTP ${response.status}.`,
          );
        }

        const nextAssessment = (await response.json()) as SavedFinalAssessment;
        setAssessment(nextAssessment);
        setOverrideScoreDraft(String(nextAssessment.scoreOverride?.score ?? nextAssessment.overallScore));
        setOverrideReasonDraft(nextAssessment.scoreOverride?.reason ?? "");
        const rubricDimensions = weightedRubricDimensions(
          nextAssessment.dimensions,
          nextAssessment.scoreOverride,
        );
        setRubricPointDrafts(
          Object.fromEntries(
            rubricDimensions.map((dimension) => [
              dimension.label,
              formatRubricPoints(dimension.earnedPoints),
            ]),
          ),
        );
        setRubricOverrideReason(
          nextAssessment.scoreOverride?.type === "rubric"
            ? nextAssessment.scoreOverride.reason
            : "",
        );
        setCanDownloadTranscript(
          await canCurrentUserDownloadTranscript(nextAssessment),
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load final assessment.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [assessmentId]);

  async function canCurrentUserDownloadTranscript(
    nextAssessment: SavedFinalAssessment,
  ) {
    const sessionResponse = await fetch("/api/auth/session", {
      cache: "no-store",
    });
    const sessionPayload = sessionResponse.ok
      ? ((await sessionResponse.json()) as { user?: AuthSessionUser })
      : {};
    const sessionUser = sessionPayload.user ?? null;

    if (!sessionUser) {
      return false;
    }

    if (sessionUser.role === "root_admin") {
      return true;
    }

    const roleplayResponse = await fetch(
      `/api/roleplays/${nextAssessment.scenarioId}`,
      {
        cache: "no-store",
      },
    );
    const roleplayPayload = roleplayResponse.ok
      ? ((await roleplayResponse.json()) as { roleplay?: RolePlayConfig })
      : {};

    return Boolean(
      roleplayPayload.roleplay &&
      canUserManageRolePlay(sessionUser, roleplayPayload.roleplay),
    );
  }

  async function loadCoachFeedback(turnId: string) {
    if (!assessment || coachFeedbackByTurnId[turnId] || coachLoadingTurnId) {
      return;
    }

    setCoachLoadingTurnId(turnId);
    setCoachErrorByTurnId((current) => {
      const next = { ...current };
      delete next[turnId];
      return next;
    });

    try {
      const response = await fetch("/api/assessments/coach-turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId: assessment.id,
          turnId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          payload?.error ??
            `Coach feedback failed with HTTP ${response.status}.`,
        );
      }

      const feedback = (await response.json()) as CoachTurnFeedback;
      setCoachFeedbackByTurnId((current) => ({
        ...current,
        [turnId]: feedback,
      }));
    } catch (error) {
      setCoachErrorByTurnId((current) => ({
        ...current,
        [turnId]:
          error instanceof Error
            ? error.message
            : "Unable to generate coach feedback.",
      }));
    } finally {
      setCoachLoadingTurnId(null);
    }
  }

  async function saveScoreOverride(clear = false) {
    if (!assessment) return;

    setIsSavingOverride(true);
    setRubricOverrideMessage(null);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          clear
            ? { clear: true }
            : {
                score: Number(overrideScoreDraft),
                reason: overrideReasonDraft,
              },
        ),
      });
      const payload = (await response.json().catch(() => null)) as
        | SavedFinalAssessment
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("overallScore" in payload)) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : `Unable to save the grade. HTTP ${response.status}.`,
        );
      }

      setAssessment(payload);
      setOverrideScoreDraft(String(payload.scoreOverride?.score ?? payload.overallScore));
      setOverrideReasonDraft(payload.scoreOverride?.reason ?? "");
      setShowOverallOverrideDialog(false);
      setRubricOverrideMessage(clear ? "AI score restored." : "Overall score saved.");
      if (!clear) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setRubricOverrideMessage(
        error instanceof Error ? error.message : "Unable to save the grade.",
      );
    } finally {
      setIsSavingOverride(false);
    }
  }

  async function saveRubricOverride(clear = false) {
    if (!assessment) return;

    setIsSavingRubric(true);
    setRubricOverrideMessage(null);
    try {
      const dimensions = weightedRubricDimensions(assessment.dimensions);
      const response = await fetch(`/api/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          clear
            ? { clear: true }
            : {
                rubricDimensions: dimensions.map((dimension) => ({
                  label: dimension.label,
                  points: Number(rubricPointDrafts[dimension.label]),
                })),
                reason: rubricOverrideReason,
              },
        ),
      });
      const payload = (await response.json().catch(() => null)) as
        | SavedFinalAssessment
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("overallScore" in payload)) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : `Unable to save the rubric override. HTTP ${response.status}.`,
        );
      }

      setAssessment(payload);
      setOverrideScoreDraft(String(payload.scoreOverride?.score ?? payload.overallScore));
      setOverrideReasonDraft(payload.scoreOverride?.reason ?? "");
      const nextRubricDimensions = weightedRubricDimensions(
        payload.dimensions,
        payload.scoreOverride,
      );
      setRubricPointDrafts(
        Object.fromEntries(
          nextRubricDimensions.map((dimension) => [
            dimension.label,
            formatRubricPoints(dimension.earnedPoints),
          ]),
        ),
      );
      setRubricOverrideReason(
        payload.scoreOverride?.type === "rubric" ? payload.scoreOverride.reason : "",
      );
      setIsEditingRubric(false);
      setShowRubricConfirmDialog(false);
      if (clear) {
        setRubricOverrideMessage("AI rubric scores restored.");
      } else {
        const updatedScore = effectiveAssessmentScore(payload);
        setRubricOverrideMessage(`Rubric changes confirmed. Final score updated to ${updatedScore}%.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setShowRubricConfirmDialog(false);
      setRubricOverrideMessage(
        error instanceof Error ? error.message : "Unable to save the rubric override.",
      );
    } finally {
      setIsSavingRubric(false);
    }
  }

  function beginRubricOverride() {
    if (isEditingRubric) {
      setIsEditingRubric(false);
      return;
    }

    setIsEditingRubric(true);
    setRubricOverrideMessage(null);
    window.requestAnimationFrame(() => {
      rubricSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function confirmFinalScore() {
    if (!assessment) return;

    setIsConfirmingScore(true);
    setRubricOverrideMessage(null);
    try {
      const response = await fetch(`/api/assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json().catch(() => null)) as
        | SavedFinalAssessment
        | { error?: string }
        | null;
      if (!response.ok || !payload || !("overallScore" in payload)) {
        throw new Error(
          payload && "error" in payload && payload.error
            ? payload.error
            : `Unable to confirm the score. HTTP ${response.status}.`,
        );
      }

      setAssessment(payload);
      setShowConfirmScoreDialog(false);
      setRubricOverrideMessage("Final score confirmed.");
    } catch (error) {
      setRubricOverrideMessage(
        error instanceof Error ? error.message : "Unable to confirm the score.",
      );
    } finally {
      setIsConfirmingScore(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading final assessment...
      </div>
    );
  }

  if (errorMessage || !assessment) {
    return (
      <div className="rounded-3xl border border-warning/30 bg-warning-subtle p-6 text-sm text-warning-subtle-foreground shadow-soft">
        {errorMessage ?? "Final assessment not found."}
      </div>
    );
  }

  const finalScore = effectiveAssessmentScore(assessment);
  const finalOutcome = effectiveAssessmentOutcome(assessment);
  const rubricDimensions = weightedRubricDimensions(
    assessment.dimensions,
    assessment.scoreOverride,
  );
  const rubricTotal = rubricDimensions.reduce(
    (total, dimension) => total + dimension.earnedPoints,
    0,
  );
  const rubricMaximum = rubricDimensions.reduce(
    (total, dimension) => total + dimension.maximumPoints,
    0,
  );
  const assessmentOverview = `Final assessment completed with an overall score of ${finalScore}%. Review objective coverage and coaching notes for specific next steps.`;
  const returnToLearnerResults = searchParams.get("from") === "learners";
  const learningRecordUserId = searchParams.get("userId");
  const returnToLearningRecord =
    searchParams.get("from") === "learning-record" && Boolean(learningRecordUserId);
  const backHref = returnToLearningRecord
    ? `/control-panel/users/${encodeURIComponent(learningRecordUserId ?? "")}/learning-record`
    : returnToLearnerResults
      ? "/assessment/learners"
      : "/assessment";
  const backLabel = returnToLearningRecord
    ? "Back to User Learning Record"
    : returnToLearnerResults
      ? "Back to My Learners' Results"
      : "Back to My Results";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex min-h-control items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition duration-200 ease-out hover:text-primary"
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180" />
        {backLabel}
      </Link>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-primary/20 bg-hero-grid p-6 shadow-soft">
          <p className="text-xs uppercase tracking-[0.24em] text-primary">
            Final Assessment
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {assessment.scenarioTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {assessmentOverview}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary ring-1 ring-ring/30">
              Trainee-facing review
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                finalOutcome === "passed"
                  ? "bg-success-subtle text-success-subtle-foreground ring-success/30"
                  : "bg-warning-subtle text-warning-subtle-foreground ring-warning/30"
              }`}
            >
              {finalOutcome === "passed" ? "Passed" : "Failed"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-surface p-6 text-center shadow-soft">
          {canDownloadTranscript && (
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={beginRubricOverride}
                disabled={isSavingRubric}
                className="inline-flex min-h-control-sm items-center justify-center rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isEditingRubric ? "Cancel rubric override" : "Override rubric scores"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOverrideScoreDraft(String(finalScore));
                  setOverrideReasonDraft("");
                  setShowOverallOverrideDialog(true);
                  setRubricOverrideMessage(null);
                }}
                disabled={isSavingOverride}
                className="inline-flex min-h-control-sm items-center justify-center rounded-xl border border-primary/20 bg-surface px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Override overall score
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmScoreDialog(true);
                  setRubricOverrideMessage(null);
                }}
                disabled={isConfirmingScore}
                className="inline-flex min-h-control-sm items-center justify-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Confirm final score
              </button>
            </div>
          )}
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Overall Score
          </p>
          <p className="mt-4 text-6xl font-semibold text-foreground">
            {finalScore}%
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {finalOutcome === "passed" ? "You Passed!" : "Better luck next time."}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">Strengths</h2>
          <div className="mt-4 space-y-3">
            {assessment.strengths.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-success-subtle p-4 text-sm text-success-subtle-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Coaching Focus
          </h2>
          <div className="mt-4 space-y-3">
            {assessment.improvements.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-warning-subtle p-4 text-sm text-warning-subtle-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={rubricSectionRef}
        className="scroll-mt-6 rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Weighted Rubric Score
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Each dimension earns points up to its maximum. Together, the rubric totals 100 points.
            </p>
          </div>
          {canDownloadTranscript && isEditingRubric && (
            <button
              type="button"
              disabled={isSavingRubric}
              onClick={() => setShowRubricConfirmDialog(true)}
              className="inline-flex min-h-control items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Confirm changes
            </button>
          )}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {rubricDimensions.map((dimension) => (
            <div
              key={dimension.label}
              className="rounded-2xl border border-primary/20 bg-primary-subtle/50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-foreground">
                  {dimension.label}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    up to {formatRubricPoints(dimension.maximumPoints)} points
                  </span>
                  {isEditingRubric ? (
                    <label className="sr-only" htmlFor={`rubric-score-${dimension.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                      {dimension.label} points
                    </label>
                  ) : null}
                  {isEditingRubric ? (
                    <input
                      id={`rubric-score-${dimension.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                      type="number"
                      min="0"
                      max={dimension.maximumPoints}
                      step="1"
                      value={rubricPointDrafts[dimension.label] ?? ""}
                      onChange={(event) =>
                        setRubricPointDrafts((current) => ({
                          ...current,
                          [dimension.label]: event.target.value,
                        }))
                      }
                      className="w-20 rounded-xl border border-primary/20 bg-surface px-2 py-1 text-right text-xs font-semibold tabular-nums text-primary outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/30"
                    />
                  ) : (
                    <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary">
                      {formatRubricPoints(dimension.earnedPoints)} / {formatRubricPoints(dimension.maximumPoints)}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${dimension.score}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {dimension.summary}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-primary/15 pt-4">
          <p className="text-sm font-semibold text-foreground">Rubric total</p>
          <p className="text-lg font-semibold tabular-nums text-primary">
            {formatRubricPoints(rubricTotal)} / {formatRubricPoints(rubricMaximum)}
          </p>
        </div>
        {isEditingRubric && (
          <div className="mt-5 border-t border-primary/15 pt-5">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-muted-foreground">Review rationale (optional)</span>
              <textarea
                value={rubricOverrideReason}
                onChange={(event) => setRubricOverrideReason(event.target.value)}
                rows={3}
                placeholder="Explain the transcript and objective evidence supporting these reviewed scores."
                className="w-full resize-y rounded-2xl border border-border bg-surface-sunken px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
              />
            </label>
          </div>
        )}
        {canDownloadTranscript && assessment.scoreOverride?.type === "rubric" && !isEditingRubric && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/15 pt-5">
            <p className="text-sm text-muted-foreground">
              Reviewed by {assessment.scoreOverride.overriddenBy.name} on {new Date(assessment.scoreOverride.overriddenAt).toLocaleDateString()}.
            </p>
            <button
              type="button"
              disabled={isSavingRubric}
              onClick={() => void saveRubricOverride(true)}
              className="text-sm font-semibold text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Restore AI rubric
            </button>
          </div>
        )}
        {canDownloadTranscript && assessment.scoreOverride && assessment.scoreOverride.type !== "rubric" && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-primary/15 pt-5">
            <p className="text-sm text-muted-foreground">
              Overall score reviewed by {assessment.scoreOverride.overriddenBy.name} on {new Date(assessment.scoreOverride.overriddenAt).toLocaleDateString()}.
            </p>
            <button
              type="button"
              disabled={isSavingOverride}
              onClick={() => void saveScoreOverride(true)}
              className="text-sm font-semibold text-primary transition hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Restore AI score
            </button>
          </div>
        )}
        {rubricOverrideMessage && (
          <p className="mt-3 text-sm font-medium text-muted-foreground">{rubricOverrideMessage}</p>
        )}
      </section>

      {showOverallOverrideDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overall-override-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-overlay">
            <h2 id="overall-override-title" className="text-2xl font-semibold tracking-tight text-foreground">
              Override overall score
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enter a final reviewed score from 0 to 100. This replaces any saved rubric override.
            </p>
            <label className="mt-5 block space-y-2">
              <span className="text-sm font-semibold text-muted-foreground">Overall score</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={overrideScoreDraft}
                onChange={(event) => setOverrideScoreDraft(event.target.value)}
                className="w-full rounded-2xl border border-border bg-surface-sunken px-4 py-3 text-2xl font-semibold tabular-nums text-foreground outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
              />
            </label>
            <label className="mt-4 block space-y-2">
              <span className="text-sm font-semibold text-muted-foreground">Review rationale (optional)</span>
              <textarea
                value={overrideReasonDraft}
                onChange={(event) => setOverrideReasonDraft(event.target.value)}
                rows={3}
                placeholder="Explain the transcript and objective evidence supporting this final score."
                className="w-full resize-y rounded-2xl border border-border bg-surface-sunken px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:bg-surface focus:ring-4 focus:ring-ring/30"
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={isSavingOverride}
                onClick={() => setShowOverallOverrideDialog(false)}
                className="inline-flex min-h-control items-center justify-center rounded-2xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingOverride}
                onClick={() => void saveScoreOverride()}
                className="inline-flex min-h-control items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingOverride ? "Saving score..." : "Save overall score"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRubricConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-rubric-override-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-overlay">
            <h2 id="confirm-rubric-override-title" className="text-2xl font-semibold tracking-tight text-foreground">
              Confirm rubric changes
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              These reviewed points will replace the AI rubric and automatically recalculate the learner&apos;s final score.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={isSavingRubric}
                onClick={() => setShowRubricConfirmDialog(false)}
                className="inline-flex min-h-control items-center justify-center rounded-2xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep editing
              </button>
              <button
                type="button"
                disabled={isSavingRubric}
                onClick={() => void saveRubricOverride()}
                className="inline-flex min-h-control items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingRubric ? "Saving changes..." : "Confirm override"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmScoreDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-score-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-overlay">
            <h2 id="confirm-score-title" className="text-2xl font-semibold tracking-tight text-foreground">
              Confirm final score
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Confirm {finalScore}% as this learner&apos;s final recorded score. This does not change the score.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={isConfirmingScore}
                onClick={() => setShowConfirmScoreDialog(false)}
                className="inline-flex min-h-control items-center justify-center rounded-2xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmingScore}
                onClick={() => void confirmFinalScore()}
                className="inline-flex min-h-control items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-raised transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConfirmingScore ? "Confirming..." : "Confirm score"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Completed Objectives
          </h2>
          <div className="mt-4 space-y-3">
            {assessment.completedObjectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No completed objectives recorded.
              </p>
            ) : (
              assessment.completedObjectives.map((objective) => (
                <div
                  key={objective.id}
                  className="rounded-2xl bg-success-subtle p-4 text-sm text-success-subtle-foreground"
                >
                  <p className="font-semibold">{objective.label}</p>
                  {objective.evidence && (
                    <p className="mt-2">Evidence: {objective.evidence}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-foreground">
            Missed Required Objectives
          </h2>
          <div className="mt-4 space-y-3">
            {assessment.missedObjectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No missed required objectives.
              </p>
            ) : (
              assessment.missedObjectives.map((objective) => (
                <div
                  key={objective.id}
                  className="rounded-2xl bg-danger-subtle p-4 text-sm text-danger-subtle-foreground"
                >
                  {objective.label}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-primary/20 bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Transcript Review
          </h2>
          {canDownloadTranscript && (
            <a
              href={`/api/assessments/${assessment.id}/transcript`}
              className="text-sm font-semibold text-primary hover:text-primary"
            >
              Download Transcript
            </a>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Consecutive transcript fragments are grouped into conversation turns,
          so coach feedback reviews the full learner reply instead of a broken
          ASR snippet.
        </p>
        <div className="mt-5 space-y-3">
          {transcriptTurns.map((turn) => {
            const feedback = coachFeedbackByTurnId[turn.id];
            const coachError = coachErrorByTurnId[turn.id];
            const isCoachLoading = coachLoadingTurnId === turn.id;

            return (
              <div
                key={turn.id}
                className="rounded-2xl border border-border bg-surface-sunken p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {turn.speaker_type === "engineer"
                      ? "engineer turn"
                      : "customer_ai"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(turn.startedAt).toLocaleTimeString()}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {turn.text}
                </p>

                {turn.speaker_type === "engineer" && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => void loadCoachFeedback(turn.id)}
                      disabled={Boolean(coachLoadingTurnId) && !isCoachLoading}
                      className="inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-surface min-h-control px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {isCoachLoading
                        ? "Generating feedback..."
                        : feedback
                          ? "Coach Feedback"
                          : "View Coach Feedback"}
                    </button>

                    {coachError && (
                      <div className="mt-3 rounded-2xl border border-warning/30 bg-warning-subtle p-3 text-sm text-warning-subtle-foreground">
                        {coachError}
                      </div>
                    )}

                    {feedback && (
                      <div className="mt-3 rounded-2xl border border-primary/20 bg-surface p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary">
                          Turn Coach
                        </p>
                        <div className="mt-3 grid gap-3 xl:grid-cols-3">
                          <div className="rounded-2xl bg-success-subtle p-3 text-sm text-success-subtle-foreground">
                            <p className="font-semibold text-success-subtle-foreground">
                              What worked
                            </p>
                            <p className="mt-2 leading-6">
                              {feedback.whatWorked}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-warning-subtle p-3 text-sm text-warning-subtle-foreground">
                            <p className="font-semibold">What to improve</p>
                            <p className="mt-2 leading-6">
                              {feedback.whatToImprove}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-primary-subtle p-3 text-sm text-primary">
                            <p className="font-semibold">
                              Suggested better response
                            </p>
                            <p className="mt-2 leading-6">
                              {feedback.suggestedBetterResponse}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
