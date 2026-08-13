# Neon to Local Database Export

Use this when you want a local PostgreSQL copy of the current Neon database before AWS migration.

## Safety Rules

- Do not commit Neon, local, or AWS database URLs.
- Do not commit files in `backups/`.
- Use Neon's direct/unpooled connection string for exports.
- A local restore is a snapshot, not ongoing synchronization. If Neon changes later, export and restore again.

## 1. Install PostgreSQL Client Tools

macOS:

```bash
brew install libpq
brew link --force libpq
```

Verify:

```bash
pg_dump --version
pg_restore --version
psql --version
```

## 2. Create a Local PostgreSQL Database

```bash
createdb cse_training_partner_local
```

Example local URL:

```bash
export LOCAL_DATABASE_URL='postgresql://YOUR_LOCAL_USER@localhost:5432/cse_training_partner_local?schema=public'
```

If your local PostgreSQL uses a password:

```bash
export LOCAL_DATABASE_URL='postgresql://YOUR_LOCAL_USER:YOUR_PASSWORD@localhost:5432/cse_training_partner_local?schema=public'
```

## 3. Export Neon to a Local Dump

Get the direct connection string from Neon, then run:

```bash
export NEON_DATABASE_URL='postgresql://USER:PASSWORD@HOST.neon.tech/DB_NAME?sslmode=require'
npm run db:export:neon
```

The script writes a timestamped file to:

```text
backups/neon-YYYYMMDDTHHMMSSZ.dump
```

You can also choose the output path:

```bash
NEON_DATABASE_URL='postgresql://...' npm run db:export:neon -- backups/neon-manual.dump
```

## 4. Restore the Dump Into Local PostgreSQL

Restore the latest dump:

```bash
export LOCAL_DATABASE_URL='postgresql://YOUR_LOCAL_USER@localhost:5432/cse_training_partner_local?schema=public'
npm run db:restore:local
```

Or restore a specific dump:

```bash
LOCAL_DATABASE_URL='postgresql://...' npm run db:restore:local -- backups/neon-manual.dump
```

The restore uses `--clean --if-exists`, so it replaces matching objects in the local database.

## 5. Verify Local Data

```bash
LOCAL_DATABASE_URL='postgresql://...' npm run db:verify:local
```

Expected app tables include:

- `AppUser`
- `RolePlay`
- `TranscriptSession`
- `FinalAssessment`
- `RolePlayAttempt`

## 6. Run the App Against Local PostgreSQL

Set `.env.local`:

```env
DATABASE_URL="postgresql://YOUR_LOCAL_USER@localhost:5432/cse_training_partner_local?schema=public"
```

Then:

```bash
npm run prisma:generate
npm run dev
```

Test login, course builder, roleplay attempts, transcripts, and assessments using the local database.

## 7. Later AWS Migration

For final AWS RDS migration, repeat the export from Neon just before cutover, then restore that dump into AWS RDS with `pg_restore`.
