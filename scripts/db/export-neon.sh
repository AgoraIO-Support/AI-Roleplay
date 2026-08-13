#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUTPUT_FILE="${1:-${BACKUP_DIR}/neon-${TIMESTAMP}.dump}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required. Install PostgreSQL client tools first." >&2
  echo "macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if [[ -z "${NEON_DATABASE_URL:-}" ]]; then
  echo "NEON_DATABASE_URL is required." >&2
  echo "Use Neon's direct/unpooled connection string, not the pooled connection string." >&2
  echo "Example:" >&2
  echo "  NEON_DATABASE_URL='postgresql://USER:PASSWORD@HOST/DB?sslmode=require' npm run db:export:neon" >&2
  exit 1
fi

if [[ "${NEON_DATABASE_URL}" == *"-pooler."* ]]; then
  echo "This looks like a pooled Neon connection string." >&2
  echo "Use the direct/unpooled Neon connection string for pg_dump." >&2
  exit 1
fi

mkdir -p "$(dirname "${OUTPUT_FILE}")"

echo "Exporting Neon database to ${OUTPUT_FILE}"
pg_dump \
  -Fc \
  -v \
  --no-owner \
  --no-acl \
  -d "${NEON_DATABASE_URL}" \
  -f "${OUTPUT_FILE}"

echo "Done: ${OUTPUT_FILE}"
