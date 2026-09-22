# GAP Operations Guide

**Status:** Active
**Last updated:** 2026-09-20
**Source of truth for:** Local setup, environment variables, external configuration, and deployment

This file defines the intended operating procedure. Steps marked **Pending** have not yet
been configured or verified.

P5 now has Supabase-backed reads, server mutations, and Google sign-in code. Full local
workflow and authorization acceptance is still pending. Missing configuration shows a
setup error, not mock data. Only unsaved drafts are session-local. File uploads are disabled
until P6; Google provider configuration has not been verified.

## Local development

1. Install native `fnm` through Apple Silicon Homebrew or the official universal macOS
   release, then `fnm install 24` and `fnm default 24`. Initialize `fnm env --use-on-cd
   --shell zsh` in the shell profile and run `fnm use` in interactive shells. `.nvmrc`
   selects Node 24 in this repository. Login-only automation shells also need initialization.
2. Verify `node --version` reports `v24.x`, then run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Install and start Docker Desktop matching the machine architecture. Run `npm run db:start`
   to start the local Supabase stack and apply migrations on first creation. Automatic
   demo seeding is disabled; a fresh program starts empty.
5. Run `npx supabase status` and place the local API URL and public anon/publishable key in
   `.env.local`. Do not use hosted credentials for this milestone. Existing local databases
   need `npx supabase migration up --local` after pulling new migrations. Do not reset a
   database containing work you want to keep.
6. Run `npm run dev` and open `http://localhost:3000`.

## Environment contract

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Current publishable browser key |
| `NEXT_PUBLIC_SITE_URL` | Public | Environment-specific canonical application origin used for OAuth redirects |

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name may be documented as a compatibility
alternative if the project exposes only a legacy anon key, but implementation should use
one naming convention consistently. Never commit `.env.local` or a service-role key.

## Supabase project configuration — Pending

- Apply schema, functions, indexes, grants, and RLS migrations.
- Use demo seeds only in a disposable local development database, never production.
- Create a private `submissions` bucket with the documented size and MIME restrictions.
- Apply Storage policies from committed migrations.
- Add the two initial professional-development leads to `approved_members` as admins.
- Verify all table and Storage policies with distinct member and admin accounts.

## Enrollment foundation — Local database validation

Two ordered migrations in `supabase/migrations/` create the enrollment-only foundation
and private Monday linking operation. They assume the Supabase roles `anon`,
`authenticated`, and `service_role` exist. Apply them in filename order to a fresh
Supabase database as the migration owner. Existing manually created tables require a
schema reconciliation first; these migrations deliberately do not silently skip conflicts.
Hosted migration application and Supabase Auth/PostgREST verification remain **Pending**.
Do not expose the `private` schema or grant browser roles access to its functions.

For isolated SQL verification, start Docker and run:

```bash
docker run --detach --rm --network none --name gap-enrollment-tests --label gap.test=enrollment -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
docker exec gap-enrollment-tests pg_isready -U postgres
GAP_TEST_CONTAINER=gap-enrollment-tests npm run test:enrollment
docker stop gap-enrollment-tests
```

Wait until `pg_isready` succeeds before running the suite. The container publishes no
ports. The suite verifies its label, creates a uniquely named empty database, supplies
Supabase role fixtures, applies migrations, runs transaction/concurrency/permission tests,
and deletes only that test database. Stopping this `--rm` container removes its disposable
data. Do not point the suite at an existing project database.

Local PostgreSQL tests validate SQL behavior, not Google login, hosted RLS setup, or
Monday permissions. Normal `npm test` runs without Docker; `test:enrollment` retains the
isolated first-two-migration tests. `npm run test:program` requires local Supabase and
creates/removes isolated fictional Auth users and program records. It uses Auth-issued
fixture sessions, not real Google OAuth; never count it as provider verification.

Regenerate types after local migrations with
`npx supabase gen types typescript --local --schema public,private`, saving the result to
`src/lib/supabase/database.types.ts`, then review its diff. Run `npm run test:db-types`
to check consistency against local Supabase. This check passed after the review-receipt
migration.

### Apple Silicon migration verified (2026-09-20)

Intel Docker and fnm caused `EBADARCH` after migration to the M1 Mac. Installed official
Apple Silicon Docker Desktop (verified code signature), universal fnm 1.39.0 in
`~/.local/bin`, and Node 24.21.0 ARM64 with npm 11.19.0. Fresh login and interactive
shells now select native Node. Docker Engine 29.8.0 reports `aarch64`; Supabase CLI 2.117.0
runs natively. No containers were listed after startup; database setup/acceptance remains
pending, not implicitly verified by Docker startup.

The old Docker app and obsolete Intel fnm command link were moved to
`~/Library/Application Support/GAP-toolchain-backup-20260920/` for rollback. Docker data
and settings were not deleted. Existing Intel Homebrew packages and the older universal
system Node remain installed to avoid disrupting unrelated projects; the new fnm takes
precedence. This is a GAP toolchain migration, not a whole-machine Intel software purge.

Reinstalled dependencies from the unchanged lockfile with `npm ci --ignore-scripts` and
moved the old `.next` cache to the migration's temporary directory. Normal Turbopack build,
typecheck, lint, and all 37 unit/documentation tests pass on Node 24. Dependency audit
reports Next.js critical and sharp/js-yaml high advisories; security patching remains a
separate pending change. No hosted configuration was changed.

### Local validation follow-up (2026-09-21)

Local Supabase subsequently applied all migrations and fictional seeds successfully.
Repeating the seed preserved 12 weeks, 2 assignments, and 4 submissions. The 39 unit/docs
tests, 9 isolated enrollment tests, and local Supabase suite (7 scenarios plus parent)
passed, including HTTP layout checks with fixture sessions. Generated-type consistency,
lint, typecheck, and production build passed. Next.js/eslint-config-next were aligned at
16.3.5 and compatible sharp/js-yaml updates resolved the audit findings (zero reported).
These results supersede the initial migration-day pending checks above; they do not
verify protected interactive browser workflows, session expiry, or real Google OAuth.

## Demo data cleanup and recovery

Automatic seeding is disabled. `npm run db:seed:demo` explicitly loads the fictional
seed into the fixed local `supabase_db_gap` container; use it only in disposable local
workspaces. Tests and development UI fixtures remain available without live demo records.

`npm run db:clean:demo` inventories and validates seed-only dependencies without deleting.
`npm run db:clean:demo -- --apply` creates a private, git-ignored backup and removes the
verified seed in one transaction. Edited records, real participants, profiles, Monday
mappings, unexpected dependencies, and concurrent changes cause an abort for manual
review. This conservative tool does not clean arbitrary test data or reset Auth.

The local cleanup removed 3 fictional people/roster entries, 2 cohorts, 6 enrollments,
12 weeks, 2 assignments, and 4 submissions. No resources or fictional profiles existed.
The real admin/Auth account was preserved. Backup directory:
`.local-backups/demo-cleanup-1790047481676` (`records.json` and `restore.sql`).

To recover this exact snapshot, inspect the backup and confirm the removed IDs have not
been reused, then run from the repository root:

```sh
docker exec -i supabase_db_gap psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < .local-backups/demo-cleanup-1790047481676/restore.sql
```

Recovery runs transactionally and fails on conflicts; do not truncate or overwrite new
work to force a restore. The backup contains local data: keep it private and uncommitted.
Normal startup does not reinsert demo data. Create the real cohort through admin.

## P6 prerequisites

Local startup still excludes `storage-api`. P6 must enable Storage and add the private
bucket/policies before enabling file UI. Link submissions already persist. File uploads,
historical downloads, retries, orphan cleanup, and Storage authorization tests remain
pending; see the ordered Phase 6 checklist. No hosted Storage is configured.

## Google OAuth configuration — Pending

### Local development

`Unsupported provider: provider is not enabled` from `127.0.0.1:54321` means local
Supabase Auth has not enabled Google. Hosted dashboard settings do not configure this
local instance. Google is now configured locally; real sign-in remains unverified.

1. Configure Google Auth Platform branding/audience and create a **Web application**
   OAuth client. If using a testing audience, allow the intended test accounts.
2. Use `http://localhost:3000` as the authorized JavaScript origin and
   `http://127.0.0.1:54321/auth/v1/callback` as the authorized redirect URI.
3. Save credentials in the git-ignored repository-root `.env.local`. The project's
   `npm run db:start` explicitly loads this file for the CLI. Never commit or share secrets,
   or give them a `NEXT_PUBLIC_` prefix:

   ```dotenv
   OAUTH_CLIENT_ID=your-client-id
   OAUTH_CLIENT_SECRET=your-client-secret
   ```

4. This section is now configured in `supabase/config.toml`:

   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(OAUTH_CLIENT_ID)"
   secret = "env(OAUTH_CLIENT_SECRET)"
   skip_nonce_check = false
   ```

5. Run `npx supabase stop` followed by `npm run db:start`. Do not use `--no-backup`
   or reset the database for this configuration change. Start a fresh sign-in from
   `http://localhost:3000/login`, not the previous failed authorization URL.
6. Verify with an approved, active UC Davis Google account. A valid Google login alone
   must not grant GAP access; the active roster requirement still applies.

The Google redirect above returns to **Supabase Auth**, not the application's
`http://localhost:3000/auth/callback`. The latter is already in the local Supabase
redirect allowlist. Real sign-in remains unverified until this entire flow succeeds.
See the official [Google provider guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
and [local config/secrets guide](https://supabase.com/docs/guides/local-development/managing-config).

### Hosted deployment

1. In Google Cloud, configure an OAuth consent screen for the appropriate audience.
2. Create a Web application OAuth client.
3. Add the Supabase provider callback URI shown in Supabase's Google provider settings
   as an authorized redirect URI in Google Cloud.
4. Add the Google client ID and secret to Supabase Auth → Providers → Google and enable
   the provider.
5. Configure the app to pass `hd=ucdavis.edu` as a sign-in hint only. Server-side domain
   and roster checks remain mandatory.

Do not document guessed callback URLs: copy the exact callback URI from the connected
Supabase project when configuration is performed.

## Supabase URL configuration — Pending

- Set Site URL to the production Vercel origin.
- Allow `http://localhost:3000/auth/callback` for local development.
- Allow the exact production `/auth/callback` URL.
- Add a deliberately scoped Vercel preview pattern only if preview OAuth is required.
- Test sign-in, denied roster access, sign-out, and expired-session refresh.

## Vercel deployment — Pending

1. Connect the repository to Vercel.
2. Add all public environment values separately for Development, Preview, and Production
   as appropriate.
3. Deploy and update Supabase URL configuration with the final production origin.
4. Run the production build and smoke-test both roles.
5. Verify private files cannot be opened without authorization.

## Monday.com integration — Pending

### Manual accepted-member import

Use `MONDAY_MEMBERS_BOARD_ID` (preferred); `MONDAY_APPLICANTS_BOARD_ID` is a legacy
alias and conflicting values fail closed. No acceptance-status column is required.
`MONDAY_MEMBER_STATUS_COLUMN_ID` supplies informational status only.
Add a server-only `SUPABASE_SECRET_KEY` from the same local Supabase instance to ignored
`.env.local`; never prefix it with NEXT_PUBLIC or commit it. Missing configuration fails
closed. Apply migrations and regenerate types before using Sync from Monday in Members.
The reader uses API version 2026-04, bounded retries, timeouts, and full pagination.
Account 36481323 and board 18426968533 column types were verified read-only. No real
members were enrolled during verification and no Monday writes are implemented.

Run rollback-only SQL checks:
`docker exec -i supabase_db_gap psql -X -U postgres -d postgres < scripts/verify-monday.sql`.
Browser and extended concurrency/failure acceptance remain pending; P5/P7 gates stay open.
Earlier applicant-board/acceptance-status instructions below are superseded by this
accepted-members intake; outbound reporting/result configuration remains future work.

`.env.example` includes optional, server-only preparation placeholders. Save actual
values in ignored `.env.local`: `MONDAY_API_TOKEN` for a personal API token,
`MONDAY_ACCOUNT_ID`, `MONDAY_APPLICANTS_BOARD_ID`, and optional
`MONDAY_REPORTING_BOARD_ID`. Applicant mappings use internal column IDs in
`MONDAY_EMAIL_COLUMN_ID`, `MONDAY_ACCEPTANCE_STATUS_COLUMN_ID`,
`MONDAY_ENROLL_IN_GAP_COLUMN_ID`, and `MONDAY_COHORT_COLUMN_ID`.
Leave unknown values blank. These names are proposed adapter configuration, not active
runtime requirements; filling them in does not enable enrollment or reporting.
Acceptance values, cohort mapping, result columns, and reporting fields still need
verification before integration. Monday app client/signing secrets are not personal API
tokens; app/OAuth credentials require a separately selected adapter flow.
Personal tokens inherit their owner's permissions; use an appropriately restricted
account. Never commit tokens or expose them through `NEXT_PUBLIC_` variables.
See [Monday authentication](https://developer.monday.com/api-reference/docs/authentication).

- Confirm the application form, recruiting board, club roster, cohort records, and their
  owners. Monday form intake is the expected direction, not verified configuration.
- Configure an unchecked-by-default “Enroll in GAP” checkbox on applicant records and
  restrict enrollment approval to authorized GAP leads. Acceptance alone must not trigger
  provisioning. Verify the permission mechanism before enabling the integration.
- Configure separate enrollment result/timestamp/error fields and map the target cohort.
  Verify invalid requests grant no access, successful requests provision member access,
  retries preserve history/roles, and unchecking does not revoke or delete anything.
- Confirm which leaders can see individual progress and where aggregate club reports go.
- Map approved fields using [the product reporting scope](product-spec.md#mondaycom-recruiting-and-club-reporting--planned)
  and [the data contract](data-model.md#monday-reporting-contract--planned).
- Select and verify server-side credentials, transport, sync frequency, external-record
  mapping, retries, and reconciliation before adding exact environment/setup instructions.
- Verify duplicate delivery, returning applicants, prior-cohort retention, email changes,
  unavailable Monday service, stale reports, and enrollment/access boundaries.
- Verify exported summaries exclude files, submitted URLs, written feedback, reviewer
  notes, private file links, and credentials. Confirm GAP links require authorization.

No Monday form, board, automation, credential, or sync has been configured by this work.

## Validation commands

The repository provides:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`NEXT_PUBLIC_SITE_URL` is `http://localhost:3000` locally and the final deployment origin
in production. A Vercel preview origin is used only if preview OAuth is deliberately
enabled. Never run a formatter in write mode merely to inspect the repository.

## Troubleshooting record

When resolving a recurring operational issue, add a short entry with symptoms, verified
cause, safe resolution, and date. Never include tokens, secrets, private submission URLs,
or personal data.
