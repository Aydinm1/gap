# GAP Product Specification

**Status:** Active
**Last updated:** 2026-08-13
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
- Each week has at most one assignment in the MVP, while the data model permits multiple
  assignments later.

## Member workflows

### Dashboard

The dashboard answers, in order:

1. What should I work on now?
2. What is due next or overdue?
3. Have I submitted it?
4. What feedback did I receive?
5. How far through the program am I?

It includes the program term, current week, completion progress, a continue-learning
card, closest actionable assignment, and all six modules.

### Week detail

A published week provides:

- number, title, and description;
- workshop presentation link;
- ordered resources with title, optional description, type, and URL;
- assignment title, instructions, and localized deadline;
- current submission state and history-relevant metadata;
- file upload or URL submission;
- replacement/resubmission;
- admin feedback and review status.

### Submission rules

- A submission is either `file` or `link`, never both.
- Links must be valid `http` or `https` URLs. Google Docs, Slides, Sheets, Canva, and
  other relevant providers are accepted without a provider allowlist.
- Files may be PDF, DOCX, PPTX, or XLSX and must not exceed 20 MB.
- Resubmitting creates a new submission record and supersedes the former current record.
  Historical records and timestamps are retained.
- A student may submit before or after the deadline; the real timestamp is always shown.
- Members may view only their own submissions and feedback.

## Assignment and module states

Evaluate display state in this precedence order:

1. `needs_revision`
2. `reviewed`
3. `submitted`
4. `overdue`: deadline passed and no current submission
5. `due_soon`: no current submission and deadline is within 72 hours
6. `upcoming`

`Overdue` is derived and is never stored as a submission status. Submitted and reviewed
assignments count toward module completion. Needs-revision work remains actionable and
does not count as complete.

## Admin workflows

- View total active members and current-assignment counts for submitted, outstanding,
  and awaiting review.
- Filter a submission matrix by week and open a member's current submission.
- View/download a private file or open a submitted link.
- Leave written feedback and set `submitted`, `reviewed`, or `needs_revision`.
- View retained resubmission history.
- Create and edit weeks, presentations, assignments, deadlines, and ordered resources.
- Manually publish or return a week to draft.
- Add, edit, activate, deactivate, and assign roles in the approved roster.
- Create and archive cohorts, manage GAP participant rosters, and record participation,
  advancement decisions, and promoted responses.
- View restrained cohort counts plus advancement, offer-yield, and end-to-end conversion
  percentages with transparent denominators.

## Explicitly out of scope

Do not add grades, scores, quizzes, rubrics, discussion boards, chat, email, attendance,
certificates, announcements, peer review, teams, calendars, notifications, analytics,
leaderboards, study metrics, Google Drive editing, live documents, or AI features.

The cohort outcome summaries above are the sole approved operational-reporting exception;
do not expand them into charts, engagement analytics, or a full-club CRM.

## MVP acceptance criteria

- An approved member can sign in, navigate six weeks, access published material, submit
  a file or link, replace it, and view status and feedback.
- An admin can manage the roster and week content, inspect all submissions, preserve
  history, provide feedback, and set review status.
- An unapproved, inactive, non-UC-Davis, or anonymous user cannot access protected data.
- Draft content and other members' submissions remain inaccessible even through direct
  Supabase requests.
- Student dashboard and week pages work well on mobile; admin pages remain usable with
  responsive cards or horizontal table scrolling.
