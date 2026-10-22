import { notFound } from 'next/navigation';
import { readExplore } from '@/lib/supabase/explore';
import { buildWeekDetail } from '@/lib/program/week-detail';
import { AssignmentContent } from '@/components/program/assignment-content';
import { ExploreSwitcher } from '@/components/program/explore-shell';
export const metadata={title:'Assignment | GAP Explore'};
export default async function ExploreAssignment({params,searchParams}:{params:Promise<{weekNumber:string;assignmentId:string}>;searchParams:Promise<{cohort?:string}>}) {
  const [{weekNumber,assignmentId},{cohort:requested}]=await Promise.all([params,searchParams]);
  const data=await readExplore(requested);if(!data.cohort)notFound();
  const detail=buildWeekDetail({weeks:data.weeks,cohortId:data.cohort.id,enrollmentId:'viewer-preview',submissions:[],weekNumber,now:new Date()});
  const assignment=detail?.assignments.find(a=>a.id===assignmentId);if(!detail||!assignment)notFound();
  return <><ExploreSwitcher cohorts={data.cohorts} selectedId={data.cohort.id}/><AssignmentContent key={`${data.cohort.id}:${assignment.id}`} browse assignment={assignment} weekNumber={detail.week.weekNumber} enrollmentId="viewer-preview" weekHref={`/explore/week/${detail.week.weekNumber}?cohort=${data.cohort.id}`} /></>;
}
