# ADR 0002: Use stable runtime and framework release channels

- **Status:** Accepted
- **Date:** 2026-08-12
- **Supersedes:** None
- **Superseded by:** None

## Context

GAP is a production portal handling authentication, authorization, and private member
submissions, so predictable security maintenance is more valuable than preview-only
framework features. During this decision, Next.js 16.3.0 graduated to the npm `latest`
stable tag and became the security-supported upgrade from 16.2.12. The development
machine also used Node.js 22 while Node.js 24 had become the current LTS and Vercel
default.

## Decision

- Use the current stable npm `latest` Next.js release and keep `next` and
  `eslint-config-next` on the exact same version.
- Keep `react` and `react-dom` on identical stable versions.
- Use Node.js 24 LTS for local development, CI, builds, and Vercel deployment.
- Pin the Node major through `package.json` engines and `.nvmrc` while allowing `fnm` to
  manage other versions for unrelated projects.
- Adopt preview, canary, or new major toolchain releases only for a concrete requirement
  and through a separate documented decision.

## Consequences

The project receives the supported security and bug-fix path without adopting preview or
canary builds. Developers need Node.js 24, but `fnm` selects it automatically when
entering the repo.

## Alternatives considered

- **Use Next.js 16.2 Active LTS:** appeared preferable from indexed release information,
  but the live npm advisory database reports vulnerable transitive PostCSS and Sharp
  versions and identifies stable 16.3.0 as the fix.
- **Keep Node.js 22:** remains supported but diverges from Vercel's default and requires
  an earlier future runtime transition.
- **Install Homebrew Node directly:** provides Node 24 but makes per-project version
  switching and older-repository compatibility less convenient.
