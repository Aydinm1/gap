'use client';
import { Button } from '@/components/ui/button';
export default function AttendanceError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-lg px-4 py-12"><h1 className="text-2xl font-bold">Check-in could not load</h1><p role="alert" className="my-5">Check your connection and try again.</p><Button onClick={reset}>Try again</Button></main>;
}
