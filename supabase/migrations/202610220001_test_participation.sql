begin;
alter table public.cohort_enrollments add column is_test boolean not null default false;
comment on column public.cohort_enrollments.is_test is 'Admin-managed test participation; excluded from official metrics, not an authorization bypass.';

create function public.set_test_participation(p_id uuid,p_is_test boolean) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin access required'; end if;
 if p_id is null or p_is_test is null then raise exception using errcode='22023',message='Enrollment and test flag are required'; end if;
 -- The existing enrollment triggers acquire the shared provisioning lock and preserve
 -- Viewer safeguards. No role, participation, outcomes or historical work is changed.
 update public.cohort_enrollments set is_test=p_is_test where id=p_id;
 if not found then raise exception using errcode='22023',message='Enrollment not found'; end if;
 return p_id;
end $$;
revoke all on function public.set_test_participation(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_test_participation(uuid,boolean) to authenticated;
commit;
