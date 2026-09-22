# GAP MVP Implementation TODO

**Status:** Active
**Last updated:** 2026-09-21

Legend: `[ ]` pending · `[~]` active · `[x]` complete

This file tracks approved work. Product and technical rules live in `docs/`; completion
requires implementation, validation, documentation, and changelog agreement.

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
- [ ] Mobile submission controls remain usable and accessible.
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
- [ ] Browser-verify that a mock admin can complete content publishing, roster, and review
  workflows at mobile and desktop widths.
- [ ] Replace the hardcoded mock admin identity with server-side authorization before
  claiming members cannot reach or trigger admin behavior.
- [x] Lint, typecheck, and production build pass.

Audit note (2026-09-14): all 36 automated tests, lint, and typecheck pass. The production
build checkbox reflects prior validation, not a new build in this audit. Mock feature
implementation is complete; the browser workflow gate remains unverified. Real admin
authorization depends on the Phase 5/7 backend and authentication work and is not supplied
by the mock-role test.

## Phase 5 — Supabase schema, seeds, and data access

**Active, not accepted (2026-09-21):** Local migrations, repeatable seed execution,
39 unit/documentation tests, 9 isolated enrollment tests, and the local Supabase suite
(7 scenarios plus its parent test) pass. Generated-type consistency, typecheck, lint,
and production build have passed on native Apple Silicon tooling. Protected interactive
desktop/phone flows, session-expiry behavior, and real Google OAuth remain open.
The local Google provider is now configured; real sign-in still needs verification.
Fixture sessions do not verify Google login.

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
- [~] Add realistic idempotent seed data for six weeks and Week 2 details without shipping
  real personal data; include fictional active Fall and archived Spring cohorts.
- [x] Add generated database TypeScript types and a documented regeneration command.
- [~] Add cookie-aware server and browser clients using async Next.js 16 APIs.
- [~] Implement a narrow server-only data layer and DTOs for member and admin reads.
- [~] Replace mock page reads incrementally while preserving stable view-model contracts.
- [~] Implement validated Server Actions for content, roster, feedback, and status changes;
  authorize inside each action.
- [x] Implement atomic link-submission replacement that retains historical rows.

### Authentication brought forward from P7

- [~] Add token-refresh proxy, Google initiation/callback, safe local redirects, denial,
  and sign-out using cookie-aware Supabase clients.
- [~] Require verified UC Davis Google identity and current active roster authority;
  synchronize profiles without trusting editable metadata or stale profile roles.
- [~] Protect layouts and every mutation, with independent database authorization and
  no shared caching of protected responses or mock-auth fallback.
- [x] Verify local database/RPC and HTTP layout boundaries for anonymous/member/admin,
  inactive/wrong-domain/cross-user access, live role changes, draft isolation, rollback,
  and SDK sign-out using isolated fixture sessions.
- [ ] Verify expired-session refresh, browser sign-out/back navigation, and direct
  unauthorized Server Action requests independently of layout and RPC checks.
- [ ] Verify publish → enroll → submit link → review → feedback → reload at desktop
  and phone widths, including duplicate requests, stale saves, and history retention.
- [x] Regenerate types after the review-receipt migration and verify no schema drift.
- [x] Paginate workspace reads; test histories beyond the PostgREST row limit and
  fail rather than return partial data when a page fails.
- [ ] Review member-specific query scoping before acceptance; workspace reads still
  load all RLS-visible records before constructing the requested view models.

### Monday-ready enrollment foundation

- [x] Support durable links between Monday applicants and GAP people/cohort enrollments,
  preserving returning applicants' history through a private application-link table.
- [x] Implement a shared, server-only enrollment operation with duplicate-safe processing
  and preservation of existing roles, access restrictions, and outcomes.

The remaining P5 schema, policies, and client integration are implemented but awaiting
full validation. The private enrollment operation is called by a live-roster-authorized
admin wrapper, never by the mock identity. Monday remains disconnected.

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
- [ ] The portal remains runnable after each mock repository is replaced.
- [x] Lint, typecheck, tests, and production build pass.

## Phase 6 — Private Storage and live submissions

### Clean live program / readiness

- [x] Disable automatic demo seeding; retain an explicit local demo-seed command and
  test/UI-preview fixtures.
- [x] Inventory and back up untouched demo records, remove them transactionally, preserve
  the real admin, and verify a repeated cleanup is a no-op. Recovery is in operations docs.
- [ ] Visually verify dashboard/admin empty states after reload in a real browser.
- [x] Verify normal startup keeps demo records absent and backup restoration succeeds
  inside a rolled-back transaction. Confirm the preserved real admin passes authorization.
- [x] Cleanup validation: 40 tests (including documentation links), lint, typecheck,
  diff checks, and Webpack production build pass.
- [ ] Recheck the default Turbopack build: this run hit a CSS-worker port-binding
  permission error even with escalation; the Webpack fallback passed without code changes.

### Ordered implementation backlog

- [ ] Enable local `storage-api`, currently excluded by the startup script; verify health
  before enabling upload controls. Do not change hosted services as part of local P6.

- [ ] Add migration or exact setup for private `submissions` bucket, 20 MB limit, and
  allowed MIME types.
- [ ] Add Storage INSERT/SELECT policies for owner paths and admin access.
- [ ] Require current active-roster authority and valid owner/assignment associations;
  reject anonymous, inactive, and cross-user access, including overwrite/delete attempts.
- [ ] Generate collision-resistant sanitized paths matching the documented contract while
  retaining original filenames in Postgres.
- [ ] Implement live file upload, metadata insert, and safe cleanup on partial failure.
- Link submissions and transactional replacement moved into P5; P6 adds private files.
- [ ] Implement authenticated download or short-lived signed URL access.
- [ ] Ensure historical submission files remain accessible to their owner and admins.
- [ ] Preserve stale-save protection and completed-work restrictions for file replacement;
  verify failed saves clean up only new orphan uploads, never historical files.
- [ ] Add upload progress/disabled UI, retryable errors, invalid-type, oversize, and network
  failure handling.

### Phase 6 gate

- [ ] A member cannot list, read, overwrite, or delete another member's files.
- [ ] An admin can review all files; unauthenticated URLs cannot access private objects.
- [ ] File and link submission/resubmission work end to end.
- [ ] Invalid type/oversize, interrupted upload, retry, failed metadata save, and historical
  download scenarios pass alongside admin/member access tests.
- [ ] Lint, typecheck, tests, and production build pass.

## Phase 7 — Google authentication and roster authorization

Authentication implementation and local authorization testing moved into P5. The manual
Google configuration and real sign-in acceptance below remain required; fixture sessions
do not satisfy them. See ADR 0007.

### Manual configuration — not complete until verified

- [ ] Configure Google Cloud OAuth consent and Web client.
- [ ] Copy the exact Supabase Google callback URI into Google authorized redirect URIs.
- [~] Enable Google in local `supabase/config.toml` using ignored `.env.local` credentials,
  restart local Supabase, and verify real sign-in. See the local OAuth recipe in
  `docs/operations.md`; enabling a hosted project's provider does not configure local Auth.
- [ ] Separately enable Google in the hosted Supabase project when deploying.
- [ ] Set Supabase Site URL and localhost/production callback allowlist.
- [ ] Add the two real development leads to the roster as admins through a safe seed or
  admin procedure.

### Phase 7 gate

- [ ] Approved member and admin sign-in flows work from fresh and expired sessions.
- [ ] Anonymous, wrong-domain, unapproved, inactive, and member-to-admin escalation tests
  fail safely.
- [ ] Sign-out invalidates protected navigation.
- [ ] Lint, typecheck, auth/RLS tests, and production build pass.

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

### Monday recruiting and club reporting — Planned integration

- [x] Verify configured Monday account, accepted-members board, and column types read-only.
- [~] Implement manual preview/map/confirm intake with private 15-minute batches and
  service-only enrollment receipts; reader and rollback SQL smoke checks pass.
- [x] Configure server-only local Supabase secret for the adapter in ignored `.env.local`.
- [ ] Verify real admin import UI (no real enrollments without deliberate confirmation).
- [ ] Complete extended import tests: concurrent confirms, cross-admin batches, duplicates,
  returning members, inactive access, retries, stale source, and phone/desktop browser flows.

Live enrollment and synchronization depend on P5 database/client work and P7 real
authentication/authorization. A configured Monday board is not a P5 completion gate.

- [x] Document Supabase/Monday ownership, expected form intake, reporting scope, and ADR.
- [x] Record the lead-controlled “Enroll in GAP” checkbox decision and enrollment safeguards.
- [ ] Confirm form/boards/columns, individual-report audience, and sync timing.
- [ ] Configure the Monday enrollment checkbox, lead permissions, and separate enrollment result fields.
- [x] Implement durable application-to-enrollment mapping and atomic server-only provisioning.
- [ ] Finalize the live adapter, credentials, transport, and field mappings.
- [ ] Implement checkbox-triggered accepted-participant intake under approved-roster
  authorization rules; verify eligibility, retries, failure reporting, and non-destructive unchecking.
- [ ] Export per-person due-work counts and cohort outcomes without private work or feedback.
- [ ] Verify duplicate-safe retries, returning applicants, historical cohorts, stale-sync
  visibility, and continued GAP operation when Monday is unavailable.

### Responsive and usability work

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

- [ ] Full learn → submit → review → feedback story passes on mobile and desktop.
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
