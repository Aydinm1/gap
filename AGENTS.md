<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GAP project instructions

This repository is intended to be developed collaboratively with AI agents. Treat the
documentation in `docs/` as part of the product, not as optional commentary.

## Required reading before changes

1. Read `docs/README.md` and `todo.md`.
2. Read the source-of-truth document(s) relevant to the requested change.
3. For Next.js work, read the relevant installed guide in
   `node_modules/next/dist/docs/` before editing code. This project uses Next.js 16 and
   older conventions may be incorrect.
4. Inspect the current code, migrations, and git status before assuming the documented
   state has already been implemented.

## Source-of-truth rules

- `docs/product-spec.md` owns product behavior and scope.
- `docs/design-system.md` owns visual, responsive, accessibility, and brand decisions.
- `docs/architecture.md` owns application boundaries, routes, and data flow.
- `docs/data-model.md` owns schema, authorization, RLS, and Storage contracts.
- `docs/operations.md` owns setup, deployment, and external configuration.
- `todo.md` tracks approved implementation work; it does not override the documents
  above.
- `docs/ideas.md` is non-authoritative. Do not implement an idea merely because it is
  recorded there.

When documents conflict, use the narrowest relevant source of truth. If ambiguity
remains, stop and resolve it explicitly rather than silently choosing a new rule.

## Change workflow

- Keep code, migrations, tests, documentation, and `todo.md` consistent in the same
  change.
- Update a living document whenever behavior, schema, architecture, security,
  operations, or design rules change.
- Add an ADR under `docs/decisions/` for durable architecture, schema, authorization,
  security, or major product decisions. Do not create ADRs for routine implementation
  details.
- Add meaningful user-facing, database, operational, and security changes to the
  `Unreleased` section of `CHANGELOG.md`.
- Use `[ ]` for pending, `[~]` for active, and `[x]` for completed tasks in `todo.md`.
  Mark work complete only after its stated checks pass.
- Preserve existing user changes. Never rewrite or discard unrelated dirty-worktree
  changes.
- Do not claim that Supabase, Google Cloud, or Vercel configuration is complete unless
  it was actually verified. Record manual steps precisely.

## Definition of done

A change is complete only when relevant code and migrations are implemented, validation
passes, canonical documentation reflects reality, `todo.md` is current, and the
changelog is updated when applicable.
