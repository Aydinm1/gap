'use client';
import { useRouter } from 'next/navigation';
import { CohortSwitcher } from '@/components/admin/cohort-switcher';
import { PageContainer } from '@/components/ui/container';
import type { ProgramCohort } from '@/lib/program/types';
export function ExploreSwitcher({ cohorts, selectedId }: { cohorts:ProgramCohort[];selectedId:string }) {
  const router=useRouter();
  return <div className="border-b border-border bg-surface-subtle"><PageContainer className="py-3"><CohortSwitcher cohorts={cohorts} selectedId={selectedId} label="Browsing cohort" onChange={id=>router.push(`/explore?cohort=${encodeURIComponent(id)}`)} /></PageContainer></div>;
}
