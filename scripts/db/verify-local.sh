#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required. Install PostgreSQL client tools first." >&2
  echo "macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if [[ -z "${LOCAL_DATABASE_URL:-}" ]]; then
  echo "LOCAL_DATABASE_URL is required." >&2
  echo "Example:" >&2
  echo "  LOCAL_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/cse_training_partner_local?schema=public' npm run db:verify:local" >&2
  exit 1
fi

echo "Checking local database tables and row counts..."
psql "${LOCAL_DATABASE_URL}" <<'SQL'
\dt
select 'AppUser' as table_name, count(*) from "AppUser"
union all
select 'RolePlay', count(*) from "RolePlay"
union all
select 'TranscriptSession', count(*) from "TranscriptSession"
union all
select 'FinalAssessment', count(*) from "FinalAssessment"
union all
select 'RolePlayAttempt', count(*) from "RolePlayAttempt";
SQL
