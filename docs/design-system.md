# GAP Design System

**Status:** Active
**Last updated:** 2026-08-12
**Source of truth for:** Brand use, visual tokens, UI patterns, responsive behavior, and accessibility

## Direction

GAP, the Growth Analyst Program, is an internal consulting-firm analyst development
portal: clean, modern,
professional, restrained, and warm. Favor strong typography, whitespace, thin borders,
clear hierarchy, and a single green accent. Avoid school-LMS styling, excessive cards,
decorative analytics, gradients used as spectacle, and visual clutter.

## Brand authority

1. `design_references/180DC Brand Identity Design Guide Draft (1).pdf` is the primary
   UC Davis visual guide.
2. `design_references/180DC Brand Guidelines 2024.pdf` governs global logo handling and
   voice where it does not conflict with the UC Davis guide.
3. The UC Davis guide wins on conflicting palette and typography choices.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Charcoal | `#434343` | Primary text, dark surfaces, headings |
| Brand green | `#55B441` | Primary actions, selected states, highlights |
| Deep green | `#519D39` | Hover/pressed states and restrained secondary accents |
| White | `#FFFFFF` | Main backgrounds and reversed text |

The supplied brand greens do not meet WCAG AA contrast with white for normal-size text.
Use derived action green `#2F7328` for primary controls and `#275F22` for their hover
state. Keep the supplied greens for brand accents, progress, and selected surfaces.

Implementation may add neutral tints derived from charcoal and white for page
backgrounds, muted text, borders, and disabled states. Status colors may add accessible
amber and red only when semantic meaning requires them. Green must not communicate an
error or overdue state.

## Typography

- Use Montserrat through `next/font/google` for MVP display and interface text.
- Proxima Nova is the preferred display face only if licensed font files are supplied and
  can be self-hosted through `next/font/local`.
- Do not fetch fonts through stylesheet links.
- Use bold, compact display headings; readable body sizes; and restrained uppercase
  tracking for section labels.
- Do not copy the PDF's print point sizes literally into the responsive web UI.

## Logo assets

Original approved assets live in `design_references/Official Logos/` and must remain
unchanged. Runtime copies should be normalized into `public/brand/` with predictable,
descriptive filenames.

| Runtime asset | Source use |
| --- | --- |
| `180dc-uc-davis-primary-dark.png` / `-light.png` | Full branch lockup for spacious light/dark surfaces |
| `180dc-uc-davis-compact-dark.png` / `-light.png` | Short branch lockup for compact light/dark surfaces |
| `180dc-uc-davis-landscape-dark.png` / `-light.png` | Horizontal navigation and page headers |
| `180dc-globe.png` | Compact mark where branch identity is already established |

- Use the full black-text UC Davis lockup on light sign-in or presentation surfaces.
- Use the matching white-text lockup on dark surfaces.
- Use a short UC Davis lockup for compact navigation.
- Use the globe only for favicon, avatar-like, or small-space treatment where the full
  branch identity is already visible elsewhere.
- Never recolor, distort, shadow, redraw, or add elements to a logo.
- Preserve transparency, aspect ratio, and clear space. Transparent canvas cropping is
  allowed if no visible pixels are changed.
- Provide meaningful alt text when the logo communicates identity; use empty alt text
  when nearby text repeats the complete name.

## Core UI patterns

- **Application shell:** compact brand header, clear page title, profile control, and
  minimal navigation. Use one vertically centered row for logo, navigation, and profile
  on large screens. Below that breakpoint, keep logo and profile together with navigation
  on a horizontally scrollable second row.
- **Primary action:** solid brand green with white text and deep-green hover.
- **Secondary action:** white/neutral surface with charcoal border and text.
- **Cards:** white or near-white, subtle border, modest radius, minimal shadow.
- **Status badges:** short text labels with icon/color as redundant cues; never color
  alone.
- **Submission outcomes:** lead with one plain-language result, place reviewer feedback
  directly beneath a single Feedback heading, and connect file metadata and actions in
  one submitted-work record. Place the icon-free status badge beside Feedback instead of
  repeating status labels or helper copy. Use a single bordered attachment tile and
  standard button hierarchy; avoid alert-like filled feedback boxes. Revision feedback
  uses an amber editorial rule and prominent reviewer text, with review metadata demoted
  beneath it. Every retained historical attempt provides a quiet view action.
- **Progress:** thin linear bar plus a textual value such as `2 / 6 modules complete`.
- **Forms:** visible labels, help/error text, clear focus rings, and full-width controls on
  small screens.
- **Tables:** quiet dividers and sticky/clear headers; use horizontal scrolling or cards
  on narrow screens.
- **Empty/error states:** concise explanation and one useful next action; no fake data.

## Component conventions

- Shared primitives live under `src/components/ui`; product-aware presentation belongs in
  a domain folder such as `src/components/program`.
- Prefer explicit variants and native HTML attributes. Do not add polymorphic component
  APIs or a component dependency until a concrete interface requires one.
- Buttons and button-styled links are separate components so their semantics remain clear.
- Server Components are the default. Keep interactive client boundaries narrow, as with
  the profile menu.
- `/dev/ui` is the non-production review surface for tokens, primitives, shell variants,
  and representative states. Assignment lifecycle state changers belong only on this
  design-guide surface and never appear in member-facing program routes.

## Responsive behavior

- Design student pages mobile-first in behavior even when composing desktop-first.
- Cards stack, deadlines stay near assignment titles, and submission controls remain
  thumb-friendly on small screens.
- Week detail pages are assignment-first: instructions retain the wide column in every
  lifecycle state while a compact submission rail answers status and next action.
  Workshop slides and references follow in one quieter, full-width materials list, with
  the presentation first and ordered references beneath it.
- Do not enlarge short status copy to fill the assignment body or hide instructions after
  submission. Written feedback, revision controls, current work, and history belong on a
  focused submission-review page reached through `View feedback` or `View submission`.
- On the review page, real reviewer feedback may own the wide column. Awaiting-review
  states remain compact instead of manufacturing an empty feedback region. Compose the
  review as an open page with a bordered submitted-work record, a full-width revision
  editor when active, and quiet history beneath rather than one enclosing card. Treat it
  as a child detail of its week by retaining week context, page-title scale, spacing
  rhythm, and the same submitted-work record at a roomier density.
- Avoid fixed widths that cause horizontal overflow.
- Components inside narrow desktop panes must use their actual available space rather
  than global viewport breakpoints. Keep attachment metadata above its actions when a
  sibling column constrains the component width.
- Admin pages may prioritize desktop density but must remain operable on mobile.
- Member titles share a 32px mobile/36px desktop scale with admin titles. The dashboard
  leads with one next-step feature and places progress beside the module-list heading.
  Week submission rails use unboxed attachment metadata; submission review retains the
  roomier bordered record and prominent feedback. Materials have a direct anchor from
  the week introduction. Status labels distinguish awaiting review from complete.
- Submission editors show file formats and the 20 MB limit before selection. Opening an
  editor focuses its heading; cancelling restores focus to the action that opened it.
  Unavailable sample-file actions display an adjacent explanation.
- Admin pages use the same editorial headings and restrained surfaces as member pages,
  with a persistent cohort context bar beneath the primary header. Operational queues
  lead; cohort outcome summaries remain secondary and use counts plus transparent
  denominators rather than charts. Submission tables become per-member cards on narrow
  screens, and long editors use clearly separated sections with a sticky save area.
- Admin page titles use a compact `text-3xl` to `text-4xl` scale. Review queues default
  to awaiting-review work and expose mutually exclusive status filters, member search,
  and the selected assignment before the table. Submission review follows reading order:
  submitted work, feedback, decision, then save actions. Member and access records stay
  readable until an explicit edit action opens their controls.
- All admin deadline fields are labeled Pacific time. Repeated daylight-saving times
  require an explicit PDT/PST choice, and nonexistent spring-forward times are rejected.

## Accessibility baseline

Dashboard overview refinements: pair the featured week and primary Continue Week action with
an assignment summary in one divided surface, stacked on mobile. Full feedback belongs
on the review page, reached through a secondary text link. Module rows place week numbers beside titles and use distinct icons:
check for complete, clock for awaiting review, revision arrow for requested changes,
forward arrow for available work, and lock for upcoming modules. Retain text labels.

- Meet WCAG AA color contrast for text and interactive controls.
- Provide visible keyboard focus and logical focus order.
- Use semantic headings, links, buttons, labels, tables, and status announcements.
- Ensure targets are at least 44 by 44 CSS pixels where practical.
- Do not hide essential information behind hover.
- Respect reduced-motion preferences and use motion only to clarify state.
