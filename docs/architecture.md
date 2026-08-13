# GAP Application Architecture

**Status:** Active
**Last updated:** 2026-08-12
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
| `/` | Public/session-aware | Landing or redirect to the appropriate portal |
| `/login` | Public | Google sign-in and access explanation |
| `/auth/callback` | Public callback | Exchange OAuth code and validate access |
| `/access-denied` | Public | Explain domain, roster, or inactive access failure |
| `/program` | Active member/admin | Student dashboard |
| `/program/week/[weekNumber]` | Active member/admin | Published week detail |
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
