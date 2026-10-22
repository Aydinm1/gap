begin;
alter table public.resources drop constraint resources_resource_type_check;
alter table public.resources add constraint resources_resource_type_check check(resource_type in ('guide','template','reading','video','workshop'));

create table public.attendance_sessions (
 id uuid primary key default gen_random_uuid(), week_id uuid unique not null references public.program_weeks(id) on delete restrict,
 workshop_date date not null, opened_at timestamptz not null, closes_at timestamptz not null,
 closed_at timestamptz, updated_at timestamptz not null default clock_timestamp(),
 check(closes_at=opened_at+interval '2 hours'), check(closed_at is null or closed_at>=opened_at)
);
create table public.attendance_records (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.attendance_sessions(id) on delete restrict,
 enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
 present boolean not null, recorded_at timestamptz, updated_at timestamptz not null default clock_timestamp(),
 unique(session_id,enrollment_id), check(present=(recorded_at is not null))
);
create index attendance_enrollment_idx on public.attendance_records(enrollment_id);
create table private.attendance_codes (
 session_id uuid primary key references public.attendance_sessions(id) on delete cascade, code text not null check(code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$')
);
create table private.attendance_attempts (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.attendance_sessions(id) on delete cascade,
 person_id uuid not null references public.people(id) on delete restrict, failed_at timestamptz not null default clock_timestamp()
);
create index attendance_attempts_window_idx on private.attendance_attempts(session_id,person_id,failed_at);
create index attendance_attempts_person_idx on private.attendance_attempts(person_id);
create table private.attendance_history (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.attendance_sessions(id) on delete restrict,
 enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict, present boolean not null,
 source text not null check(source in ('member','admin')), changed_at timestamptz not null default clock_timestamp()
);
create index attendance_history_session_idx on private.attendance_history(session_id,changed_at);
create index attendance_history_enrollment_idx on private.attendance_history(enrollment_id);
create index attendance_history_actor_idx on private.attendance_history(actor_id);
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table private.attendance_codes enable row level security;
alter table private.attendance_attempts enable row level security;
alter table private.attendance_history enable row level security;
revoke all on public.attendance_sessions,public.attendance_records,private.attendance_codes,private.attendance_attempts,private.attendance_history from public,anon,authenticated;
grant select on public.attendance_sessions,public.attendance_records to authenticated;
create policy attendance_sessions_read on public.attendance_sessions for select to authenticated using(private.is_admin() or exists(
 select 1 from public.program_weeks w where w.id=week_id and w.published and private.can_learn(w.cohort_id)));
create policy attendance_records_read on public.attendance_records for select to authenticated using(private.is_admin() or exists(
 select 1 from public.cohort_enrollments e join public.attendance_sessions s on s.id=session_id join public.program_weeks w on w.id=s.week_id
 where e.id=enrollment_id and e.cohort_id=w.cohort_id and e.person_id=private.my_person_id() and w.published and private.can_learn(e.cohort_id)));

-- A single user-scoped RPC surface. Every branch rechecks live database authority.
create function public.attendance(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 s public.attendance_sessions%rowtype; w public.program_weeks%rowtype; e public.cohort_enrollments%rowtype;
 r public.attendance_records%rowtype; v_now timestamptz; v_code text; v_alphabet constant text:='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
 v_person uuid; v_present boolean; v_date date; v_previous_code text;
begin
 if p_action is null or p_action not in ('open','close','check_in','correct','admin_read') or jsonb_typeof(p_data) is distinct from 'object' then
  raise exception using errcode='22023',message='Invalid attendance request'; end if;
 if p_action<>'check_in' and not private.is_admin() then raise exception using errcode='42501',message='Admin access required'; end if;
 if p_action='admin_read' then
  return jsonb_build_object('sessions',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('code',c.code) order by aw.week_number)
   from public.attendance_sessions a join public.program_weeks aw on aw.id=a.week_id join private.attendance_codes c on c.session_id=a.id where aw.cohort_id=(p_data->>'cohortId')::uuid),'[]'::jsonb),
   'records',coalesce((select jsonb_agg(to_jsonb(a)) from public.attendance_records a join public.attendance_sessions ats on ats.id=a.session_id join public.program_weeks aw on aw.id=ats.week_id where aw.cohort_id=(p_data->>'cohortId')::uuid),'[]'::jsonb),
   'history',coalesce((select jsonb_agg(to_jsonb(h)||jsonb_build_object('actor_name',coalesce(ap.full_name,'Former GAP member')) order by h.changed_at desc) from private.attendance_history h left join public.profiles ap on ap.id=h.actor_id join public.attendance_sessions ats on ats.id=h.session_id join public.program_weeks aw on aw.id=ats.week_id where aw.cohort_id=(p_data->>'cohortId')::uuid),'[]'::jsonb), 'now',clock_timestamp());
 end if;
 if p_action='open' then
  select * into w from public.program_weeks where id=(p_data->>'weekId')::uuid for update;
  if w.id is null or not w.published or not exists(select 1 from public.program_cohorts where id=w.cohort_id and state='active') then
   raise exception using errcode='22023',message='Check-in requires an active cohort and published week'; end if;
  select * into s from public.attendance_sessions where week_id=w.id for update;
  v_now:=clock_timestamp();
  if s.id is not null and s.closed_at is null and s.closes_at>v_now then
   return jsonb_build_object('sessionId',s.id); end if;
  v_date:=(p_data->>'workshopDate')::date;
  if v_date is null then raise exception using errcode='22023',message='Workshop date required'; end if;
  if s.id is null then
   insert into public.attendance_sessions(week_id,workshop_date,opened_at,closes_at) values(w.id,v_date,v_now,v_now+interval '2 hours') returning * into s;
  else
   update public.attendance_sessions set workshop_date=v_date,opened_at=v_now,closes_at=v_now+interval '2 hours',closed_at=null,updated_at=v_now where id=s.id returning * into s;
  end if;
  select code into v_previous_code from private.attendance_codes where session_id=s.id;
  loop
   select string_agg(substr(v_alphabet,1+(get_byte(extensions.gen_random_bytes(1),0)%length(v_alphabet)),1),'') into v_code from generate_series(1,6);
   exit when v_code is distinct from v_previous_code;
  end loop;
  insert into private.attendance_codes(session_id,code) values(s.id,v_code) on conflict(session_id) do update set code=excluded.code;
  return jsonb_build_object('sessionId',s.id);
 end if;
 select * into s from public.attendance_sessions where id=(p_data->>'sessionId')::uuid for update;
 if s.id is null then raise exception using errcode='42501',message='Workshop check-in unavailable'; end if;
 select * into w from public.program_weeks where id=s.week_id;
 v_now:=clock_timestamp();
 if p_action='close' then
  update public.attendance_sessions set closed_at=coalesce(closed_at,v_now),updated_at=v_now where id=s.id;
  return jsonb_build_object('sessionId',s.id);
 end if;
 if p_action='correct' then
  select * into e from public.cohort_enrollments where id=(p_data->>'enrollmentId')::uuid and cohort_id=w.cohort_id;
  if e.id is null or jsonb_typeof(p_data->'present') is distinct from 'boolean' then raise exception using errcode='22023',message='Invalid attendance correction'; end if;
  v_present:=(p_data->>'present')::boolean;
 else
  v_person:=private.my_person_id();
  select * into e from public.cohort_enrollments where person_id=v_person and cohort_id=w.cohort_id and participation_status='enrolled';
  if e.id is null or not w.published or not private.can_learn(w.cohort_id) then raise exception using errcode='42501',message='Workshop check-in unavailable for your enrollment'; end if;
  v_present:=true;
 end if;
 select * into r from public.attendance_records where session_id=s.id and enrollment_id=e.id;
 -- Receipts survive a closed window and lost responses, but never bypass current authorization.
 if p_action='check_in' and r.present then return to_jsonb(r); end if;
 if p_action='check_in' then
  if s.closed_at is not null or s.closes_at<=v_now then return jsonb_build_object('error','Check-in is closed. Ask your GAP lead to record attendance.'); end if;
  if (select count(*) from private.attendance_attempts where session_id=s.id and person_id=v_person and failed_at>v_now-interval '5 minutes')>=10 then
   return jsonb_build_object('error','Too many attempts. Wait five minutes and try again.'); end if;
  select code into v_code from private.attendance_codes where session_id=s.id;
  if upper(regexp_replace(coalesce(p_data->>'code',''),'[[:space:]-]','','g'))<>v_code then
   insert into private.attendance_attempts(session_id,person_id,failed_at) values(s.id,v_person,v_now);
   return jsonb_build_object('error','That code is not valid. Check the six-character workshop code and retry.'); end if;
 else
  if r.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz then raise exception using errcode='40001',message='Attendance changed. Refresh and try again'; end if;
  if r.id is not null and r.present=v_present then return to_jsonb(r); end if;
 end if;
 insert into public.attendance_records(session_id,enrollment_id,present,recorded_at,updated_at) values(s.id,e.id,v_present,case when v_present then v_now end,v_now)
 on conflict(session_id,enrollment_id) do update set present=excluded.present,recorded_at=excluded.recorded_at,updated_at=excluded.updated_at returning * into r;
 insert into private.attendance_history(session_id,enrollment_id,actor_id,present,source,changed_at) values(s.id,e.id,auth.uid(),v_present,case when p_action='correct' then 'admin' else 'member' end,v_now);
 return to_jsonb(r);
end $$;
revoke all on function public.attendance(text,jsonb) from public,anon,authenticated;
grant execute on function public.attendance(text,jsonb) to authenticated;
commit;
