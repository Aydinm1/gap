'use client';
import { Button } from '@/components/ui/button';
export default function ExploreError({reset}:{reset:()=>void}) {return <main className="mx-auto max-w-2xl px-5 py-12"><h1 className="text-2xl font-bold">Program content could not load</h1><p role="alert" className="my-5">Check your connection and try again. No practice work has been saved.</p><Button onClick={reset}>Try again</Button></main>;}
