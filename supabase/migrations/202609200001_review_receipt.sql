begin;

-- Return the version written by this transaction, not a later concurrent review.
create function public.review_submission(p_data jsonb)
returns table(id uuid, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'Admin access required';
  end if;
  target := public.admin_mutate('review', p_data);
  return query select s.id, s.updated_at from public.submissions s where s.id = target;
end $$;

revoke all on function public.review_submission(jsonb) from public, anon, authenticated;
grant execute on function public.review_submission(jsonb) to authenticated;
commit;
