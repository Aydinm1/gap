import { notFound } from 'next/navigation';
import { readExplore } from '@/lib/supabase/explore';
import { buildWeekDetail } from '@/lib/program/week-detail';
import { WeekContent } from '@/components/program/week-content';
import { ExploreSwitcher } from '@/components/program/explore-shell';
export const metadata={title:'Workshop | GAP Explore'};
export default async function ExploreWeek({params,searchParams}:{params:Promise<{weekNumber:string}>;searchParams:Promise<{cohort?:string}>}) {
  const [{weekNumber},{cohort:requested}]=await Promise.all([params,searchParams]);
  const data=await readExplore(requested);if(!data.cohort)notFound();
  const detail=buildWeekDetail({weeks:data.weeks,cohortId:data.cohort.id,enrollmentId:'viewer-preview',submissions:[],weekNumber,now:new Date()});if(!detail)notFound();
  return <><ExploreSwitcher cohorts={data.cohorts} selectedId={data.cohort.id}/><WeekContent detail={detail} browse programHref={`/explore?cohort=${data.cohort.id}`} /></>;
}
