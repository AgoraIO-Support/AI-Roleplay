import { NextResponse } from "next/server";

import {
  getFinalAssessmentById,
  saveAssessmentScoreOverride,
} from "@/src/lib/assessments/storage";
import { getAuthSession } from "@/src/lib/auth/session";
import { canUserAccessRolePlay, canUserManageRolePlay } from "@/src/lib/roleplays/access";
import { getRolePlayConfigById } from "@/src/lib/roleplays/serverStorage";
import type { AssessmentScoreOverride } from "@/src/lib/assessments/types";

type ScoreOverrideBody = {
  score?: unknown;
  reason?: unknown;
  clear?: unknown;
  confirm?: unknown;
  rubricDimensions?: unknown;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isCourseReviewer(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
  roleplay: Awaited<ReturnType<typeof getRolePlayConfigById>>,
) {
  return session.role === "root_admin" || Boolean(roleplay && canUserManageRolePlay(session, roleplay));
}

function maximumPointsByLabel(
  dimensions: NonNullable<Awaited<ReturnType<typeof getFinalAssessmentById>>>["dimensions"],
) {
  const fallbackWeight = dimensions.length > 0 ? 100 / dimensions.length : 0;
  return new Map(
    dimensions.map((dimension) => [
      dimension.label,
      dimension.weight > 0 ? dimension.weight : fallbackWeight,
    ]),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const assessment = await getFinalAssessmentById(id);

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const roleplay = await getRolePlayConfigById(assessment.scenarioId);
    const canAccess =
      session.role === "root_admin" ||
      (session.role === "course_admin" && roleplay && canUserManageRolePlay(session, roleplay)) ||
      (assessment.learnerId === session.id && (!roleplay || canUserAccessRolePlay(session, roleplay)));

    if (!canAccess) {
      return NextResponse.json({ error: "Assessment access denied." }, { status: 403 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load assessment.",
        details: error instanceof Error ? error.message : "Unknown assessment error.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAuthSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const assessment = await getFinalAssessmentById(id);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    const roleplay = await getRolePlayConfigById(assessment.scenarioId);
    if (!isCourseReviewer(session, roleplay)) {
      return NextResponse.json(
        { error: "Only the course owner or root admin can override this score." },
        { status: 403 },
      );
    }
    const passingScore = roleplay?.settings.passingScore ?? 75;

    const body = (await request.json().catch(() => ({}))) as ScoreOverrideBody;
    if (body.clear === true) {
      const saved = await saveAssessmentScoreOverride(id, undefined);
      return NextResponse.json(saved);
    }

    if (body.confirm === true) {
      const confirmedAt = new Date().toISOString();
      const scoreOverride: AssessmentScoreOverride = {
        ...(assessment.scoreOverride ?? {
          type: "overall",
          score: assessment.overallScore,
          outcome: assessment.outcome,
          reason: "Course-admin score confirmation.",
          overriddenAt: confirmedAt,
          overriddenBy: {
            id: session.id,
            name: session.name,
            email: session.email,
          },
        }),
        confirmedAt,
        confirmedBy: {
          id: session.id,
          name: session.name,
          email: session.email,
        },
      };
      const saved = await saveAssessmentScoreOverride(id, scoreOverride);
      return NextResponse.json(saved);
    }

    const requestedReason = asString(body.reason);
    if (requestedReason.length > 1000) {
      return NextResponse.json(
        { error: "Review rationale must be 1,000 characters or fewer." },
        { status: 400 },
      );
    }

    if (Array.isArray(body.rubricDimensions)) {
      const reason = requestedReason || "Course-admin rubric score override.";
      const maximumPoints = maximumPointsByLabel(assessment.dimensions);
      const reviewedDimensions = body.rubricDimensions.map((item) => {
        if (!item || typeof item !== "object") return null;
        const label = asString((item as { label?: unknown }).label);
        const points =
          typeof (item as { points?: unknown }).points === "number"
            ? (item as { points: number }).points
            : Number(asString((item as { points?: unknown }).points));
        const maximum = maximumPoints.get(label);

        if (
          !maximum ||
          !Number.isInteger(points) ||
          points < 0 ||
          points > maximum
        ) {
          return null;
        }

        return { label, points };
      });

      if (
        reviewedDimensions.some((dimension) => !dimension) ||
        reviewedDimensions.length !== maximumPoints.size ||
        new Set(reviewedDimensions.map((dimension) => dimension?.label)).size !== maximumPoints.size
      ) {
        return NextResponse.json(
          { error: "Provide a valid reviewed score for every rubric dimension." },
          { status: 400 },
        );
      }

      const dimensions = reviewedDimensions.filter(
        (dimension): dimension is { label: string; points: number } => Boolean(dimension),
      );
      const score = Math.round(
        dimensions.reduce((total, dimension) => total + dimension.points, 0),
      );
      const scoreOverride: AssessmentScoreOverride = {
        type: "rubric",
        dimensions,
        score,
        outcome: score >= passingScore ? "passed" : "needs_review",
        reason,
        overriddenAt: new Date().toISOString(),
        overriddenBy: {
          id: session.id,
          name: session.name,
          email: session.email,
        },
      };
      const saved = await saveAssessmentScoreOverride(id, scoreOverride);
      return NextResponse.json(saved);
    }

    const score = typeof body.score === "number" ? body.score : Number(asString(body.score));

    if (!Number.isInteger(score) || score < 0 || score > 100) {
      return NextResponse.json({ error: "Override score must be a whole number from 0 to 100." }, { status: 400 });
    }

    const reason = requestedReason || "Course-admin overall score override.";
    const scoreOverride: AssessmentScoreOverride = {
      type: "overall",
      score,
      outcome: score >= passingScore ? "passed" : "needs_review",
      reason,
      overriddenAt: new Date().toISOString(),
      overriddenBy: {
        id: session.id,
        name: session.name,
        email: session.email,
      },
    };
    const saved = await saveAssessmentScoreOverride(id, scoreOverride);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "Unable to save the score override." }, { status: 500 });
  }
}
