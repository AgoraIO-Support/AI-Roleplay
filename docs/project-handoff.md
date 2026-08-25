# CSETrainingPartner Project Handoff

Last updated: August 25, 2026

## Project Snapshot

- Project path: `/Users/admin/Documents/CSETrainingPartner`
- Framework: Next.js 16
- Language/runtime: TypeScript, React 19
- ORM: Prisma
- Database: PostgreSQL
- Current database provider: Neon
- Target database provider: AWS RDS PostgreSQL
- Hosting direction: Vercel for near-term testing; AWS App Runner is the likely AWS hosting target later.

## Current Architecture

- Authentication is intended to use only persisted `AppUser` records through Prisma.
- Alpha/default/mock users should not be used before AWS deployment.
- Main Prisma schema: `prisma/schema.prisma`
- Prisma migrations: `prisma/migrations/`
- Main Prisma client helper: `src/lib/db/prisma.ts`
- Primary auth/user storage: `src/lib/auth/userStore.ts`
- Session handling: `src/lib/auth/session.ts`
- Session cookie name: `cse_auth_session`

## Important Data Models

- `AppUser` stores real application users and roles.
- Roleplay course data is stored through Prisma when `DATABASE_URL` is configured.
- Final assessments, transcripts, attempts, and activity logs are database-backed when the database is configured.
- The app should not rely on tracked sample users, alpha users, or mock auth data.

## Important Environment Variables

Do not paste real secret values into chat. Use secure environment variable settings in Vercel, AWS App Runner, or AWS Secrets Manager.

Required/core:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `NEXT_PUBLIC_AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`
- `AGORA_CUSTOMER_ID`
- `AGORA_CUSTOMER_SECRET`

ConvoAI / voice roleplay:

- `CONVOAI_BASE_URL`
- `CONVOAI_ASR_PROVIDER`
- `CONVOAI_LLM_PROXY_URL`
- `CONVOAI_TTS_PROVIDER`
- `CONVOAI_TTS_URL`
- `CONVOAI_MINIMAX_TTS_MODEL`
- `CONVOAI_TTS_SPEED`
- `CONVOAI_TTS_VOICE`

LLM/evaluation:

- `OSS_API_KEY`
- `OSS_MODEL`
- `OSS_REASONING_EFFORT`
- `OBJECTIVE_EVALUATOR_PROVIDER`
- `OBJECTIVE_EVALUATOR_API_KEY`
- `OBJECTIVE_EVALUATOR_MODEL`
- `OBJECTIVE_EVALUATOR_BASE_URL`
- `OBJECTIVE_EVALUATOR_WIRE_API`
- `OBJECTIVE_EVALUATOR_MIN_CONFIDENCE`
- `FINAL_ASSESSMENT_PROVIDER`
- `FINAL_ASSESSMENT_API_KEY`
- `FINAL_ASSESSMENT_MODEL`
- `FINAL_ASSESSMENT_BASE_URL`
- `FINAL_ASSESSMENT_WIRE_API`

## Recent Work Completed In This Thread

- Removed alpha/default user environment variables from `.env.example`.
- Removed alpha auth fallback logic and the old alpha user file.
- Refactored authentication to use only Prisma `AppUser` records.
- Renamed mock/alpha-facing helpers and components to production names:
  - `components/auth/role-guard.tsx`
  - `components/dashboard/dashboard.tsx`
  - `lib/authz.ts`
  - `lib/navigation.ts`
- Removed unused mock/sample dashboard data and unused dashboard cards/services.
- Removed seed/default user wording from profile and admin user delete messages.
- Updated roleplay preview/session loading so missing server course data does not fall back to a sample config.
- Updated ConvoAI session/channel naming to avoid mock-specific naming.

## Validation Commands

Run these before committing or deploying:

```bash
npm run typecheck
npm run build
```

Both commands passed after the DB-only auth cleanup in this thread.

## Deployment Notes

- For Vercel testing with AWS RDS, `DATABASE_URL` must point to the AWS RDS PostgreSQL connection string.
- Include `sslmode=require` in the PostgreSQL URL when connecting to RDS from hosted environments.
- If Vercel is used with AWS RDS, consider Vercel Static IPs for a safer RDS security-group allowlist.
- If moving fully to AWS, AWS App Runner plus AWS RDS PostgreSQL is preferred over manually managing EC2.
- Existing Vercel `ALPHA_*` variables can be removed.

## Neon To AWS RDS Migration Notes

Useful repo helpers:

- `scripts/db/export-neon.sh`
- `scripts/db/restore-local.sh`
- `scripts/db/verify-local.sh`
- `docs/neon-local-export.md`

Useful npm scripts:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run db:export:neon
npm run db:restore:local
npm run db:verify:local
```

Recommended migration flow:

1. Export the Neon PostgreSQL database with `pg_dump`.
2. Restore into AWS RDS PostgreSQL with `pg_restore` or `psql`.
3. Run Prisma migrations with `npm run prisma:deploy` using the AWS RDS `DATABASE_URL`.
4. Verify key tables such as `AppUser`, roleplays, attempts, assessments, transcripts, and activity logs.

## Safety Notes For Future AI Agents

- Do not print or expose real `.env`, `.env.local`, database URLs, API keys, or certificates.
- Prefer `.env.example` for variable names only.
- Use official Agora docs/MCP before changing Agora SDK or ConvoAI-specific behavior.
- Avoid destructive git commands unless explicitly requested.
- Preserve user changes in a dirty working tree.

