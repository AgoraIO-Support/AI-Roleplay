import { NextResponse } from "next/server";

import { getFinalAssessmentById } from "@/src/lib/assessments/storage";
import { getAuthSession } from "@/src/lib/auth/session";
import { canUserManageRolePlay } from "@/src/lib/roleplays/access";
import { getRolePlayConfigById } from "@/src/lib/roleplays/serverStorage";
import {
  formatAssessmentTranscriptText,
  transcriptFilename,
} from "@/src/lib/transcripts/downloadFormatter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();
    const { id } = await context.params;

    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const assessment = await getFinalAssessmentById(id);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    if (session.role !== "root_admin") {
      const roleplay = await getRolePlayConfigById(assessment.scenarioId);

      if (!roleplay || !canUserManageRolePlay(session, roleplay)) {
        return NextResponse.json(
          { error: "Only the course creator or root admin can download this transcript." },
          { status: 403 },
        );
      }
    }

    return new NextResponse(formatAssessmentTranscriptText(assessment), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${transcriptFilename(assessment)}"`,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to download transcript.",
        details: error instanceof Error ? error.message : "Unknown transcript download error.",
      },
      { status: 500 },
    );
  }
}
