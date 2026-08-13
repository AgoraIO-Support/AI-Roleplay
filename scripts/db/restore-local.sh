#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DUMP_FILE="${1:-}"

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "pg_restore is required. Install PostgreSQL client tools first." >&2
  echo "macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if [[ -z "${LOCAL_DATABASE_URL:-}" ]]; then
  echo "LOCAL_DATABASE_URL is required." >&2
  echo "Example:" >&2
  echo "  LOCAL_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5432/cse_training_partner_local?schema=public' npm run db:restore:local -- backups/neon.dump" >&2
  exit 1
fi

if [[ -z "${DUMP_FILE}" ]]; then
  DUMP_FILE="$(find "${ROOT_DIR}/backups" -maxdepth 1 -name "neon-*.dump" -type f 2>/dev/null | sort | tail -n 1)"
fi

if [[ -z "${DUMP_FILE}" || ! -f "${DUMP_FILE}" ]]; then
  echo "Dump file not found. Pass a dump path or run npm run db:export:neon first." >&2
  exit 1
fi

echo "Restoring ${DUMP_FILE} into local database."
echo "Target: ${LOCAL_DATABASE_URL}"
pg_restore \
  -v \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  -d "${LOCAL_DATABASE_URL}" \
  "${DUMP_FILE}"

echo "Done: local database restored."
