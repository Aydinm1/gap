# GAP Operations Guide

**Status:** Active
**Last updated:** 2026-08-12
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
