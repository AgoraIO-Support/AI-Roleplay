import { NextResponse } from "next/server";

import { getAuthSession } from "@/src/lib/auth/session";
import {
  canUserAccessRolePlay,
  canUserManageRolePlay,
  canUserTakeRolePlay,
} from "@/src/lib/roleplays/access";
import {
  canPersistRolePlayAttempts,
  getServerRolePlayAttemptStatus,
  recordServerRolePlayAttemptCompletion,
  resetServerRolePlayAttempt,
} from "@/src/lib/roleplays/serverAttempts";
import { getRolePlayConfigById } from "@/src/lib/roleplays/serverStorage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function targetUserIdFromRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("userId")?.trim() ?? "";
}

function isAssignedLearner(roleplay: Awaited<ReturnType<typeof getRolePlayConfigById>>, userId: string) {
  return Boolean(roleplay?.settings.assignedTraineeIds?.includes(userId));
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const { id } = await context.params;
  const requestedUserId = targetUserIdFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canPersistRolePlayAttempts()) {
    return NextResponse.json(
      { error: "Database is not configured for shared attempt tracking." },
      { status: 503 },
    );
  }

  const roleplay = await getRolePlayConfigById(id);
  if (!roleplay) {
    return NextResponse.json({ error: "Roleplay not found." }, { status: 404 });
  }

  if (!canUserAccessRolePlay(session, roleplay)) {
    return NextResponse.json({ error: "Roleplay access denied." }, { status: 403 });
  }

  if (requestedUserId) {
    if (!canUserManageRolePlay(session, roleplay)) {
      return NextResponse.json({ error: "Only course admins can inspect learner attempts." }, { status: 403 });
    }

    if (!isAssignedLearner(roleplay, requestedUserId)) {
      return NextResponse.json({ error: "Only assigned learner attempts are tracked." }, { status: 400 });
    }

    const attemptStatus = await getServerRolePlayAttemptStatus(requestedUserId, id, roleplay);
    return NextResponse.json({ attemptStatus });
  }

  if (canUserManageRolePlay(session, roleplay) || !canUserTakeRolePlay(session, roleplay)) {
    return NextResponse.json({ attemptStatus: null, unlimited: true });
  }

  const attemptStatus = await getServerRolePlayAttemptStatus(session.id, id, roleplay);
  return NextResponse.json({ attemptStatus });
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const { id } = await context.params;

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!canPersistRolePlayAttempts()) {
    return NextResponse.json(
      { error: "Database is not configured for shared attempt tracking." },
      { status: 503 },
    );
  }

  const roleplay = await getRolePlayConfigById(id);
  if (!roleplay) {
    return NextResponse.json({ error: "Roleplay not found." }, { status: 404 });
  }

  if (!canUserAccessRolePlay(session, roleplay)) {
    return NextResponse.json({ error: "Roleplay access denied." }, { status: 403 });
  }

  if (canUserManageRolePlay(session, roleplay)) {
    return NextResponse.json({ attemptStatus: null, unlimited: true });
  }

  if (!canUserTakeRolePlay(session, roleplay)) {
    return NextResponse.json(
      { error: "Only assigned learner attempts are tracked." },
      { status: 400 },
    );
  }

  const currentStatus = await getServerRolePlayAttemptStatus(session.id, id, roleplay);
  if (currentStatus.locked) {
    return NextResponse.json({ attemptStatus: currentStatus });
  }

  const attemptStatus = await recordServerRolePlayAttemptCompletion(session.id, id, roleplay);
  return NextResponse.json({ attemptStatus });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const { id } = await context.params;
  const targetUserId = targetUserIdFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  if (!canPersistRolePlayAttempts()) {
    return NextResponse.json(
      { error: "Database is not configured for shared attempt tracking." },
      { status: 503 },
    );
  }

  const roleplay = await getRolePlayConfigById(id);
  if (!roleplay) {
    return NextResponse.json({ error: "Roleplay not found." }, { status: 404 });
  }

  if (!canUserManageRolePlay(session, roleplay)) {
    return NextResponse.json(
      { error: "Only the course owner or root admin can reset learner attempts." },
      { status: 403 },
    );
  }

  if (!isAssignedLearner(roleplay, targetUserId)) {
    return NextResponse.json(
      { error: "Only assigned learner attempts are tracked." },
      { status: 400 },
    );
  }

  const attemptStatus = await resetServerRolePlayAttempt(targetUserId, id, roleplay);
  return NextResponse.json({ attemptStatus });
}
