# GAP MVP Implementation TODO

**Status:** Active
**Last updated:** 2026-10-20

Legend: `[ ]` pending · `[~]` active · `[x]` complete

This file tracks approved work. Product and technical rules live in `docs/`; completion
requires implementation, validation, documentation, and changelog agreement.

## Current checkpoint — 2026-10-20

- [x] Persistent local Supabase program, real Google sign-in, and a real approved admin
  are operational; the user completed a real Monday enrollment import successfully.
- [x] Login card and admin cohort switcher are implemented; detailed visual/accessibility
  checks remain listed below rather than implied by implementation.
- [x] P6 closeout: 48 unit/documentation test entries, 12 Storage entries with desktop/phone
  browser coverage, 8 program and 9 enrollment entries pass; lint, typecheck, generated-type
  consistency and Webpack production build pass. Test counts include suite/fixture entries.
- [x] Committed/pushed P6 and deferred deployment documentation through `7bd6e87` to
  `origin/main`; credentials and recovery backups were excluded. Subsequent P5/P7
  scoping, validation, tests, and checklist changes remain uncommitted.
- [x] User confirmed imported-member reload persistence, repeated preview showing Already
  linked without duplication, and real analyst program access/admin denial (2026-09-22).
- [x] Local P5/P7 closeout (2026-10-20): 50 unit/documentation, 12 program, 12 Storage,
  and 9 enrollment test entries pass; lint, typecheck, generated types, and Webpack build
  pass. Production-mode desktop/phone program, refresh, sign-out, and mutation checks pass.
- [ ] Finish extended Monday tests, responsive/accessibility polish, second-lead
  provisioning, and hosted configuration. Local core P5/P6/session verification is
  complete; this is not hosted-deployment acceptance. Attendance remains deferred.

## Phase 0 — Documentation and repository foundation

- [x] Create the documentation map and domain-specific source-of-truth files.
- [x] Add AI contributor reading order, documentation rules, and definition of done.
- [x] Add ADR conventions and record the documentation-system decision.
- [x] Add the changelog and this phased execution tracker.
- [x] Add `.env.example` with Supabase URL, publishable key, and site URL placeholders.
- [x] Add `typecheck` and test scripts without adding unnecessary tooling.
- [x] Normalize approved logo copies into `public/brand/`; preserve originals in
  `design_references/Official Logos/`.
- [x] Replace the starter favicon with an approved compact brand asset.
- [x] Reconcile the existing dark GAP landing experiment with the approved light-first
  design direction without discarding useful work.

### Phase 0 gate

- [x] `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- [x] Documentation links resolve and current git changes are reviewed for accidental
  deletion or secret files.

### Stable toolchain baseline

- [x] Standardize the machine and repository on Node.js 24 LTS through `fnm`, `.nvmrc`,
  and the package engine contract.
- [x] Use the current secure stable Next.js 16.3 release with matching
  `eslint-config-next`; retain the current stable React 19.2 pair.
- [x] Regenerate the lockfile and pass clean install, dependency-tree, audit, and complete
  project validation under Node.js 24.

## Phase 1 — Visual system and mock data

- [x] Replace Geist/Arial usage with Montserrat through `next/font` and define Tailwind 4
  theme tokens for the approved palette and neutral scale.
- [x] Build accessible primitives for buttons, badges, progress, cards, fields, errors,
  empty states, and page containers without introducing a broad UI dependency.
- [x] Build the responsive brand header, profile menu shell, and member/admin navigation.
- [x] Create typed view models and realistic Fall 2026 seed/mock data for all six weeks.
- [x] Populate Week 2 with realistic workshop, resource, assignment, deadline, submission,
  and feedback examples.
- [x] Centralize deadline formatting and assignment/module state derivation.
- [x] Add mock roles/states that make member and admin flows navigable before OAuth.

### Phase 1 gate

- [x] Brand assets, type, color, spacing, focus, and contrast match
  `docs/design-system.md` at mobile and desktop widths.
- [x] Mock types prevent invalid file/link and stored-overdue states.
- [x] Lint, typecheck, and production build pass.

## Phase 2 — Student dashboard

- [x] Build `/` with user greeting, Fall 2026 status, current week, progress text,
  and thin progress bar.
- [x] Add the featured continue-learning card for the current actionable published week.
- [x] Show the nearest upcoming or overdue assignment with a semantic status badge.
- [x] Render all six modules in a restrained ordered list/card treatment.
- [x] Show draft weeks as locked number/title cards without leaking protected content.
- [x] Link published modules to their week route and provide useful empty/error states.
- [x] Make the dashboard excellent on small screens with prominent deadlines and
  thumb-friendly actions.

### Phase 2 gate

- [x] Dashboard answers the five priority questions defined in the product spec without
  fake analytics or out-of-scope features.
- [ ] Keyboard, narrow-mobile, tablet, and desktop checks pass.
- [x] Lint, typecheck, and production build pass.

## Phase 3 — Week detail and mock submission flow

- [x] Build `/week/[weekNumber]` using Next.js 16 async `params` conventions.
- [x] Add program back-link, numbered title, description, workshop presentation, and
  ordered resource list.
- [x] Add assignment instructions, explicit Pacific deadline, and derived state.
- [x] Build file selection with PDF/DOCX/PPTX/XLSX and 20 MB validation.
- [x] Build `http`/`https` link submission with clear validation.
- [x] Show submitted timestamp, original filename or URL, view, and replace actions.
- [x] Show admin feedback and completed/revision-requested outcomes when present.
- [x] Keep week instructions primary and move feedback, revision, and history into a
  focused member submission-review route.
- [x] Unify workshop slides and ordered references into one coherent materials list and
  simplify the assignment workspace hierarchy.
- [x] Recompose submission review around open feedback, a compact submitted-work record,
  a full-width revision editor, and quiet retained history.
- [x] Strengthen feedback emphasis, enlarge the current-work record, and make every
  retained submission attempt viewable.
- [x] Unify week and submission-review hierarchy through shared page rhythm and a common
  submitted-work record.
- [x] Preserve mock resubmission history and display current versus prior attempts.
- [x] Add invalid week, locked draft, missing assignment, validation, and failure states.

### Phase 3 gate

- [x] A mock member can learn, submit either method, replace, and view feedback end to end.
- [x] Verify functional submission/replacement controls at 390px in the P6 browser flow.
- [ ] Finish keyboard, screen-reader, and zoom accessibility checks for submission controls.
- [x] Lint, typecheck, and production build pass.

## Phase 4 — Mock admin experience

- [x] Build Fall/Winter/Spring cohort creation, active/archive views, and cohort switching.
- [x] Build cohort rosters with permanent participant history and participation,
  advancement, and promoted-response controls.
- [x] Show transparent cohort starters, advancement rate, offer yield, end-to-end
  conversion, pending, and withdrawn summary values without charts.
- [x] Build admin-only layout and navigation with an obvious return to the member portal.
- [x] Build `/admin` with active-member and mutually exclusive review-state counts.
- [x] Build a week/status/search-filterable submission matrix with URL-preserved context
  and responsive table/card behavior.
- [x] Build `/admin/submissions/[id]` with member, assignment, timestamp, current
  submission, and history.
- [x] Add file/link opening, written feedback, and awaiting-review/revision-requested/
  complete controls.
- [x] Build `/admin/weeks` and `/admin/weeks/[id]` for week, slides, assignment, deadline,
  publication, and ordered resource editing.
- [x] Build `/admin/members` for roster add/edit, role, activation, and deactivation.
- [x] Add validation, unsaved/submitting states, empty states, safe destructive-action
  confirmations, and Pacific daylight-saving deadline handling where needed.

### Phase 4 gate

- [x] Automated admin checks cover mock-role rejection, queue selection/filtering,
  cohort/roster/publishing validation, and Pacific deadline edge cases (2026-09-14).
- [x] Browser-verify authenticated fixture-admin download/review and member feedback at
  desktop and phone widths (P6, 2026-09-23).
- [x] Browser-verify content publishing and roster workflows at mobile and desktop widths
  against the persistent authenticated implementation.
- [x] Replace the hardcoded mock admin identity with server-side authorization before
  claiming members cannot reach or trigger admin behavior.
- [x] Lint, typecheck, and production build pass.

Audit note (2026-09-14): all 36 automated tests, lint, and typecheck pass. The production
build checkbox reflects prior validation, not a new build in this audit. Mock feature
implementation is complete; the browser workflow gate remains unverified. Real admin
authorization depends on the Phase 5/7 backend and authentication work and is not supplied
by the mock-role test.

## Phase 5 — Supabase schema, seeds, and data access

**Local core accepted (2026-10-20):** Migrations, repeatable seed execution, and regression
suites pass; see the current checkpoint for counts. Authenticated desktop/phone publishing,
roster editing, submission, review, feedback, reload, and replacement/history are verified.
Successful expired-token refresh, revoked-refresh rejection, browser sign-out/back/forward
navigation, and direct non-upload action authorization also pass. Broader responsive and
accessibility checks below remain separate polish work; hosted setup is not verified.
Real local Google/admin sign-in worked, and the user confirmed real analyst access and
admin denial on 2026-09-22. Fixture sessions alone do not count as Google-login verification.
Generated types, lint, typecheck, and the Webpack production build pass; the default
Turbopack environment failure remains open below.

- [x] Replace GAP's Intel-only Docker/fnm tooling and reinstall project dependencies for
  Apple Silicon; verify native engine, shell runtime, build, lint, typecheck, and tests.
- [x] Patch the audited Next.js critical and sharp/js-yaml high dependency advisories,
  keeping Next.js and eslint-config-next aligned, then rerun full verification.

### Member refinement follow-up

- [x] Attach continuation to the module panel and verify desktop, phone, and navigation.

- [x] Replace the dashboard overview card with a thin continuation bar and remove
  assignment and feedback summaries.

- [x] Prioritize Continue Week on the dashboard and demote feedback to a secondary link.

- [x] Restore distinct module status icons and pair featured week context with a compact
  assignment summary; inspect the rendered desktop dashboard.

- [x] Unify dashboard next-step hierarchy, member heading scale, materials anchors, and
  submission metadata presentation.
- [x] Share member attempts and drafts across dashboard, week, and review navigation;
  preserve unrelated assignments during replacement.
- [x] Clarify awaiting-review status, file/link actions, validation help, and editor focus.
- [ ] Browser-verify the member navigation and draft flow at 375px, 768px, and 1280px.

- [x] Install `@supabase/supabase-js` and `@supabase/ssr` dependencies.
- [x] Add ordered SQL migrations for people, Fall/Winter/Spring cohorts, enrollments,
  outcomes, content, submissions, constraints, timestamps, indexes, and
  private authorization helpers defined in `docs/data-model.md`.
- [x] Add the safe authenticated week-catalog function for locked draft cards.
- [x] Add RLS grants and policies for profiles, roster, weeks, resources, assignments, and
  submissions.
- [x] Add realistic idempotent seed data for six weeks and Week 2 details without shipping
  real personal data; include fictional active Fall and archived Spring cohorts.
- [x] Add generated database TypeScript types and a documented regeneration command.
- [x] Add cookie-aware server and browser clients using async Next.js 16 APIs.
- [x] Implement a narrow server-only data layer and DTOs for member and admin reads.
- [x] Replace mock page reads incrementally while preserving stable view-model contracts.
- [x] Implement validated Server Actions for content, roster, feedback, and status changes;
  authorize inside each action.
- [x] Implement atomic link-submission replacement that retains historical rows.

### Authentication brought forward from P7

- [x] Add token-refresh proxy, Google initiation/callback, safe local redirects, denial,
  and sign-out using cookie-aware Supabase clients.
- [x] Require verified UC Davis Google identity and current active roster authority;
  synchronize profiles without trusting editable metadata or stale profile roles.
- [x] Protect layouts and every mutation, with independent database authorization and
  no shared caching of protected responses or mock-auth fallback.
- [x] Verify local database/RPC and HTTP layout boundaries for anonymous/member/admin,
  inactive/wrong-domain/cross-user access, live role changes, draft isolation, rollback,
  and SDK sign-out using isolated fixture sessions.
- [x] Verify direct upload Server Action rejection for anonymous, inactive, cross-user,
  and expired-session callers independently of layout and RPC checks (P6).
- [x] Verify successful expired-session refresh, browser sign-out/back navigation, and
  remaining non-upload mutation boundaries.
- [x] Verify submit → review → feedback → reload and file/link replacement/history at
  desktop and phone widths using isolated published-program fixtures; test duplicate
  finalization, lost responses, and stale/concurrent saves (P6).
- [x] Complete the full publish → enroll → submit link → review → feedback → reload
  browser story, including publishing and roster/enrollment UI steps at both widths.
- [x] Regenerate types after the review-receipt migration and verify no schema drift.
- [x] Paginate workspace reads; test histories beyond the PostgREST row limit and
  fail rather than return partial data when a page fails.
- [x] Scope member queries to their enrolled participation, selected active cohort,
  published content, and retained attempts—even for admins using the member portal.
  Verify multiple cohorts, empty participation, and 1,007 retained attempts.

### Monday-ready enrollment foundation

- [x] Support durable links between Monday applicants and GAP people/cohort enrollments,
  preserving returning applicants' history through a private application-link table.
- [x] Implement a shared, server-only enrollment operation with duplicate-safe processing
  and preservation of existing roles, access restrictions, and outcomes.

The local P5 schema, policies, and client integration have passed core validation.
The private enrollment operation is called by a live-roster-authorized
admin wrapper, never by the mock identity. Manual Monday preview/map/confirm intake is
now connected and user-tested; automatic sync and reporting remain disconnected.

### Phase 5 gate

- [x] Enrollment migrations apply to a clean local PostgreSQL database; external-link
  uniqueness, repeat/concurrent requests, returning participants, rollback, inactive
  access, role/history preservation, and database authorization boundaries pass.
- [x] Verify enrollment migrations and authorization against the actual Supabase
  environment before connecting a real server adapter; no Monday configuration required.
- [x] Fresh project migration and seed execution succeeds; rerunning fictional seeds
  preserves counts (12 weeks, 2 assignments, 4 submissions).
- [x] Anonymous/member/admin/inactive/cross-user SQL and client policy tests match the RLS
  matrix.
- [x] The portal remains runnable with persistent repositories; HTTP route checks and
  user-operated local admin/Monday workflows provide evidence. Desktop/phone core workflows
  pass; the broader responsive/accessibility matrix remains open.
- [x] Lint, typecheck, tests, and production build pass.

## Phase 6 — Private Storage and live submissions

**Local P6 accepted (2026-09-23):** Private uploads/downloads, retained history,
authorization and recovery checks pass. Desktop (1280px) and phone (390px) browser tests
cover file/link replacement, review/feedback, reload persistence, lost save responses,
interrupted transfer, failed cancellation and link fallback. Direct upload actions reject
anonymous/inactive/cross-user/expired-cookie requests. No hosted configuration or real
analyst records were changed. P5/P7 broader session gates remain separate and open.

### Clean live program / readiness

- [x] Disable automatic demo seeding; retain an explicit local demo-seed command and
  test/UI-preview fixtures.
- [x] Inventory and back up untouched demo records, remove them transactionally, preserve
  the real admin, and verify a repeated cleanup is a no-op. Recovery is in operations docs.
- [x] Subsequently restore only Fall 2026 and its six original week titles as drafts at
  the user's request. Demo people, assignments, and submissions remain removed. The live
  database is no longer empty; keep empty-state verification isolated from real cohorts.
- [ ] Visually verify dashboard/admin empty states after reload in a real browser.
- [x] Verify normal startup keeps demo records absent and backup restoration succeeds
  inside a rolled-back transaction. Confirm the preserved real admin passes authorization.
- [x] Cleanup validation: 40 tests (including documentation links), lint, typecheck,
  diff checks, and Webpack production build pass.
- [ ] Recheck the default Turbopack build: this run hit a CSS-worker port-binding
  permission error even with escalation; the Webpack fallback passed without code changes.

### Implementation and recovery

- [x] Enable and verify local Storage, private `submissions` bucket, 20 MB limit and four MIME types.
- [x] Restrict inserts to exact unexpired owner intents; restrict reads to live owners/admins
  and committed history. Deny anonymous, inactive and cross-user access and client overwrite/delete.
- [x] Generate unique sanitized paths and preserve original filenames and validated metadata.
- [x] Implement resumable progress/retry, bounded format inspection, atomic version-checked
  finalization and stable receipts; no file bytes pass through Server Actions.
- [x] Implement authenticated no-store attachment downloads for current and historical attempts.
- [x] Preserve stale-save/completed-work restrictions across file/file, file/link and link/file replacement.
- [x] Verify cancellation during transfer, failed cancellation messaging, retained file selection,
  retry after failed/lost save responses and link fallback when transfer is unavailable.
- [x] Add scoped, bounded local cleanup; verify late uploads and repeat runs through the actual
  fixture-scoped command, plus API/network/receipt failure injection in its shared runner.
- [x] Review concurrency, rollback, live authorization, server input validation and private boundaries.

### Phase 6 gate

- [x] A member cannot list, read, overwrite, or delete another member's files.
- [x] An admin can download committed files; unauthenticated URLs cannot access private objects.
- [x] File and link submission/resubmission work end to end at desktop/phone widths.
- [x] Invalid type/oversize, interrupted upload, retry, transactional rollback, lost save
  response and historical download scenarios pass alongside admin/member access tests.
- [x] Unit/docs, Storage, program and enrollment regressions, lint, typecheck, generated types,
  Webpack production build and diff checks pass. Default Turbopack limitation remains above.
- [x] Canonical documentation, upload ADR, changelog and checklist reflect tested local behavior.

## Phase 7 — Google authentication and roster authorization

Authentication implementation and local authorization testing moved into P5. The manual
Google configuration and real sign-in acceptance below remain required; fixture sessions
do not satisfy them. See ADR 0007.

### Manual configuration — not complete until verified

- [x] Add code/status-only callback diagnostics; 51 unit/documentation tests, lint,
  typecheck, and diff checks pass, including failure redirect and log-field coverage.
- [ ] Deploy callback diagnostics and capture a fresh hosted failure before claiming
  production sign-in is fixed.

- [x] Configure Google Cloud OAuth consent/Web client for local login; successful user
  login followed correction of the client ID and organization audience restriction.
- [x] Configure the local Supabase Google callback URI; the real callback completed.
- [x] Enable Google in local `supabase/config.toml` using ignored `.env.local` credentials,
  restart local Supabase, and verify real sign-in. See the local OAuth recipe in
  `docs/operations.md`; enabling a hosted project's provider does not configure local Auth.
- [ ] Separately enable Google in the hosted Supabase project when deploying.
- [x] Set local Supabase Site URL and localhost callback allowlist; verify real local login.
- [ ] Configure and verify the production Site URL and callback allowlist when deploying.
- [x] Provision the first real lead as an active local admin and verify profile synchronization.
- [ ] Provision and verify the second development lead through a safe admin procedure.

### Phase 7 gate

- [x] Real local admin sign-in and user-confirmed analyst access/admin denial work.
- [x] Verify approved member and admin expired-session refresh with real local Auth-issued
  fixture sessions; invalid/revoked refresh sessions return to login. This is not a new
  real Google OAuth verification.
- [x] P6 application boundaries reject anonymous, inactive, cross-user, and expired-session
  upload requests; owner/admin downloads succeed and unauthorized downloads fail safely.
- [x] Anonymous, wrong-domain, unapproved, inactive, and member-to-admin escalation tests
  fail safely.
- [x] Sign-out invalidates protected navigation, including browser back/forward, reload,
  direct protected URLs, and subsequent mutation attempts at 390px and 1280px.
- [x] Local lint, typecheck, existing auth/RLS regressions, and Webpack production build
  pass (2026-10-20); hosted configuration and second-lead provisioning remain open.

## Phase 8 — Final responsive and usability polish

### Mobile attendance tracker — Deferred, planning only

Requested follow-up, not part of P6 and not authorized for implementation yet.

- [ ] Add an admin-only, phone-friendly attendance view: choose a cohort and meeting/week,
  see its enrolled people, and tap a large “Mark here” button beside each person.
- [ ] Show marked people clearly, allow undo for accidental taps, and offer name search
  plus a compact present/total count. Unmarked means not recorded, not automatically absent.
- [ ] Persist attendance per person and meeting in Supabase; show saving/saved/error
  feedback, preserve records after reload, and prevent duplicate marks.
- [ ] Before implementation, confirm whether meetings map one-to-one to weeks or need
  separate dates; specify admin authorization and retained cohort attendance history.
- [ ] Verify one-handed phone use, accessible tap targets, undo, failed saves, duplicate
  taps, and reload persistence. No self-check-in, QR codes, geolocation, or Monday sync
  in this initial follow-up.

### Monday accepted-member intake — Implemented, acceptance in progress

- [x] Verify configured Monday account, accepted-members board, and column types read-only.
- [x] Implement manual preview/map/confirm intake with private 15-minute batches and
  service-only enrollment receipts; reader and rollback SQL smoke checks pass.
- [x] Configure server-only local Supabase secret for the adapter in ignored `.env.local`.
- [x] User reports successful real enrollment through the admin import UI (2026-09-22).
  This confirms the happy path, not the full retry/concurrency/browser matrix.
- [x] User confirmed reload persistence, Already linked on repeat import, and analyst
  program access/admin denial; these are user reports, not expanded automated Monday tests.
- [ ] Complete extended import tests: concurrent confirms, cross-admin batches, duplicates,
  returning members, inactive access, retries, stale source, and phone/desktop browser flows.

Live enrollment and synchronization depend on P5 database/client work and P7 real
authentication/authorization. A configured Monday board is not a P5 completion gate.

- [x] Document Supabase/Monday ownership, expected form intake, reporting scope, and ADR.
- [x] Record the lead-controlled “Enroll in GAP” checkbox decision and enrollment safeguards.
- [x] Confirm accepted-members board and identity/checkbox/cohort/status columns; existing
  Monday recruitment automation establishes acceptance. No application-form read is needed.
- [x] Use the configured Enroll in GAP checkbox and explicit GAP-admin confirmation;
  membership status is informational, not acceptance or automatic revocation.
- [ ] Verify Monday-side lead-only checkbox permissions; separate Monday result fields
  and individual-report audience/sync timing belong to the future outbound integration.
- [x] Implement durable application-to-enrollment mapping and atomic server-only provisioning.
- [x] Implement the read-only API adapter, private credentials, legacy board-name alias,
  complete pagination, typed columns, and explicit preview-local cohort mappings.
- [ ] Complete intake failure/retry/non-destructive-unchecking acceptance; background
  checkbox-triggered processing remains deferred, not part of manual confirmation.
- [ ] Export per-person due-work counts and cohort outcomes without private work or feedback.
- [ ] Verify duplicate-safe retries, returning applicants, historical cohorts, stale-sync
  visibility, and continued GAP operation when Monday is unavailable.

### Responsive and usability work

- [x] Add private direct PDF assignment briefs and editable cohort dates. Local
  Storage/RLS, concurrent replacements, invalid PDFs, expiry, role revocation,
  protected downloads, and desktop/phone upload/date-edit reload flows pass.
  52 unit/documentation tests, five brief-suite entries, lint, typecheck, generated
  types and Webpack build pass. Program regressions: 11 pass, one optional browser
  entry skipped (new-feature desktop/phone checks ran separately).
- [x] Apply the assignment-brief/date-edit migration to hosted GAP; verify private
  PDF-only 20 MB bucket, document RLS, and authorized date-edit function.
- [ ] Verify deployed assignment PDF upload/download and cohort date edits using real
  admin/member sessions. Add operational cleanup for expired/abandoned briefs.

- [ ] Add missing Production `MONDAY_API_TOKEN`, redeploy, and verify hosted preview.

- [x] Replace the native cohort select with a grouped, badge-labeled cohort switcher
  using existing navigation and unsaved-change safeguards.
- [ ] Browser-verify cohort switcher phone layout, keyboard dismissal, grouping, and
  canceled unsaved-change navigation with multiple cohorts.

- [x] Implement the centered login card with approved logo, shared tokens, full-width
  Google action, pending state, and accessible inline OAuth error; preserve auth logic.
- [ ] Browser-verify login normal/pending/error states on phone/desktop, short screens,
  200% zoom, and keyboard navigation. Do not count HTTP checks as visual verification.

- [ ] Verify assignment-state precedence and consistency across dashboard, week, and admin
  screens.
- [ ] Verify all stored timestamps display correctly in `America/Los_Angeles`, including
  daylight-saving boundaries.
- [ ] Add route loading, not-found, backend failure, and empty states.
- [ ] Audit keyboard operation, focus visibility, semantics, labels, status announcements,
  target sizes, contrast, and reduced motion.
- [ ] Test member flows at narrow mobile, common phone, tablet, laptop, and wide desktop
  widths.
- [ ] Test admin table/card behavior on narrow screens and desktop.
- [ ] Remove obsolete mock-only runtime paths and unused starter assets without deleting
  user-owned brand references.
- [ ] Confirm no excluded LMS features or fake analytics slipped into the interface.

### Phase 8 gate

- [~] Full learn → submit → review → feedback story passes on mobile and desktop:
  P6 submission/review/feedback/history is verified at 390px and 1280px; complete the
  learning/resource-navigation portion and broader responsive/accessibility audit.
- [ ] No known critical accessibility, authorization, data-loss, or responsive defects.
- [ ] Lint, typecheck, complete tests, and production build pass.

## Phase 9 — Setup documentation and release

- [ ] Replace the starter README with product overview, prerequisites, local setup,
  scripts, architecture links, Supabase setup, seed/type commands, and deployment.
- [ ] Finalize `.env.example` and verify it contains placeholders only.
- [ ] Update `docs/operations.md` with exact verified Google, Supabase, Storage, and Vercel
  steps; retain Pending labels for anything not performed.
- [ ] Verify migrations and seed data against a clean Supabase project or documented test
  environment.
- [ ] Configure Vercel environment variables and production deployment.
- [x] Apply all eight migrations to the verified empty hosted GAP project without
  seeds/reset; verify migration history, RLS flags, private bucket settings, and
  preservation of its existing Auth user (2026-10-20 Pacific).
- [x] Provision the explicitly confirmed first hosted admin after checking its verified
  Google identity; create only person and active admin roster entries transactionally.
- [ ] Verify the first hosted admin's real login/profile synchronization; run hosted
  member/admin and private-file smoke tests before declaring production acceptance.
- [ ] Resume [deferred Vercel environment-variable cleanup](docs/operations.md#vercel-environment-variable-cleanup--deferred):
  verify exact hosted variable names/values, review unused aliases, verify hosted
  prerequisites, then redeploy and test authorized access. No configuration changes
  or hosted acceptance are implied by documenting this task.
- [ ] Set final production redirect URLs and run member/admin smoke tests.
- [ ] Review all living docs against the released implementation.
- [ ] Move completed changelog entries from `Unreleased` into the first release section.

### Release gate

- [ ] All 16 requested deliverables are demonstrably functional.
- [ ] Manual external configuration is either verified or called out precisely as remaining.
- [ ] Security/RLS, responsive, accessibility, lint, typecheck, tests, and production build
  checks pass.
- [ ] Repository contains no secrets, real seed-member personal data, or public submission
  files.
