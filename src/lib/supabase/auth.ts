import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import type { ProgramUser } from '@/lib/program/types';

export const requireUser = cache(async (admin = false): Promise<ProgramUser> => {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) redirect('/login');
  if (!user.email_confirmed_at || !user.email?.toLowerCase().endsWith('@ucdavis.edu') || !user.identities?.some(identity => identity.provider === 'google')) redirect('/access-denied');
  const { data, error: profileError } = await db.rpc('sync_profile');
  if (profileError?.code === '42501') redirect('/access-denied');
  if (profileError || !data?.[0]) throw new Error('Could not verify GAP access. Please try again.');
  const profile = data[0];
  if (admin && profile.role !== 'admin') redirect('/access-denied');
  return { id: user.id, personId: profile.person_id, email: profile.email, fullName: profile.full_name,
    role: profile.role, initials: profile.full_name.split(/\s+/).map((part: string) => part[0]).slice(0,2).join('') };
});

export const requireParticipant = cache(async () => {
  const user = await requireUser();
  if (user.role === 'viewer') redirect('/access-denied');
  return user;
});
