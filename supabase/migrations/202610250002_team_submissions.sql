begin;
alter table public.assignments add column submission_mode text not null default 'individual' check(submission_mode in ('individual','team'));
create table public.cohort_teams (
 id uuid primary key default gen_random_uuid(), cohort_id uuid not null references public.program_cohorts(id) on delete restrict,
 name text not null check(length(btrim(name)) between 1 and 100), is_test boolean not null default false,
 version bigint not null default 0, locked boolean not null default false,
 unique(cohort_id,name)
);
create table public.team_memberships (
 enrollment_id uuid primary key references public.cohort_enrollments(id) on delete cascade,
 team_id uuid not null references public.cohort_teams(id) on delete restrict
);
create index team_memberships_team on public.team_memberships(team_id);
create table public.submission_targets (
 id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.assignments(id) on delete cascade,
 enrollment_id uuid references public.cohort_enrollments(id) on delete cascade,
 team_id uuid references public.cohort_teams(id) on delete restrict,
 check(num_nonnulls(enrollment_id,team_id)=1), unique(assignment_id,enrollment_id),unique(assignment_id,team_id)
);
insert into public.submission_targets(assignment_id,enrollment_id) select distinct assignment_id,enrollment_id from public.submissions;
alter table public.submissions alter column enrollment_id drop not null,
 add column target_id uuid references public.submission_targets(id) on delete restrict,
 add column team_id uuid references public.cohort_teams(id) on delete restrict,
 add column submitted_by uuid references public.people(id) on delete restrict;
-- Ownership backfill is not a member save or review. Preserve every existing
-- timestamp/version; the table lock and transaction restore the trigger atomically.
alter table public.submissions disable trigger submissions_updated;
update public.submissions s set target_id=t.id from public.submission_targets t where t.assignment_id=s.assignment_id and t.enrollment_id=s.enrollment_id;
alter table public.submissions enable trigger submissions_updated;
alter table public.submissions alter column target_id set not null;
create unique index submissions_target_current on public.submissions(target_id) where is_current;
alter table private.upload_intents add column target_id uuid references public.submission_targets(id) on delete restrict,
 add column team_version bigint;
insert into public.submission_targets(assignment_id,enrollment_id) select distinct assignment_id,enrollment_id from private.upload_intents on conflict do nothing;
update private.upload_intents i set target_id=t.id from public.submission_targets t where t.assignment_id=i.assignment_id and t.enrollment_id=i.enrollment_id;
create table private.submission_requests (
 actor_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 target_id uuid not null references public.submission_targets(id) on delete cascade,
 payload jsonb not null, submission_id uuid not null references public.submissions(id) on delete cascade,
 primary key(actor_id,request_id)
);
revoke all on private.submission_requests from public,anon,authenticated,service_role;

-- One transaction-level gate gives team edits, first submissions, replacements,
-- reviews and assignment-mode changes a consistent lock order. No client leases.
create function private.submission_gate() returns void language sql volatile set search_path='' as $$
 select pg_advisory_xact_lock(hashtextextended('gap-shared-submission-v1',0))
$$;
create function private.can_read_team(p_team uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from public.team_memberships m
 join public.cohort_enrollments e on e.id=m.enrollment_id join public.cohort_teams t on t.id=m.team_id
 where t.id=p_team and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(t.cohort_id))
$$;
create function private.can_read_target(p_target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or exists(select 1 from public.submission_targets t where t.id=p_target and
 (t.team_id is not null and private.can_read_team(t.team_id) or t.enrollment_id is not null and not private.is_viewer()
 and exists(select 1 from public.cohort_enrollments e where e.id=t.enrollment_id and e.person_id=private.my_person_id())))
$$;
revoke all on function private.submission_gate(),private.can_read_team(uuid),private.can_read_target(uuid) from public,anon,authenticated;
grant execute on function private.can_read_team(uuid),private.can_read_target(uuid) to authenticated;
alter table public.cohort_teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.submission_targets enable row level security;
revoke all on public.cohort_teams,public.team_memberships,public.submission_targets from public,anon,authenticated;
grant select on public.cohort_teams,public.team_memberships,public.submission_targets to authenticated;
grant all on public.cohort_teams,public.team_memberships,public.submission_targets to service_role;
create policy teams_read on public.cohort_teams for select to authenticated using(private.is_admin() or private.can_read_team(id));
create policy memberships_read on public.team_memberships for select to authenticated using(private.is_admin() or private.can_read_team(team_id));
create policy targets_read on public.submission_targets for select to authenticated using(private.can_read_target(id));
alter policy submissions_read on public.submissions using(private.can_read_target(target_id));

create function public.manage_team(p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.cohort_teams; eid uuid; ids uuid[]; result uuid;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 perform private.submission_gate();
 if p_action='create' then
  if jsonb_typeof(p_data->'isTest') is distinct from 'boolean' then raise exception 'Choose official or test'; end if;
  insert into public.cohort_teams(cohort_id,name,is_test) values((p_data->>'cohortId')::uuid,btrim(p_data->>'name'),(p_data->>'isTest')::boolean) returning id into result;
  return result;
 end if;
 select * into t from public.cohort_teams where id=(p_data->>'id')::uuid for update;
 if t.id is null then raise exception 'Team not found'; end if;
 if t.version is distinct from (p_data->>'version')::bigint then raise exception using errcode='40001',message='Team changed. Reload before saving.'; end if;
 if p_action='rename' then update public.cohort_teams set name=btrim(p_data->>'name'),version=version+1 where id=t.id;
 elsif p_action in ('members','delete') then
  if t.locked then raise exception using errcode='22023',message='Team membership is locked because submitted work exists.'; end if;
  if p_action='delete' then
   if exists(select 1 from public.submission_targets where team_id=t.id) then raise exception using errcode='22023',message='This team has submission or upload history and cannot be deleted.'; end if;
   delete from public.team_memberships where team_id=t.id; delete from public.cohort_teams where id=t.id; return t.id;
  end if;
  if jsonb_typeof(p_data->'enrollmentIds') is distinct from 'array' then raise exception 'Invalid team members'; end if;
  ids=array(select value::uuid from jsonb_array_elements_text(p_data->'enrollmentIds'));
  foreach eid in array ids loop
   if not exists(select 1 from public.cohort_enrollments where id=eid and cohort_id=t.cohort_id and participation_status='enrolled' and is_test=t.is_test) then raise exception using errcode='22023',message='Choose enrolled participants from the same cohort and official/test scope.'; end if;
   if exists(select 1 from public.team_memberships where enrollment_id=eid and team_id<>t.id) then raise exception using errcode='22023',message='Remove the participant from their current unlocked team first.'; end if;
  end loop;
  delete from public.team_memberships where team_id=t.id;
  insert into public.team_memberships(enrollment_id,team_id) select distinct unnest(ids),t.id;
  update public.cohort_teams set version=version+1 where id=t.id;
 else raise exception 'Unknown operation'; end if;
 return t.id;
end $$;
revoke all on function public.manage_team(text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_team(text,jsonb) to authenticated;

create function public.my_team(p_enrollment uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tid uuid;
begin
 if not exists(select 1 from public.cohort_enrollments e where e.id=p_enrollment and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(e.cohort_id)) then raise exception using errcode='42501',message='Access denied'; end if;
 select team_id into tid from public.team_memberships where enrollment_id=p_enrollment;
 if tid is null then return null; end if;
 return (select jsonb_build_object('id',t.id,'name',t.name,'members',
  (select jsonb_agg(jsonb_build_object('enrollmentId',e.id,'personId',p.id,'name',p.full_name) order by p.full_name,e.id)
   from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id join public.people p on p.id=e.person_id where m.team_id=t.id))
 from public.cohort_teams t where t.id=tid);
end $$;
revoke all on function public.my_team(uuid) from public,anon,authenticated;
grant execute on function public.my_team(uuid) to authenticated;

create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets language plpgsql security definer set search_path='' as $$
declare a public.assignments; e public.cohort_enrollments; tid uuid; t public.submission_targets;
begin
 perform private.submission_gate();
 select a1.* into a from public.assignments a1 join public.program_weeks w on w.id=a1.week_id where a1.id=p_assignment and w.published and private.can_learn(w.cohort_id);
 select en.* into e from public.cohort_enrollments en join public.program_weeks w on w.cohort_id=en.cohort_id where w.id=a.week_id and en.person_id=private.my_person_id() and en.participation_status='enrolled';
 if e.id is null or private.is_viewer() then raise exception using errcode='42501',message='Assignment unavailable'; end if;
 if a.submission_mode='team' then
  select team_id into tid from public.team_memberships where enrollment_id=e.id;
  if tid is null then raise exception using errcode='22023',message='Ask your GAP lead to assign your team before submitting.'; end if;
  insert into public.submission_targets(assignment_id,team_id) values(a.id,tid) on conflict do nothing;
  select * into t from public.submission_targets where assignment_id=a.id and team_id=tid for update;
 else
  insert into public.submission_targets(assignment_id,enrollment_id) values(a.id,e.id) on conflict do nothing;
  select * into t from public.submission_targets where assignment_id=a.id and enrollment_id=e.id for update;
 end if;
 return t;
end $$;
revoke all on function private.resolve_submission_target(uuid) from public,anon,authenticated,service_role;

create or replace function private.validate_submission_scope() returns trigger language plpgsql security definer set search_path='' as $$
declare t public.submission_targets;
begin
 if new.target_id is null then
  insert into public.submission_targets(assignment_id,enrollment_id,team_id) values(new.assignment_id,new.enrollment_id,new.team_id) on conflict do nothing;
  select * into t from public.submission_targets where assignment_id=new.assignment_id and enrollment_id is not distinct from new.enrollment_id and team_id is not distinct from new.team_id;
  new.target_id=t.id;
 end if;
 select * into t from public.submission_targets where id=new.target_id;
 if t.assignment_id is distinct from new.assignment_id or t.enrollment_id is distinct from new.enrollment_id or t.team_id is distinct from new.team_id
 or not exists(select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id where a.id=new.assignment_id and
 (t.enrollment_id is not null and a.submission_mode='individual' and exists(select 1 from public.cohort_enrollments e where e.id=t.enrollment_id and e.cohort_id=w.cohort_id)
 or t.team_id is not null and a.submission_mode='team' and exists(select 1 from public.cohort_teams g where g.id=t.team_id and g.cohort_id=w.cohort_id))) then raise exception 'Invalid submission owner'; end if;
 if new.supersedes_submission_id is not null and not exists(select 1 from public.submissions s where s.id=new.supersedes_submission_id and s.target_id=new.target_id and not s.is_current) then raise exception 'Invalid submission history'; end if;
 if new.team_id is not null then update public.cohort_teams set locked=true where id=new.team_id; end if;
 return new;
end $$;

create function public.submit_response(p_assignment uuid,p_type text,p_value text,p_request uuid,p_expected uuid default null,p_version timestamptz default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.submission_targets; s public.submissions; receipt private.submission_requests; result uuid; payload jsonb;
begin
 t=private.resolve_submission_target(p_assignment);
 if p_type not in ('text','link') or p_request is null then raise exception 'Invalid submission'; end if;
 payload=jsonb_build_object('type',p_type,'value',p_value,'expected',p_expected,'version',p_version);
 select * into receipt from private.submission_requests where actor_id=auth.uid() and request_id=p_request;
 if found then
  if receipt.target_id<>t.id or receipt.payload<>payload then raise exception 'Request ID reused with different content'; end if;
  return receipt.submission_id;
 end if;
 select * into s from public.submissions where target_id=t.id and is_current for update;
 if s.id is distinct from p_expected or s.updated_at is distinct from p_version then raise exception using errcode='40001',message='Your submission changed. A teammate may have submitted. Refresh before saving again.'; end if;
 if s.status='completed' then raise exception 'Completed submissions cannot be replaced'; end if;
 update public.submissions set is_current=false where id=s.id;
 insert into public.submissions(assignment_id,target_id,enrollment_id,team_id,submitted_by,submission_type,submitted_text,submitted_url,supersedes_submission_id)
 values(p_assignment,t.id,t.enrollment_id,t.team_id,private.my_person_id(),p_type::public.submission_type,case when p_type='text' then p_value end,case when p_type='link' then p_value end,s.id) returning id into result;
 insert into private.submission_requests values(auth.uid(),p_request,t.id,payload,result);
 return result;
end $$;
revoke all on function public.submit_response(uuid,text,text,uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.submit_response(uuid,text,text,uuid,uuid,timestamptz) to authenticated;
create or replace function public.submit_text(p_assignment_id uuid,p_text text,p_expected_id uuid default null,p_expected_updated_at timestamptz default null) returns uuid language sql security definer set search_path='' as $$
 select public.submit_response(p_assignment_id,'text',p_text,gen_random_uuid(),p_expected_id,p_expected_updated_at)
$$;
create or replace function public.submit_link(p_assignment_id uuid,p_url text,p_expected_id uuid default null,p_expected_updated_at timestamptz default null) returns uuid language sql security definer set search_path='' as $$
 select public.submit_response(p_assignment_id,'link',p_url,gen_random_uuid(),p_expected_id,p_expected_updated_at)
$$;

-- Preserve existing mutation entrypoints while serializing reviews and mode changes.
alter function public.admin_mutate(text,jsonb) set schema private;
alter function private.admin_mutate(text,jsonb) rename to admin_mutate_before_teams;
revoke all on function private.admin_mutate_before_teams(text,jsonb) from public,anon,authenticated,service_role;
create function public.admin_mutate(p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 perform private.submission_gate();
 return private.admin_mutate_before_teams(p_action,p_data);
end $$;
revoke all on function public.admin_mutate(text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_mutate(text,jsonb) to authenticated;
alter function public.save_program_week(jsonb) set schema private;
alter function private.save_program_week(jsonb) rename to save_week_before_teams;
revoke all on function private.save_week_before_teams(jsonb) from public,anon,authenticated,service_role;
create function public.save_program_week(p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; r jsonb; mode text;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 perform private.submission_gate();
 result=private.save_week_before_teams(p_data);
 for r in select value from jsonb_array_elements(coalesce(p_data->'assignments','[]')) loop
  if not(r ? 'submissionMode') then continue; end if;
  mode=r->>'submissionMode';
  if mode is null or mode not in ('individual','team') then raise exception 'Invalid submission mode'; end if;
  if exists(select 1 from public.assignments a where a.id=(r->>'id')::uuid and a.submission_mode<>mode) and
   (exists(select 1 from public.submissions where assignment_id=(r->>'id')::uuid) or exists(select 1 from private.upload_intents where assignment_id=(r->>'id')::uuid)) then
   raise exception using errcode='22023',message='Submission mode is locked because submission or upload history exists.';
  end if;
  update public.assignments set submission_mode=mode where id=(r->>'id')::uuid and week_id=result;
 end loop;
 return result;
end $$;
revoke all on function public.save_program_week(jsonb) from public,anon,authenticated;
grant execute on function public.save_program_week(jsonb) to authenticated;
create function private.guard_team_test() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if old.is_test<>new.is_test and exists(select 1 from public.team_memberships where enrollment_id=new.id) then raise exception using errcode='22023',message='Remove this participant from their unlocked team before changing test scope.'; end if;
 return new;
end $$;
create trigger team_test_scope before update of is_test on public.cohort_enrollments for each row execute function private.guard_team_test();
revoke all on function private.guard_team_test() from public,anon,authenticated,service_role;
commit;
