import { requireExplorer } from '@/lib/supabase/explore';
import { AppHeader } from '@/components/shell/app-header';
export default async function ExploreLayout({ children }: { children:React.ReactNode }) {
  const user=await requireExplorer();
  return <div className="min-h-screen bg-canvas text-ink"><AppHeader user={user} homeHref="/explore" navigation={[]} profileLinks={user.role==='admin'?[{label:'Admin workspace',href:'/admin'}]:[]} />{children}</div>;
}
