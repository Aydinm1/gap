# GAP Product Specification

**Status:** Active
**Last updated:** 2026-10-21
**Source of truth for:** Product scope, workflows, states, and acceptance criteria

## Product goal

GAP, the Growth Analyst Program, is a lightweight internal analyst-development portal for
180 Degrees Consulting at UC Davis. It supports a six-week professional development
program and prioritizes the
loop:

> learn → submit → review → receive feedback

It should feel like a restrained consulting-firm training portal, not a school LMS.

## Users and access

- **Member:** an active approved member who signs in with a UC Davis Google account.
- **Admin:** an active approved member with responsibility for content, roster, and
  submission review.
- Authentication requires Google through Supabase Auth and a verified email ending in
  `@ucdavis.edu`.
- Authentication alone never grants application access. The normalized authenticated
  email must match an active approved-roster entry.
- The approved roster is authoritative for role and access.

## Program model

- Fall 2026 is the active MVP cohort. The durable model supports Fall, Winter, and Spring
  cohorts identified by quarter and calendar year.
- A permanent GAP person may have multiple cohort enrollments. Login access can be
  deactivated without erasing historical participation.
- The program contains exactly six ordered modules:
  1. Consulting Fundamentals
  2. Research & Problem Solving
  3. Client Communication
  4. Data & Insights
  5. Building Recommendations
  6. Final Case
- A week is either `draft` or `published`.
- Members see all six week numbers and titles. Draft weeks appear as locked upcoming
  cards; their description, slides, resources, assignment, and deadline remain hidden.
- Each week supports an ordered collection of assignments. Each has its own title,
  instructions, PDF brief, deadline, submissions, feedback, and retained history.

## Member workflows

Admins can open “Preview as member” for the selected cohort without enrollment.
Admin navigation shows “My program” only when the admin has enrolled participation in
an active cohort, and omits the generic member-portal/profile return links otherwise.
The read-only preview shares the member dashboard/week presentation, uses a sample
member with no submissions, keeps drafts locked, and allows published assignment PDF
downloads under existing admin authorization. “Preview submission” opens the shared
editor with local typing/file selection/link entry and a visible preview-only notice.
Saving and uploading are disabled; preview drafts are component-local, separate from
member drafts. No attempts, uploads, enrollments or progress are created. Preview never
impersonates a learner or shows real learner work. Draft/archived cohorts show an access warning.

### Dashboard

The dashboard answers, in order:

1. What should I work on now?
2. What is due next or overdue?
3. Have I submitted it?
4. What feedback did I receive?
5. How far through the program am I?

It includes the program term, a thin Continue where you left off header attached to the
module panel, completion progress
beside the module list, and all six modules. The bar contains the current learning week's
number, title, and one Continue action opening that week. Assignment details, deadlines,
and feedback summaries belong on the week and submission pages, not the dashboard.
Awaiting-review work remains visible in module status but is not a next-step priority.
Only approved (`completed`) assignments count toward completion. A week is complete
when it has at least one assignment and all its assignments are approved. Show partial
progress such as “1 of 3 assignments complete”; a no-assignment week has no automatic
completion event. Draft assignments remain hidden with their draft week.

### Week detail

Admins may attach one current PDF assignment brief (up to 20 MB) directly in the week
editor after saving its assignment. Uploading saves the attachment immediately,
independently of text edits; replacing a published brief updates what members download.
Members download the current brief beside the instructions only when the week is
published and their active cohort enrollment grants access. Draft briefs stay private.
The text instructions and submission deadline remain required. Briefs are separate from
member submissions and do not affect review/completion state.

On Members → Manage cohort, admins may edit start/end dates after creation. Dates must
be valid calendar dates with end on or after start. Changing these dates does not change
the cohort's quarter/year, participation history, or assignment deadlines.

A published week provides:

- number, title, and description;
- workshop presentation link;
- ordered resources with title, optional description, type, and URL;
- compact, ordered assignment cards with title, localized deadline, optional summary,
  status icon/text, and one View assignment action;
- materials below the assignment cards.

Each assignment opens its own page with back-to-week navigation, title, deadline,
optional summary/PDF download, complete instructions and a submission workspace below
the brief, not in a stretched side column. Existing submission-review URLs remain valid
and link back to their assignment; feedback, revisions and history stay on that page.
Admin preview uses the same assignment layout with non-mutating submission controls.

Admins may write a separate optional summary (up to 300 Unicode characters), never an
automatically truncated brief. Existing assignments without summaries show no teaser.
Instructions remain plain text unless an admin explicitly chooses formatting or uses
the toolbar. The restricted Markdown subset supports section headings, bold, flat
bulleted/numbered lists and HTTP(S) links. Raw HTML, images, embeds, arbitrary styles,
and unsupported syntax are not interpreted. Unsafe links remain inert literal text.
The admin editor offers a toolbar, format choice and rendered preview; instructions
are limited to 50,000 Unicode characters. This does not add rich text to member responses.
See [proposed Notion SWOT formatting](examples/notion-swot-assignment.md); applying it
to real content requires approval of the full brief, not an automatic migration.

### Submission rules

- A submission is exactly one of `text`, `file`, or `link`; no combined attachments.
- Written responses are nonblank plain text, at most 20,000 Unicode characters. Preserve
  paragraphs/line breaks; normalize CRLF/CR to LF. Render escaped text directly in
  member/admin review and history, never HTML. No rich text or autosave is included.
  Drafts survive in-app member navigation, switching methods and failed saves, but not
  reload. Warn on unloading unsaved input and confirm explicit cancellation.
- Links must be valid `http` or `https` URLs. Google Docs, Slides, Sheets, Canva, and
  other relevant providers are accepted without a provider allowlist.
- Files may be PDF, DOCX, PPTX, or XLSX, must be nonempty, and must not exceed
  20 × 1024 × 1024 bytes. Private downloads are available to the active owner and admins,
  including previous attempts. Review is download-first, not an embedded viewer.
- Uploads show progress, checking/saving, retryable errors, and cancellation. An uploaded
  object is not a submission until validation and atomic finalization succeed. The
  selected file is retained for recoverable failures only in the current page session;
  after reload, reselect it. Link/text submission remains available if Storage is unhealthy.
- If cancellation cannot be confirmed, explain the one-hour expiry and retain the file
  selection; allow starting again or switching to a link. Retrying a lost save response
  must return the existing submission rather than create another attempt.
- Basic document-format validation is not malware scanning. No hosted cleanup schedule,
  online document editing, or Monday file export is included.
- Resubmitting creates a new submission record and supersedes the former current record.
  Historical records and timestamps are retained.
- Members may replace work while it is awaiting review and must revise work when a
  revision is requested. Once an admin marks a submission complete, it is closed to
  member replacement unless an admin requests a revision.
- Review is metadata, not a submission outcome. Both `revision_requested` and `completed`
  carry `reviewed_at` and `reviewed_by`; requesting a revision requires written feedback.
- A student may submit before or after the deadline; the real timestamp is always shown.
- Members may view only their own submissions and feedback.

## Assignment and module states

Evaluate display state in this precedence order:

1. `revision_requested`
2. `completed`
3. `submitted`
4. `overdue`: deadline passed and no current submission
5. `due_soon`: no current submission and deadline is within 72 hours
6. `upcoming`

`Overdue` is derived and is never stored as a submission status. Submitted work is awaiting
review and does not count as approved. Missing, submitted, or revision-requested work
keeps its week incomplete. Review and replacement operate on an individual assignment.

The editor adds/removes assignments independently and saves the full week atomically.
An assignment with submissions, upload intents or PDF references cannot be removed.
Adding an assignment to a published week makes it required immediately and can return
a formerly complete week to partial completion. The review queue explicitly selects an
assignment, including when several belong to the same week.

## Admin workflows

- View total active members and current-assignment counts for submitted, outstanding,
  and awaiting review.
- Filter a submission matrix by week and open a member's current submission.
- View/download a private file or open a submitted link.
- Return work to awaiting review, request a revision with written feedback, or mark the
  review complete with optional feedback.
- View retained resubmission history.
- Create and edit weeks, presentations, assignments, deadlines, and ordered resources.
- Manually publish or return a week to draft.
- Add, edit, activate, deactivate, and assign roles in the approved roster.
- Create and archive cohorts, manage GAP participant rosters, and record participation,
  advancement decisions, and promoted responses.
- View restrained cohort counts plus advancement, offer-yield, and end-to-end conversion
  percentages with transparent denominators.

## Monday.com recruiting and club reporting — Planned

Monday.com is the intended home for club applications, recruiting stages, acceptance
decisions, and club member records. Application intake is expected to use a Monday form;
the actual form and boards have not been selected or verified.

Supabase remains authoritative for GAP enrollment, access, program content, private
files, submissions, feedback, participation, advancement, and promotion responses.
The intended flow is application in Monday → recruiting review and acceptance in Monday
→ lead checks “Enroll in GAP” → participant enrolled in GAP → GAP progress and outcomes
summarized back in Monday.
Acceptance into GAP, completion of GAP, promotion, and joining the club are separate
milestones. An application alone never grants portal access.

The planned initial reporting set is:

| Level | Information |
| --- | --- |
| Person per cohort | Name/email linkage, cohort, participation status, submissions versus assignments due, approved count, awaiting-review count, outstanding revisions, advancement decision, promotion response, authenticated GAP record link, last successful sync time |
| Cohort | Applicants, accepted applicants, starters, completed participants, withdrawals, promoted participants, joined participants, pending decisions/responses, assignment submission rate for work due, advancement rate, offer yield, starter-to-member conversion |

Applicant and acceptance counts come from Monday. GAP supplies program progress and
outcomes. Preserve each application cycle and cohort participation when a person returns;
do not overwrite a previous cohort's history.

Individual progress is intended for relevant club leadership; broader club reporting
uses cohort totals. Keep original files, submitted document URLs, submission history,
written feedback, and reviewer notes inside GAP. Monday links to authorized GAP pages,
not directly to private files.

### Enrollment approval — Approved, not implemented

The underlying private database enrollment operation is implemented and locally tested;
the checkbox workflow described here is not configured or connected to the portal.

Use an “Enroll in GAP” checkbox on the accepted-members board, unchecked by default.
An authorized GAP lead checks it once the accepted applicant and target cohort are ready.
“Accepted” alone does not enroll someone or grant portal access. The checkbox requests
enrollment; a separate result must show pending, enrolled, or failed, with a successful
enrollment timestamp or an actionable error. Do not treat a checked box as proof of access.

Enrollment requires presence on the accepted-members board, checked approval, explicit
GAP admin confirmation, a mapped target cohort, and an eligible UC Davis
identity under the existing roster rules. Invalid requests grant no new access. Successful
processing creates or links the person, cohort enrollment, and approved member access;
it does not grant administrator privileges. Repeated requests must not duplicate records
or reset existing participation/outcome history.

Unchecking the box does not withdraw someone, revoke access, or delete history. Those
remain explicit GAP administration actions. See [ADR 0005](decisions/0005-explicit-gap-enrollment.md).

Open decisions before implementation: exact Monday boards/columns and audience,
synchronization timing, and final field mappings.

The first adapter is manual and read-only toward Monday: admins preview checked members,
map each dropdown choice to an active/draft GAP cohort, then confirm eligible rows.
Membership Status is context only, never acceptance or automatic revocation. Results
appear in GAP. Each external item represents one cohort participation; returning members
use new items. Automatic sync, Monday result fields, and reporting remain deferred.

## Explicitly out of scope

### Approved exception: week workshop attendance

Workshop joins Guide, Template, Reading and Video in ordered Materials. Preserve existing
materials and the separate presentation link. Admin Attendance retains selected cohort,
showing week dates/state/present counts. One workshop session maps to each week. Active
cohorts/published weeks can open a static six-character code/QR for two hours (DB time),
redisplay unchanged, or close early. Deliberate reopening renews date/code/window but
retains marks. A searchable phone roster supports Mark present and confirmed Undo,
including historical corrections with actor/time/history. States are Present/Not recorded.

Open prompts supplement Continue and appear on the matching week. Members explicitly
confirm at `/attendance/[sessionId]`; scans/GET never mark attendance. Logged-out scans
see generic sign-in. Fragment codes are captured in tab storage and removed from the
address bar, never included in OAuth returns. Authorized receipts survive retries/reload.
Closed, wrong-cohort, invalid-code and save-failure states are actionable. Ten failed
attempts per person/session in five minutes temporarily block attempts.

Only current approved UC Davis Google members enrolled in the matching active cohort and
published week can self-check-in. Codes/classmate records remain private. Attendance is
independent of assignments: no inferred absence/lateness, penalties, percentages, GPS,
device tracking, Monday sync or realtime. See
[ADR 0015](decisions/0015-week-workshop-attendance.md); local and hosted acceptance are
tracked separately in `todo.md`.

### Current implementation boundaries

Do not add grades, scores, quizzes, rubrics, discussion boards, chat, email,
certificates, announcements, peer review, teams, calendars, notifications, analytics,
leaderboards, study metrics, Google Drive editing, live documents, or AI features.

The cohort outcome summaries and planned Monday reporting set above are the approved
operational-reporting exceptions. Do not expand GAP into charts, engagement analytics,
or a full-club CRM.

## MVP acceptance criteria

- An approved member can sign in, navigate six weeks, access published material, submit
  a file or link, replace actionable work, and view status and feedback.
- An admin can manage the roster and week content, inspect all submissions, preserve
  history, provide feedback, and set review status.
- The admin review queue opens on awaiting-review work, keeps queue filters mutually
  exclusive, and returns reviewers to their prior cohort/week/filter/search context.
  A review can be saved in place or saved while advancing to the next awaiting item.
- Draft weeks may be saved incomplete. Publishing requires the member-facing title,
  description, valid resources, and complete assignment fields; assignments with any
  submission history cannot be removed.
- An unapproved, inactive, non-UC-Davis, or anonymous user cannot access protected data.
- Draft content and other members' submissions remain inaccessible even through direct
  Supabase requests.
- Student dashboard and week pages work well on mobile; admin pages remain usable with
  responsive cards or horizontal table scrolling.
