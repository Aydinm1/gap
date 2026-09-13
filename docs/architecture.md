# GAP Application Architecture

**Status:** Active
**Last updated:** 2026-08-13
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
