# GAP release runbook

**Status:** Active
**Last updated:** 2026-10-25
**Source of truth for:** Repeatable GAP release execution, under the operations guide

Use for requested commit/push/deploy work, not feature implementation. Read the common
steps; read the migration section only when relevant. Environment repair and first-time
setup remain in [operations](operations.md). This procedure does not authorize a release.

## Common release steps

1. Establish scope: commit, push, production deployment and hosted migrations are
   separate permissions. Ask for any missing release authority before that operation.
   Do not change production records merely to test a deployment.
2. Inspect branch, remotes, status and the scoped diff, including untracked migrations.
   Confirm the intended files; preserve unrelated edits. Stage explicit paths, not
   indiscriminately everything. Never stage credentials, backups or test screenshots.
3. Reuse checks already passed for the same code/configuration/schema and relevant
   environment. Rerun checks invalidated by subsequent changes. For documentation-only
   changes run `npm test` (includes documentation links) and `git diff --check`; do not
   start Docker or rerun all browser suites just for prose. Application releases normally
   need tests, lint, typecheck and `npm run build -- --webpack`; schema changes also need
   generated-type consistency and affected isolated database/security regressions.
   Keep docs, changelog and TODO truthful; skipped or blocked checks are not passes.
4. If schema changes are pending, follow the conditional migration section before code
   goes live. Otherwise skip production data inventories and preservation fingerprints.
   If hosted schema state is unknown, use a read-only migration dry run to establish it.
5. Commit approved files. Before pushing, verify the remote/branch and understand that
   pushing `main` triggers Vercel production automatically. Do not also create a redundant
   CLI deployment. Commit-only requests stop before push; a request to push production
   code must account for this automatic deployment side effect.
6. Observe the deployment matching the exact pushed commit, not simply the newest entry.
   Use bounded waits/polls with progress updates; stop and report failures rather than
   repeatedly redeploying unchanged code. Confirm READY and intended domain aliases.
7. Smoke-test public `/login`, logged-out `/admin/members` and `/week/1`, and an anonymous
   submission download. Protected pages may use an HTTP 200 streamed Next.js redirect:
   verify the login redirect and absence of protected content, not just the status code.
   The download must deny access with private/no-store. Inspect that deployment's build
   warnings and recent runtime errors, reporting existing advisories separately.
8. Report commit, production URL, migration status, checks and real-user checks still
   needed. Anonymous smoke checks are not signed-in acceptance. Do not create another
   commit/deployment solely to record a deployment ID; final handoff and Git/Vercel
   history supply the receipt. Reconcile required checklist changes without a recursive
   series of “document the previous deploy” releases.

## Known targets — verify before mutations

These identifiers are public routing context, not credentials. Stop on mismatches.

| Target | Expected value |
| --- | --- |
| Git remote | `https://github.com/Aydinm1/gap.git` |
| Production branch | `main` |
| Canonical origin | `https://www.180dcdavis.com` |
| Hosted Supabase project | `zyriqqhtgijvpecceosy` |
| Vercel project | `gap` / `prj_EfYPdTKBzpgPSMWoqMulFPKhVplx` |
| Vercel team | `team_vHV7bD9Ad3OjgOyBepW2FDw7` |

Use the connected Vercel tools with explicit project/team IDs, or an already
authenticated CLI with an exact deployment URL. Do not relink or provision projects
just because `.vercel/project.json` is absent. Never print environment values or tokens.
Read broader provider guidance only for unfamiliar behavior or changed tooling.

## Conditional hosted migration path

Use the repository-pinned CLI. The verified CLI supports explicit project references;
there is no need to link the checkout or pull secrets to release.

```bash
./node_modules/.bin/supabase db push --project-ref zyriqqhtgijvpecceosy --dry-run --skip-vault
```

Compare the pending set with the reviewed change. Stop for unexpected migrations,
incompatible old-code/new-schema transitions, destructive work or missing authorization.
An additive, backward-compatible schema goes first; incompatible changes require a
separate staged rollout. Do not reset, seed, change roles or update Vault during release.

For backfills or changes touching existing work, take scoped pre/post evidence for the
affected records: counts and original-column fingerprints, not private row dumps. Include
version timestamps, feedback and file metadata when those records are affected. Exclude
newly added columns from original-column comparisons. Investigate discrepancies and
possible live writes; never overwrite real work to make fingerprints match.

After approval and successful preflight:

```bash
./node_modules/.bin/supabase db push --project-ref zyriqqhtgijvpecceosy --skip-vault --yes
```

Verify migration receipts and targeted constraints/RLS/grants/bucket settings, plus
preservation evidence where applicable. Read-only queries with this CLI require both
`db query --linked --project-ref zyriqqhtgijvpecceosy`. Do not run local fixture-writing
test harnesses against hosted services. If migration fails, stop before push; diagnose
actual transaction state, never automatically reset or roll back a live database.

## Local verification pitfalls

- For generated types use schemas `public,private`; `npm run test:db-types` compares
  those local schemas. Default CLI schema output is not equivalent.
- Use a stable production-mode test server and its matching action manifest:
  `GAP_TEST_APP_URL=http://localhost:3004` and
  `GAP_TEST_ACTION_MANIFEST=.next/server/server-reference-manifest.json`.
  Never rebuild `.next` while that server is serving tests.
- Browser/database suites use disposable local fixtures and exact cleanup. Stop only
  test servers you started. Do not kill the user's dev server or reset their database.
- The local Webpack fallback is established; distinguish local Turbopack environment
  limits from the actual hosted build result. Do not repeatedly retry that limitation.
- CLI telemetry may need permission outside the workspace. Request the appropriate
  tool escalation instead of changing credentials or silently bypassing sandbox rules.

## Reusable skill

The versioned entry point is [gap-release](../skills/gap-release/SKILL.md). Install its
folder into the user's Codex skills directory for automatic discovery or invoke it as
`$gap-release` once available. The runbook stays in this repository so operational
changes have one maintained home; an installed copy needs updating only when the
small skill entry point changes. Skill discovery uses progressively loaded instructions;
see the [official skills guide](https://learn.chatgpt.com/docs/build-skills).
