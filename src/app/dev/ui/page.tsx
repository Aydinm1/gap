import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { AssignmentStatusBadge } from "@/components/program/assignment-status-badge";
import { FileUploadPreview } from "@/components/dev/file-upload-preview";
import { ProgressPlayground } from "@/components/dev/progress-playground";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/container";
import { Field } from "@/components/ui/field";
import { StateMessage } from "@/components/ui/state-message";
import { mockCohorts, mockStatusExamples, mockUsers, researchPlanAssignment } from "@/lib/program/mock-data";
import { formatCohortLabel, formatDeadline } from "@/lib/program/state";

export const metadata: Metadata = { title: "UI Lab | GAP" };

const memberNavigation = [
  { label: "Program", href: "#member-shell", current: true },
  { label: "Resources", href: "#resources" },
] as const;

const adminNavigation = [
  { label: "Overview", href: "#admin-shell", current: true },
  { label: "Submissions", href: "#statuses" },
  { label: "Weeks", href: "#forms" },
  { label: "Members", href: "#states" },
] as const;

const profileLinks = [
  { label: "Profile", href: "#profile" },
  { label: "Sign out", href: "#sign-out" },
] as const;

export default function UiLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-canvas pb-24 text-ink">
      <section id="member-shell" aria-labelledby="member-shell-title">
        <h1 id="member-shell-title" className="sr-only">Member application header</h1>
        <AppHeader user={mockUsers.member} navigation={memberNavigation} profileLinks={profileLinks} cohortLabel={formatCohortLabel(mockCohorts.fall2026)} />
      </section>

      <PageContainer className="py-12 sm:py-16">
        <div className="max-w-3xl">
          <Badge tone="success">Development only</Badge>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">GAP interface system</p>
          <h2 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Component lab</h2>
          <p className="mt-5 text-base leading-7 text-ink-soft sm:text-lg">
            A single review surface for the visual language, application shell, and deterministic mock states that later portal routes will consume.
          </p>
        </div>

        <section className="mt-16" aria-labelledby="type-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Foundations</p>
          <h2 id="type-title" className="mt-2 text-2xl font-bold tracking-[-0.025em]">Typography and color</h2>
          <Card className="mt-6 grid gap-8 p-6 md:grid-cols-2 md:p-8">
            <div>
              <p className="text-4xl font-bold tracking-[-0.04em]">Clear thinking, clearly presented.</p>
              <p className="mt-4 leading-7 text-ink-soft">Montserrat supports compact consulting-style headings and readable interface text.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold sm:grid-cols-3">
              {[
                ["Charcoal", "bg-[#434343] text-white"],
                ["Brand", "bg-brand text-ink"],
                ["Action", "bg-action text-white"],
                ["Canvas", "bg-canvas text-ink border border-border"],
                ["Surface", "bg-surface text-ink border border-border"],
                ["Danger", "bg-danger-bg text-danger-text"],
              ].map(([label, classes]) => (
                <div key={label} className={`grid min-h-20 place-items-center rounded-lg p-3 text-center ${classes}`}>{label}</div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-16" aria-labelledby="actions-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Actions</p>
          <h2 id="actions-title" className="mt-2 text-2xl font-bold tracking-[-0.025em]">Buttons and progress</h2>
          <Card className="mt-6 p-6 md:p-8">
            <div className="flex flex-wrap gap-3">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary action</Button>
              <Button variant="quiet">Quiet action</Button>
              <Button variant="danger">Remove access</Button>
              <Button disabled>Disabled</Button>
              <ButtonLink href="#statuses">Button link</ButtonLink>
            </div>
            <div className="mt-10"><ProgressPlayground /></div>
          </Card>
        </section>

        <section id="statuses" className="mt-16" aria-labelledby="status-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">State language</p>
          <h2 id="status-title" className="mt-2 text-2xl font-bold tracking-[-0.025em]">Assignment statuses</h2>
          <Card className="mt-6 p-6 md:p-8">
            <div className="flex flex-wrap gap-3">
              {mockStatusExamples.map((example) => <AssignmentStatusBadge key={example.state} state={example.state} />)}
            </div>
            <div className="mt-8 border-l-2 border-brand pl-5">
              <h3 className="font-bold">{researchPlanAssignment.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">Due {formatDeadline(researchPlanAssignment.dueAt)}</p>
            </div>
          </Card>
        </section>

        <section id="forms" className="mt-16" aria-labelledby="forms-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">Inputs</p>
          <h2 id="forms-title" className="mt-2 text-2xl font-bold tracking-[-0.025em]">Fields and validation</h2>
          <Card className="mt-6 p-6 md:p-8">
            <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-8">
              <FileUploadPreview />
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.12em] text-ink-faint md:h-full md:flex-col">
                <span className="h-px flex-1 bg-border md:h-auto md:w-px" aria-hidden="true" />
                <span>or</span>
                <span className="h-px flex-1 bg-border md:h-auto md:w-px" aria-hidden="true" />
              </div>
              <div className="space-y-6">
                <Field id="submission-link" label="Submit link" type="url" placeholder="https://docs.google.com/..." hint="Google Docs, Slides, Sheets, Canva, and other http or https links are accepted." />
                <Field id="invalid-link" label="Link with error" type="url" defaultValue="docs.google.com/example" error="Enter a valid link." />
              </div>
            </div>
          </Card>
        </section>

        <section id="states" className="mt-16 space-y-5" aria-labelledby="states-title">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-deep">System messages</p>
          <h2 id="states-title" className="mt-2 text-2xl font-bold tracking-[-0.025em]">Empty and error states</h2>
          <StateMessage title="No submissions yet" action={<ButtonLink href="#forms" variant="secondary">Review assignment setup</ButtonLink>}>
            Submitted work will appear here once members begin the exercise.
          </StateMessage>
          <StateMessage title="We could not load this week" tone="error" action={<Button>Try again</Button>}>
            Check your connection and retry. Your existing work has not been changed.
          </StateMessage>
        </section>
      </PageContainer>

      <section id="admin-shell" aria-labelledby="admin-shell-title" className="border-y border-border">
        <h2 id="admin-shell-title" className="sr-only">Admin application header</h2>
        <AppHeader user={mockUsers.admin} navigation={adminNavigation} profileLinks={profileLinks} cohortLabel={formatCohortLabel(mockCohorts.fall2026)} />
      </section>
    </main>
  );
}
