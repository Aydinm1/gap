---
name: gap-release
description: Release the GAP portal to production when asked to commit, push, deploy, or apply GAP migrations. Uses the project's verified Supabase-before-Vercel workflow, with a lighter code-only path.
---

# GAP release

Use the maintained [release runbook](../../docs/release.md) in the GAP repository.
For this machine the repository is `/Users/user/Documents/Coding/gap`; when this
skill is installed outside the repository, read that repository's `docs/release.md`
instead of resolving the relative link against the installation directory.
On another machine, locate the checkout with remote `github.com/Aydinm1/gap`
before using it. Do not run this workflow against another project.

Read the common release steps, then the migration section only when schema changes
are pending or hosted migration state is uncertain. Reuse passing checks for the
unchanged tree; never substitute old results for changed code. Do not repeatedly
inventory production data for ordinary code-only releases.

The user's current request determines permission: commit, push, deployment and
hosted migration are distinct actions. This skill grants none by itself. Stop at
the authorized boundary. Creating or editing this skill is not a release request.
