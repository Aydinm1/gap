# GAP Operations Guide

**Status:** Active
**Last updated:** 2026-09-14
**Source of truth for:** Local setup, environment variables, external configuration, and deployment

This file defines the intended operating procedure. Steps marked **Pending** have not yet
been configured or verified.

The current Phase 4 admin workspace is a session-only prototype backed by hardcoded mock
identity and data. Its authorization helper, file-download affordance, and mutations are
not production authentication, Storage, or persistence. Admin and member mock stores are
separate, so admin edits intentionally do not appear in member pages yet.
Member submissions and entered drafts persist across client navigation within the portal.
Reloading resets this in-memory state. Sample file actions explain unavailable downloads;
this does not constitute a live upload or private Storage implementation.

## Local development

1. Install Node.js 24 LTS. The recommended machine setup is Homebrew-installed `fnm` with
   `eval "$(fnm env --use-on-cd --shell zsh)"` in `.zshrc`; `.nvmrc` selects Node 24 in
   this repository.
2. Verify `node --version` reports `v24.x`, then run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Supply values from the existing Supabase project's Connect dialog.
5. Apply committed migrations and seed data using the Supabase CLI or SQL Editor as
   documented with the migration deliverable.
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
- Apply development seed data and replace sample roster emails before production.
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
Monday permissions. Normal `npm test` runs without Docker; `test:enrollment` is an
explicit additional gate. Generated Supabase client types and regeneration tooling remain
part of the unfinished P5 client layer; this change has no database client or TypeScript
schema mirror. The SQL signature in the data model is the current operation contract.

## Google OAuth configuration — Pending

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
