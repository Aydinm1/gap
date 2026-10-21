# ADR 0014: Focused assignment pages and restricted brief formatting

- **Status:** Accepted
- **Date:** 2026-10-21

## Context

Multiple full briefs make week pages too long; short PDF instructions leave oversized
empty cards. A submission sidebar stretches unnecessarily beside long plain prose.

## Decision

Keep compact ordered summary/status cards on week pages. Open complete instructions
and submission controls on protected per-assignment routes, including admin preview.
Retain existing feedback/history URLs and all assignment identifiers.

Add optional authored summaries and an explicit plain/Markdown format. Default all
existing instructions to plain text without rewriting. Support only headings, bold,
flat lists and safe HTTP(S) links, rendered as escaped React elements. Unsupported
HTML/images/embeds are literal text. Share the renderer with a small admin toolbar
and preview. Keep member-written responses plain and no content migrations automatic.

## Consequences

One extra navigation step yields a readable week overview and focused workspace.
The restricted subset is not full CommonMark or a WYSIWYG editor. Summary/format saves
remain atomic with the week and preserve history/RLS. Hosted release and real SWOT
content edits are separately authorized.
