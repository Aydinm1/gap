# Changelog

All meaningful changes to GAP are documented here. This project follows the structure of
Keep a Changelog without assigning versions until the first release.

## Unreleased

- Made Continue Week the dashboard's primary action, with feedback and assignment
  actions presented as secondary links.

- Restored distinct module status icons and replaced the dashboard next-step panel with
  a paired week and assignment overview, keeping full feedback on the review page.

- Refined member pages with one dashboard next-step feature, progress beside modules,
  consistent headings, direct materials navigation, and quieter submission-rail metadata.
- Shared member submissions and drafts across client navigation, preserving prior attempts
  and other assignments when revising work. Added explicit awaiting-review labels,
  visible sample-file feedback, draft cancellation confirmation, and editor focus handling.

- Locked completed submissions in the member workspace: finished work now offers only
  the view action, while awaiting-review and revision-requested work remains replaceable.

### Added

- Mock admin workspace with URL-preserved cohort and queue context, mutually exclusive
  review filters, search, review-next flow, responsive member cards, submission history,
  explicit participant/access editors, structured week publishing, and cohort outcomes.
- Pacific wall-clock deadline conversion with daylight-saving gap and ambiguity checks,
  plus unsaved-change protection for admin week and review detail workflows.
- Admin-specific DTOs, validation, authorization checks, selectors, fictional fixtures,
  and dependency-free domain tests designed for later Supabase replacement.
- Structured documentation system for product, design, architecture, data, operations,
  ideas, and durable decisions.
- AI contributor workflow and definition of done in `AGENTS.md`.
- Phased implementation tracker for the full MVP.
- Public environment-variable example and dependency-free foundation checks.
- Normalized official brand assets and branded application icons.
- Node.js 24 LTS runtime pinning and `fnm`-compatible project selection.
- Montserrat-based Tailwind theme tokens, accessible UI primitives, and responsive member
  and admin application-shell variants.
- Typed Fall 2026 mock program data, submission-history fixtures, and deterministic state,
  completion, selection, and Pacific-time formatting helpers.
- Non-production component lab for reviewing the visual system and representative states.
- Dependency-free domain-state tests using Node's built-in TypeScript stripping.
- Interactive week-progress and local file-selection previews in the component lab.
- Mock-backed student dashboard with program progress, priority revision work, feedback,
  and a protected six-module catalog.
- Published-week route scaffold with draft and malformed-route denial.
- Pure dashboard view-model and safe published-week lookup with edge-state tests.
- Fall, Winter, and Spring cohort domain contracts with permanent people, explicit
  enrollments, advancement decisions, promoted responses, and fictional cohort history.
- Transparent cohort advancement, offer-yield, and end-to-end conversion selectors.
- Accepted cohort-history architecture decision and cohort-aware Supabase schema plan.
- Current cohort context in the analyst profile dropdown.
- Simplified dashboard status with one clear completed-program progress indicator.
- Complete mock week workspace with workshop materials, resources, assignment state,
  file/link replacement, feedback, and retained submission history.
- Pure cohort-scoped week-detail, submission validation, and immutable replacement helpers.
- Focused member submission-review route for feedback, revision, current work, and history.

### Changed

- Unified week presentations and references into one materials list, simplified the
  assignment hierarchy, and clarified the revision-requested next action.
- Reworked submission review into an open, state-aware layout with compact awaiting-review
  content, a full-width revision editor, and quieter retained history.
- Emphasized reviewer feedback, enlarged current submitted-work controls, and added view
  actions for every retained submission attempt.
- Aligned submission review with its parent week through shared header scale, spacing,
  week context, and a reusable submitted-work record.
- Made the program dashboard the member home, shortened week routes to `/week`, moved
  the retired public splash to development-only `/dev/info`, and made the header logo
  the home control while preserving old `/program` links with permanent redirects.
- Moved assignment lifecycle preview controls out of member-facing week and submission
  routes and into the non-production component lab, leaving the real workspaces driven
  solely by their current submission data.
- Kept assignment instructions in the wide week-page column across every submission state
  and reduced the submission rail to status, current-work metadata, and one next action.
- Reframed week detail pages around the assignment workflow, with progressive submission
  controls, a full-width desktop workspace, and quieter workshop and resource references.
- Simplified submission review into an outcome-first status, prominent feedback, compact
  current-file metadata, and an always-visible timeline of prior attempts.
- Recast reviewer feedback as an editorial note and joined current-file metadata with its
  view and revision actions in one cohesive submitted-work record.
- Reconnected the editorial review treatment to the shared UI kit with icon-free status
  badges, a restrained attachment tile, and standard secondary and primary controls.
- Repaired the submitted-work tile so metadata keeps its full row and equal-width actions
  no longer compress filenames or timestamps inside the desktop review pane.
- Reduced completed submission states to one Feedback heading, one adjacent status badge,
  and the reviewer comment without repeated labels or instructional copy.
- Split assignment workspaces into automatic preparation and review modes, with a
  development-only four-state preview control for visual and interaction testing.
- Replaced ambiguous reviewed/needs-revision outcomes with submitted,
  revision-requested, and completed states; review remains timestamped metadata.
- Official UC Davis logo assets are now treated as available production brand sources.
- Reworked the holding page around the Growth Analyst Program name and UC Davis brand
  palette.
- Confirmed Next.js 16.3.0 as the current secure stable release while retaining React
  19.2.
- Updated the branded holding page to consume the shared Phase 1 design tokens.
- Refined the application header into a single desktop row with an adaptive two-row mobile
  layout, standardized showcase previews on Aydin Merchant, and presented the member role
  as Analyst in the interface.

### Fixed

### Security
