import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";
import { findPublishedWeek } from "@/lib/program/catalog";
import { mockWeeks } from "@/lib/program/mock-data";

type WeekPageProps = { params: Promise<{ weekNumber: string }> };

export async function generateMetadata({ params }: WeekPageProps): Promise<Metadata> {
  const { weekNumber } = await params;
  const week = findPublishedWeek(mockWeeks, weekNumber);
  return { title: week ? `${week.title} | GAP` : "Week not found | GAP" };
}

export default async function WeekScaffoldPage({ params }: WeekPageProps) {
  const { weekNumber } = await params;
  const week = findPublishedWeek(mockWeeks, weekNumber);
  if (!week) notFound();

  return (
    <main className="pb-20">
      <PageContainer className="py-10 sm:py-14 lg:py-16">
        <Link
          href="/program"
          className="inline-flex min-h-11 items-center text-sm font-bold text-action hover:text-action-hover"
        >
          <span className="mr-2" aria-hidden="true">←</span> Program
        </Link>
        <div className="mt-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-deep">
            Week {week.weekNumber.toString().padStart(2, "0")}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            {week.title}
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-soft sm:text-lg">
            {week.description}
          </p>
        </div>
        <div className="mt-12">
          <StateMessage title="Module workspace coming next">
            Workshop materials, resources, and submission controls will be added in the next build phase.
          </StateMessage>
        </div>
      </PageContainer>
    </main>
  );
}
