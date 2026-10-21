# GAP Application Architecture

Monday manual intake uses server actions behind live admin authorization. A server-only
Supabase secret invokes the service-only batch RPC; no browser has provisioning RPC
access. Private owner-scoped previews store source rows and cohort mappings, expire in
15 minutes, and recheck Monday before confirmation. Per-item transactions preserve
successful receipts through retries. No background jobs or Monday writes are involved.
See [ADR 0008](decisions/0008-monday-member-import.md).

**Status:** Active
**Last updated:** 2026-10-21
**Source of truth for:** Routes, application boundaries, auth/data flow, and mutation patterns

## Stack and principles

- Next.js 16.3 stable App Router, React 19.2, TypeScript strict mode, and Tailwind
  CSS 4 on Node.js 24 LTS.
- Production dependencies use stable/LTS release channels. Keep Next.js and
  `eslint-config-next` versions identical and keep React/React DOM versions identical.
- Supabase directly for Postgres, Auth, and Storage; no ORM or alternate backend.
- Vercel-compatible deployment.
- Prefer Server Components for protected reads and initial rendering.
- Add Client Components only for browser interaction, local state, file selection, or
  progressive form feedback.
- Keep application code straightforward; avoid generalized LMS abstractions.

## Route map

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Active member/admin | Student dashboard and portal home |
| `/login` | Public | Google sign-in and access explanation |
| `/auth/callback` | Public callback | Exchange OAuth code and validate access |
| `/access-denied` | Public | Explain domain, roster, or inactive access failure |
| `/week/[weekNumber]` | Active member/admin | Published week detail |
| `/week/[weekNumber]/submission` | Active member/admin | Own submission review and history |
| `/dev/info` | Development only | Retired public-information page reference |
| `/admin` | Admin | Overview and submission matrix |
| `/admin/submissions/[id]` | Admin | Submission review and history |
| `/admin/weeks` | Admin | Week listing and publication state |
| `/admin/weeks/[id]` | Admin | Week, assignment, and resource editing |
| `/admin/members` | Admin | Approved-roster management |
| `/api/submissions/[id]/download` | Active owner/admin | Private current/historical file attachment |

In Next.js 16, dynamic `params`, `searchParams`, `cookies()`, and `headers()` are async.
Use the installed documentation rather than legacy examples.

## Supabase clients

- Use `@supabase/ssr` and `@supabase/supabase-js`.
- Provide a browser client for Client Components and a cookie-aware async server client
  for Server Components, Server Actions, and Route Handlers.
- Use root `proxy.ts` to refresh auth tokens with `getClaims()` and propagate updated
  cookies. Proxy is an optimistic navigation layer, not the authorization boundary.
- Never use deprecated `@supabase/auth-helpers-nextjs` patterns.
- Do not expose or require a service-role key in browser code. Prefer user-scoped clients
  protected by RLS for runtime operations.

## Authentication and authorization flow

`/admin/preview` and `/admin/preview/week/[weekNumber]` require live admin authorization
at both layout and data boundaries. They reuse the user-scoped admin workspace read,
then map only the selected cohort's catalog/published payload into member view models.
An in-memory `admin-preview` enrollment context satisfies the existing pure selectors;
it is never saved or passed to a mutation. Real enrollments, attempts and feedback do
not enter preview DTOs. Shared week rendering disables submission controls in preview.
Preview navigation retains its cohort query; normal member reads remain enrollment-scoped.

1. The user initiates Google OAuth with an allowed callback URL.
2. `/auth/callback` exchanges the code for a cookie-backed session.
3. Server-side logic verifies identity, normalizes the authenticated email to lowercase,
   checks `@ucdavis.edu`, and checks an active approved-roster record.
4. Profile data is created or synchronized from the roster without trusting editable
   user metadata for roles.
5. Protected layouts load a minimal current-user DTO and redirect unauthorized users.
6. Every Server Action/Route Handler repeats authentication and role/ownership checks.
7. Database and Storage RLS enforce the same policy independently.

## Data access and mutations

Runtime weeks expose `assignments` arrays ordered by database `sort_order,id`.
`assignmentsForWeek` accepts a legacy single field only for existing fixtures and
development examples; live reads populate the collection. Week detail and preview
render independent workspaces keyed by assignment ID. Review links use
`/week/[weekNumber]/submission?assignment=<id>`; a missing selector keeps the historical
first-assignment link behavior, and an unknown/cross-week selector is not found.
Admin queue links retain both week and assignment selection. State selectors count a
week once, only when every current assignment is approved; sibling submission/feedback
history never merges. Full week saves call the authorized transactional collection
operation through the existing server action interface.

Assignment-brief preparation/finalization/cancellation lives in server-only actions;
PDF bytes transfer directly to Storage through authenticated TUS with bounded retries
and progress. Finalization uses the server credential to inspect the exact reserved
object with bounded size and PDF signature checks, then a service-only transaction
publishes the attachment. These checks are format validation, not malware scanning.
`/api/assignment-briefs/[id]/download` resolves metadata with a user-scoped client and
streams an authorized attachment with private/no-store/nosniff headers. Draft documents
never appear in member DTOs. Member queries limit documents to their published
assignment IDs; only current ID/name pairs reach rendering components.

Cohort date edits pass through `saveAdmin('cohort_dates', ...)`, strict runtime calendar
validation, and a dedicated authorized database function. Successful writes refresh
member/admin views; failures retain the date input and existing navigation warnings.

- Put server-only data access in a small `src/lib` layer and mark privileged modules with
  `server-only` where appropriate.
- Return narrow DTOs to Client Components; never pass entire private rows unnecessarily.
- Use Server Actions for first-party form mutations when practical and Route Handlers
  where file transfer or OAuth callbacks require HTTP semantics.
- Validate all form data and URL parameters on the server.
- Revalidate only the affected routes after successful mutations.
- Treat every Server Action as externally callable and authorize within it.
- Surface safe, actionable errors to users while avoiding secrets or raw database errors.

## Mock-to-Supabase progression

### P6 file flow

The existing submission editor prepares an intent via an authenticated Server Action,
then dynamically loads `tus-js-client` and sends file bytes directly to authenticated
Storage using 6 MB chunks, progress, and bounded retries. It never sends file bytes
through a Server Action. The task retains its TUS transfer and selected File only in
the current page session; cancel aborts transfer and abandons the intent. Reload requires
reselection. Upload failures do not alter the current attempt or block link submission.

Finalization uses a server-only Supabase client to fetch the exact reserved object with
a bounded 20 MB read. It verifies bytes/MIME/extension, PDF header/end marker, or a
bounded Office ZIP/XML package (entry count, total expansion, required main-part type,
relationships and valid XML; no DTD/entities). This is format validation, not malware
scanning. Browser callers cannot invoke the service-only commit RPC to bypass inspection.
The RPC repeats live authority/version checks and commits metadata/history atomically.
Retryable infrastructure failures retain the upload; invalid/stale work is abandoned for
cleanup. Success alone refreshes member/admin views.
Committed retries also revalidate views when the original success response was lost.
Cancellation owns its UI message after detaching the transfer, preventing a late transfer
rejection from hiding cancellation failure. The selected File remains available and the
user can switch to link submission even if abandonment could not be confirmed.

Download routes resolve submission IDs under user-scoped RLS and stream the derived
Storage path using the session credential. Responses are attachments with original
filenames, private/no-store and nosniff headers. Downloading has no review side effect.
There is no embedded viewer, persistent signed URL, or Monday file export.

### P5 implementation status

Protected runtime pages now read through `src/lib/supabase/data.ts` using user-scoped
cookie clients. Missing configuration routes to `/setup`; there is no runtime mock
fallback. Fixtures remain for tests and development previews. The member cohort is the
latest active cohort with enrolled participation. No qualifying cohort shows the empty
program state. Server Actions save links and admin records, then revalidate protected
views. Drafts remain session-local; saved attempts come from server reads.

Member reads do not reuse the admin workspace loader. After live authorization they
query only the authenticated person's enrolled participation, choose the latest active
cohort using the shared quarter ordering, and retrieve that cohort's published weeks,
their resources/assignments, and the selected enrollment's complete attempt history.
Draft cards still come only from `week_catalog`. This explicit scope also applies to
admins opening the member portal, regardless of their broader RLS permissions. No
qualifying enrollment short-circuits to the empty state without program-wide queries.
All list reads retain deterministic pagination and fail on incomplete results.

Non-upload actions reject malformed top-level payloads before database calls; link
actions also validate identifiers and paired replacement-version fields. Live authority
is checked before validation and again by the database functions. Invalid requests
return the existing safe error contract without clearing client drafts.

The following prototype history describes the earlier UI stages, not current persistence.
Local P5 core and session-security acceptance passed on 2026-10-20, including
production-mode desktop/phone publishing, enrollment, review, reload, and sign-out.
Hosted setup and broader responsive/accessibility acceptance remain separate. See
[ADR 0007](decisions/0007-authentication-in-p5.md) for bringing authentication forward.

The interface is built first against typed repository-local mock data. Page-level DTOs and
status helpers should remain stable when mock repositories are replaced by Supabase data
access. Do not maintain a production runtime switch between mock and live data unless a
concrete need emerges.

- Domain contracts and pure selectors live in `src/lib/program`; mock fixtures are a
  separate module in that domain.
- File and link submissions use a discriminated union, and persisted submission status
  excludes deadline-derived display states.
- Draft program items contain catalog fields only. Published detail objects carry
  descriptions, resources, slides, and assignments.
- Time-sensitive selectors accept an explicit `now`. Mock previews use a fixed clock so
  visual states and tests do not change with the real date.
- The `/dev/ui` component lab calls `notFound()` in production and is never a user-facing
  application route.
- The student dashboard consumes a narrow `ProgramDashboardViewModel` built by pure
  selectors. Pages do not independently derive completion, priority work, feedback, or
  module presentation state.
- During Phase 2, published-week links resolve to the final dynamic route shape with a
  minimal read-only scaffold. Draft and malformed week routes return not found; Phase 3
  replaces the scaffold body in place.
- Dashboard repositories supply an explicit cohort and the current person's enrollment.
  Identity, login authorization, and cohort participation remain separate so archived
  history survives access deactivation.
- Week and member submission-review pages render scoped learning data on the server and
  pass narrow assignment DTOs into client submission controls. A member provider beneath
  the portal layout owns enrollment-scoped attempts and assignment drafts across client
  navigation. Dashboard selectors and both submission surfaces consume that state.
  Replacement only supersedes the matching assignment/enrollment's current attempt.
  The server validates published assignment routes; current-submission existence is
  resolved in the client workspace so newly submitted work can be reviewed immediately.
  Attempts and drafts reset to fixtures on reload; drafts containing input warn before
  unload and require confirmation when explicitly cancelled. The same immutable
  replacement contract will move behind Supabase.
- Phase 4 admin routes share a layout-scoped client workspace seeded from typed mock data.
  It owns selected-cohort context and immutable mock mutations across admin navigation,
  then resets on reload. Admin DTOs retain draft content separately from member-safe
  `ProgramWeek` objects so later repository replacement does not weaken draft isolation.
- Admin queue context is represented in URL query parameters (`cohort`, `week`, `status`,
  and `q`) so review-detail navigation can return to the same operational view. Detail
  resolution always checks both the record identifier and selected cohort. This remains
  prototype state: mutations do not propagate into the separately seeded member routes.
- Pacific wall-clock conversion is centralized in `src/lib/program/admin.ts`; it rejects
  daylight-saving gaps and requires disambiguation for repeated PDT/PST times before
  producing a UTC timestamp.

## Monday.com ownership and synchronization — Planned, not implemented

See [product scope](product-spec.md#mondaycom-recruiting-and-club-reporting--planned)
and [ADR 0004](decisions/0004-monday-recruiting-and-gap-reporting.md).
Monday owns recruiting and the club directory; Supabase owns GAP records and files.
The boundary is field-specific: accepted-participant identity/cohort context enters GAP,
while GAP-derived summaries return to Monday. Do not make both systems independent
editors of the same progress or outcome fields.

Keep integration credentials and synchronization work on the server. External identity
mapping must connect Monday person/application/cohort records to GAP people/enrollments.
Retries must not duplicate people or enrollments, and a sync failure must not interrupt
learning, submissions, or review in GAP. Show the last successful synchronization time
so stale reports do not appear current. The private application-link schema and atomic
enrollment operation are implemented in migrations; transport, scheduling, checkbox
results, and live synchronization remain pending.

The [enrollment operation](data-model.md#enrollment-operation--implemented-not-connected-to-the-portal)
remains a private SQL entry point. The P5 admin mutation wrapper verifies live roster
authority before invoking it through a user-scoped client; no mock-admin wiring or
Monday/public enrollment endpoint is added. Future Monday adapters must authorize their
callers before using it. The function handles atomic
provisioning and duplicate-safe linking; the adapter owns external approval checks and
reporting failures back to Monday. See [ADR 0006](decisions/0006-monday-ready-enrollment-foundation.md).

Monday acceptance alone never provisions access. A lead-controlled “Enroll in GAP”
checkbox requests server-side enrollment under the
[approved trigger](product-spec.md#enrollment-approval--approved-not-implemented)
and existing approved-roster rules. Validate the authorized request, current acceptance,
identity, and cohort before provisioning. Record the enrollment result separately from
the checkbox, and make retries safe without resetting existing history or access roles.
Unchecking is not a revocation mechanism.
Outbound GAP links still require ordinary GAP authorization; never export signed file
URLs, credentials, or private submission payloads into club reporting.

## Time and derived state

- Store deadlines and submission times as UTC-backed `timestamptz`.
- Display program deadlines in `America/Los_Angeles` with explicit date, time, and zone.
- Centralize derived state logic described in `product-spec.md` so dashboard, week, and
  admin views cannot disagree.

## Error and loading boundaries

- Add route-level loading UI for protected data views.
- Use not-found behavior for unknown weeks/submissions without leaking private records.
- Distinguish authentication failure, roster denial, validation failure, and transient
  backend failure.
- Never cache authenticated responses in a way that could share sessions between users.
