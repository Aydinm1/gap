begin;
create table private.account_activity (
 person_id uuid primary key references public.people(id) on delete cascade,
 last_active_at timestamptz not null
);
alter table private.account_activity enable row level security;
revoke all on private.account_activity from public,anon,authenticated,service_role;

create function public.record_activity() returns void
language plpgsql security definer set search_path='' as $$
declare person uuid := private.my_person_id(); stamp timestamptz := clock_timestamp();
begin
 if person is null then raise exception using errcode='42501',message='Approved GAP access required'; end if;
 insert into private.account_activity(person_id,last_active_at) values(person,stamp)
 on conflict(person_id) do update set last_active_at=excluded.last_active_at
 where account_activity.last_active_at <= excluded.last_active_at-interval '5 minutes';
end $$;
create function public.admin_activity() returns table(person_id uuid,last_active_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin access required'; end if;
 return query select a.person_id,a.last_active_at from private.account_activity a;
end $$;
revoke all on function public.record_activity(),public.admin_activity() from public,anon,authenticated;
grant execute on function public.record_activity(),public.admin_activity() to authenticated;
commit;
