# GAP MVP Implementation TODO

**Status:** Active
**Last updated:** 2026-08-12

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

- [ ] Brand assets, type, color, spacing, focus, and contrast match
  `docs/design-system.md` at mobile and desktop widths.
- [x] Mock types prevent invalid file/link and stored-overdue states.
- [x] Lint, typecheck, and production build pass.

## Phase 2 — Student dashboard

- [ ] Build `/program` with user greeting, Fall 2026 status, current week, progress text,
  and thin progress bar.
- [ ] Add the featured continue-learning card for the current actionable published week.
- [ ] Show the nearest upcoming or overdue assignment with a semantic status badge.
- [ ] Render all six modules in a restrained ordered list/card treatment.
- [ ] Show draft weeks as locked number/title cards without leaking protected content.
- [ ] Link published modules to their week route and provide useful empty/error states.
- [ ] Make the dashboard excellent on small screens with prominent deadlines and
  thumb-friendly actions.

### Phase 2 gate

- [ ] Dashboard answers the five priority questions defined in the product spec without
  fake analytics or out-of-scope features.
- [ ] Keyboard, narrow-mobile, tablet, and desktop checks pass.
- [ ] Lint, typecheck, and production build pass.

## Phase 3 — Week detail and mock submission flow

- [ ] Build `/program/week/[weekNumber]` using Next.js 16 async `params` conventions.
- [ ] Add program back-link, numbered title, description, workshop presentation, and
  ordered resource list.
- [ ] Add assignment instructions, explicit Pacific deadline, and derived state.
- [ ] Build file selection with PDF/DOCX/PPTX/XLSX and 20 MB validation.
- [ ] Build `http`/`https` link submission with clear validation.
- [ ] Show submitted timestamp, original filename or URL, view, and replace actions.
- [ ] Show admin feedback and reviewed/needs-revision state when present.
- [ ] Preserve mock resubmission history and display current versus prior attempts.
- [ ] Add invalid week, locked draft, missing assignment, validation, and failure states.

### Phase 3 gate

- [ ] A mock member can learn, submit either method, replace, and view feedback end to end.
- [ ] Mobile submission controls remain usable and accessible.
- [ ] Lint, typecheck, and production build pass.

## Phase 4 — Mock admin experience

- [ ] Build admin-only layout and navigation with an obvious return to the member portal.
- [ ] Build `/admin` with active member, current submitted, outstanding, and awaiting
  review summary values.
- [ ] Build a week-filterable submission matrix with responsive overflow/card behavior.
- [ ] Build `/admin/submissions/[id]` with member, assignment, timestamp, current
  submission, and history.
- [ ] Add file/link opening, written feedback, and submitted/reviewed/needs-revision
  controls.
- [ ] Build `/admin/weeks` and `/admin/weeks/[id]` for week, slides, assignment, deadline,
  publication, and ordered resource editing.
- [ ] Build `/admin/members` for roster add/edit, role, activation, and deactivation.
- [ ] Add validation, unsaved/submitting states, empty states, and safe destructive-action
  confirmations where needed.

### Phase 4 gate

- [ ] Mock admin can complete content publishing, roster, and review workflows.
- [ ] Member mock role cannot reach or trigger admin behavior.
- [ ] Lint, typecheck, and production build pass.

## Phase 5 — Supabase schema, seeds, and data access

- [ ] Install only current `@supabase/supabase-js` and `@supabase/ssr` dependencies.
- [ ] Add ordered SQL migrations for enums, tables, constraints, timestamps, indexes, and
  private authorization helpers defined in `docs/data-model.md`.
- [ ] Add the safe authenticated week-catalog function for locked draft cards.
- [ ] Add RLS grants and policies for profiles, roster, weeks, resources, assignments, and
  submissions.
- [ ] Add realistic idempotent seed data for six weeks and Week 2 details without shipping
  real personal data.
- [ ] Add generated database TypeScript types and a documented regeneration command.
- [ ] Add cookie-aware server and browser clients using async Next.js 16 APIs.
- [ ] Implement a narrow server-only data layer and DTOs for member and admin reads.
- [ ] Replace mock page reads incrementally while preserving stable view-model contracts.
- [ ] Implement validated Server Actions for content, roster, feedback, and status changes;
  authorize inside each action.
- [ ] Implement atomic current-submission replacement that retains historical rows.

### Phase 5 gate

- [ ] Fresh project migration and seed execution succeeds.
- [ ] Anonymous/member/admin/inactive/cross-user SQL and client policy tests match the RLS
  matrix.
- [ ] The portal remains runnable after each mock repository is replaced.
- [ ] Lint, typecheck, tests, and production build pass.

## Phase 6 — Private Storage and live submissions

- [ ] Add migration or exact setup for private `submissions` bucket, 20 MB limit, and
  allowed MIME types.
- [ ] Add Storage INSERT/SELECT policies for owner paths and admin access.
- [ ] Generate collision-resistant sanitized paths matching the documented contract while
  retaining original filenames in Postgres.
- [ ] Implement live file upload, metadata insert, and safe cleanup on partial failure.
- [ ] Implement live URL submissions and transactional resubmission behavior.
- [ ] Implement authenticated download or short-lived signed URL access.
- [ ] Ensure historical submission files remain accessible to their owner and admins.
- [ ] Add upload progress/disabled UI, retryable errors, invalid-type, oversize, and network
  failure handling.

### Phase 6 gate

- [ ] A member cannot list, read, overwrite, or delete another member's files.
- [ ] An admin can review all files; unauthenticated URLs cannot access private objects.
- [ ] File and link submission/resubmission work end to end.
- [ ] Lint, typecheck, tests, and production build pass.

## Phase 7 — Google authentication and roster authorization

- [ ] Add root `proxy.ts` using current Supabase SSR token refresh and `getClaims()`.
- [ ] Add `/login`, Google OAuth initiation, `/auth/callback`, and sign-out.
- [ ] Add canonical site URL handling for local, preview, and production redirects.
- [ ] Validate normalized verified email, `@ucdavis.edu`, active roster membership, and
  roster role on the server.
- [ ] Synchronize profiles from roster data without trusting user-editable metadata.
- [ ] Protect member and admin layouts server-side and redirect to safe denial/login pages.
- [ ] Repeat authorization in every mutation and retain RLS as the final boundary.
- [ ] Prevent authenticated pages that refresh sessions from unsafe shared caching.
- [ ] Add denied states for wrong domain, missing roster entry, inactive member, and
  insufficient role without leaking roster data.

### Manual configuration — not complete until verified

- [ ] Configure Google Cloud OAuth consent and Web client.
- [ ] Copy the exact Supabase Google callback URI into Google authorized redirect URIs.
- [ ] Enable Google provider in Supabase with the client ID and secret.
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
