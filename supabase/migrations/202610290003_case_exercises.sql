begin;
alter table public.assignments drop constraint assignments_workflow_check;
alter table public.assignments add constraint assignments_workflow_check check(workflow in ('standard','guided','cases'));
alter table public.assignments add constraint cases_individual_only check(workflow<>'cases' or submission_mode='individual');

create table private.case_configs (
 assignment_id uuid primary key references public.assignments(id) on delete restrict,
 content jsonb not null,
 version bigint not null default 1
);
create table private.case_runs (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references private.case_configs(assignment_id) on delete restrict,
 enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
 version bigint not null default 0,
 completed_at timestamptz,
 unique(assignment_id,enrollment_id)
);
create table private.case_answers (
 run_id uuid not null references private.case_runs(id) on delete restrict,
 case_number int not null check(case_number between 1 and 8),
 method text not null check(method in ('mathematical','process','decision')),
 framework text not null check(length(btrim(framework)) between 1 and 10000),
 priority text not null check(length(btrim(priority)) between 1 and 10000),
 saved_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 reviewed_at timestamptz,
 primary key(run_id,case_number)
);
create table private.case_receipts (
 actor_id uuid not null references auth.users(id), request_id uuid not null,
 payload jsonb not null,result jsonb not null,primary key(actor_id,request_id)
);
alter table private.case_configs enable row level security;
alter table private.case_runs enable row level security;
alter table private.case_answers enable row level security;
alter table private.case_receipts enable row level security;
revoke all on private.case_configs,private.case_runs,private.case_answers,private.case_receipts from public,anon,authenticated,service_role;

create function private.case_enrollment(p_assignment uuid) returns uuid language plpgsql stable security definer set search_path='' as $$
declare eid uuid;
begin
 if private.is_viewer() then raise exception using errcode='42501',message='Participant access required'; end if;
 select e.id into eid from public.assignments a join public.program_weeks w on w.id=a.week_id
 join public.cohort_enrollments e on e.cohort_id=w.cohort_id
 where a.id=p_assignment and a.workflow='cases' and w.published and private.can_learn(w.cohort_id)
 and e.person_id=private.my_person_id() and e.participation_status='enrolled';
 if eid is null then raise exception using errcode='42501',message='Exercise unavailable'; end if;
 return eid;
end $$;
revoke all on function private.case_enrollment(uuid) from public,anon,authenticated,service_role;

create function public.read_case_exercise(p_assignment uuid,p_enrollment uuid default null,p_preview boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assignments; w public.program_weeks; cfg private.case_configs; r private.case_runs; eid uuid; items jsonb; admin boolean;
begin
 admin=private.is_admin();
 select * into a from public.assignments where id=p_assignment;
 select * into w from public.program_weeks where id=a.week_id;
 if a.id is null or (not admin and not(w.published and private.can_read_content(w.cohort_id))) then raise exception using errcode='42501',message='Exercise unavailable'; end if;
 if p_enrollment is not null and not admin then raise exception using errcode='42501',message='Admin required'; end if;
 select * into cfg from private.case_configs where assignment_id=a.id;
 if a.workflow='cases' and not p_preview and not private.is_viewer() then
  if p_enrollment is not null then
   if not exists(select 1 from public.cohort_enrollments where id=p_enrollment and cohort_id=w.cohort_id) then raise exception using errcode='42501',message='Enrollment unavailable'; end if;
   eid=p_enrollment;
  else eid=private.case_enrollment(a.id); end if;
  select * into r from private.case_runs where assignment_id=a.id and enrollment_id=eid;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('number',(c->>'number')::int,'title',c->>'title','scenario',c->>'scenario',
  'reference',case when admin or ans.run_id is not null then c->>'reference' end,
  'answer',case when ans.run_id is not null then jsonb_build_object('method',ans.method,'framework',ans.framework,'priority',ans.priority,'reviewedAt',ans.reviewed_at) end
 ) order by (c->>'number')::int),'[]'::jsonb) into items
 from jsonb_array_elements(coalesce(cfg.content->'cases','[]')) c
 left join private.case_answers ans on ans.run_id=r.id and ans.case_number=(c->>'number')::int;
 return jsonb_build_object('workflow',a.workflow,'configVersion',coalesce(cfg.version,0),'overview',cfg.content->>'overview',
 'closing',case when admin or r.completed_at is not null then cfg.content->>'closing' end,
 'cases',items,'run',case when r.id is not null then jsonb_build_object('version',r.version,'completedAt',r.completed_at) end);
end $$;
revoke all on function public.read_case_exercise(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.read_case_exercise(uuid,uuid,boolean) to authenticated;

create function public.mutate_case_exercise(p_action text,p_assignment uuid,p_data jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assignments; cfg private.case_configs; r private.case_runs; receipt private.case_receipts;
 eid uuid; n int; expected bigint; item jsonb; field text; payload jsonb; result jsonb;
begin
 perform private.submission_gate();
 if private.my_person_id() is null or private.is_viewer() or p_request is null or jsonb_typeof(p_data) is distinct from 'object'
 then raise exception using errcode='42501',message='Access denied'; end if;
 select * into a from public.assignments where id=p_assignment for update;
 if a.id is null then raise exception using errcode='22023',message='Save the assignment first'; end if;
 if p_action='configure' then
  if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 else eid=private.case_enrollment(a.id); end if;
 payload=jsonb_build_object('action',p_action,'assignment',a.id,'enrollment',eid,'data',p_data);
 select * into receipt from private.case_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then
  if receipt.payload<>payload then raise exception using errcode='22023',message='Retry request changed'; end if;
  return receipt.result;
 end if;
 expected=(p_data->>'version')::bigint;
 if expected is null or expected<0 then raise exception using errcode='22023',message='Version required'; end if;
 if p_action='configure' then
  if a.submission_mode<>'individual' then raise exception using errcode='22023',message='Case exercises require Individual mode'; end if;
  if exists(select 1 from public.program_weeks where id=a.week_id and published) then raise exception using errcode='22023',message='Unpublish the week before configuring the exercise'; end if;
  if a.workflow<>'cases' and (exists(select 1 from public.submissions where assignment_id=a.id) or exists(select 1 from private.upload_intents where assignment_id=a.id) or exists(select 1 from public.assignment_completions where assignment_id=a.id) or exists(select 1 from private.guided_states where assignment_id=a.id)) then raise exception using errcode='22023',message='Workflow is locked because assignment work exists'; end if;
  select * into cfg from private.case_configs where assignment_id=a.id for update;
  if expected<>coalesce(cfg.version,0) then raise exception using errcode='40001',message='Exercise changed. Copy your edits before reloading'; end if;
  if exists(select 1 from private.case_runs where assignment_id=a.id) then raise exception using errcode='22023',message='Case content is locked because a participant has started'; end if;
  if jsonb_typeof(p_data->'content') is distinct from 'object' or jsonb_typeof(p_data->'content'->'cases') is distinct from 'array' then raise exception using errcode='22023',message='Provide all eight cases'; end if;
  if jsonb_array_length(p_data->'content'->'cases')<>8 then raise exception using errcode='22023',message='Provide exactly eight cases'; end if;
  foreach field in array array['overview','closing'] loop
   if jsonb_typeof(p_data->'content'->field) is distinct from 'string' or length(btrim(p_data->'content'->>field)) not between 1 and 50000 then raise exception using errcode='22023',message='Overview and closing require 1–50,000 characters'; end if;
  end loop;
  n=0;
  for item in select value from jsonb_array_elements(p_data->'content'->'cases') loop
   n=n+1;
   if jsonb_typeof(item->'number') is distinct from 'number' or (item->>'number')::int<>n then raise exception using errcode='22023',message='Keep cases numbered 1–8 in order'; end if;
   foreach field in array array['title','scenario','reference'] loop
    if jsonb_typeof(item->field) is distinct from 'string' or length(btrim(item->>field)) not between 1 and 50000 then raise exception using errcode='22023',message='Every case needs a title, scenario and reference (up to 50,000 characters each)'; end if;
   end loop;
  end loop;
  insert into private.case_configs(assignment_id,content) values(a.id,p_data->'content') on conflict(assignment_id) do update set content=excluded.content,version=case_configs.version+1;
  update public.assignments set workflow='cases' where id=a.id;
 else
  if p_action not in ('save','next','finish') then raise exception using errcode='22023',message='Unknown exercise operation'; end if;
  if not exists(select 1 from private.case_configs where assignment_id=a.id) then raise exception using errcode='22023',message='Your exercise is being prepared'; end if;
  insert into private.case_runs(assignment_id,enrollment_id) values(a.id,eid) on conflict do nothing;
  select * into r from private.case_runs where assignment_id=a.id and enrollment_id=eid for update;
  if r.completed_at is not null then
   if p_action='finish' then return jsonb_build_object('completedAt',r.completed_at); end if;
   raise exception using errcode='22023',message='This completed exercise is read-only';
  end if;
  if expected<>r.version then raise exception using errcode='40001',message='Your answers changed in another tab. Your input is retained; copy it before reloading'; end if;
  n=(p_data->>'caseNumber')::int;
  if n is null or n not between 1 and 8 then raise exception using errcode='22023',message='Choose a case from 1–8'; end if;
  if p_action='save' then
   if n>1 and not exists(select 1 from private.case_answers where run_id=r.id and case_number=n-1 and reviewed_at is not null) then raise exception using errcode='22023',message='Save and review the preceding case first'; end if;
   if p_data->>'method' is null or p_data->>'method' not in ('mathematical','process','decision') or jsonb_typeof(p_data->'framework') is distinct from 'string' or jsonb_typeof(p_data->'priority') is distinct from 'string' then raise exception using errcode='22023',message='Choose a method and complete both responses'; end if;
   insert into private.case_answers(run_id,case_number,method,framework,priority) values(r.id,n,p_data->>'method',p_data->>'framework',p_data->>'priority')
   on conflict(run_id,case_number) do update set method=excluded.method,framework=excluded.framework,priority=excluded.priority,updated_at=clock_timestamp();
  elsif p_action='next' then
   if n=8 or not exists(select 1 from private.case_answers where run_id=r.id and case_number=n) then raise exception using errcode='22023',message='Save this case before continuing'; end if;
   update private.case_answers set reviewed_at=coalesce(reviewed_at,clock_timestamp()) where run_id=r.id and case_number=n;
  else
   if n<>8 or (select count(*) from private.case_answers where run_id=r.id)<>8 or (select count(*) from private.case_answers where run_id=r.id and case_number<8 and reviewed_at is not null)<>7 then raise exception using errcode='22023',message='Save all eight cases and review their reference approaches before finishing'; end if;
   update private.case_answers set reviewed_at=coalesce(reviewed_at,clock_timestamp()) where run_id=r.id and case_number=8;
   update private.case_runs set completed_at=clock_timestamp() where id=r.id;
  end if;
  update private.case_runs set version=version+1 where id=r.id;
 end if;
 result=jsonb_build_object('saved',true);
 insert into private.case_receipts values(auth.uid(),p_request,payload,result);
 return result;
end $$;
revoke all on function public.mutate_case_exercise(text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mutate_case_exercise(text,uuid,jsonb,uuid) to authenticated;

create function public.case_progress(p_enrollment uuid default null)
returns table(assignment_id uuid,enrollment_id uuid,answered int,completed_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() and (p_enrollment is null or private.is_viewer() or not exists(select 1 from public.cohort_enrollments e where e.id=p_enrollment and e.person_id=private.my_person_id() and e.participation_status='enrolled' and private.can_learn(e.cohort_id))) then raise exception using errcode='42501',message='Access denied'; end if;
 return query select r.assignment_id,r.enrollment_id,(select count(*)::int from private.case_answers ans where ans.run_id=r.id),r.completed_at
 from private.case_runs r join public.assignments a on a.id=r.assignment_id join public.program_weeks w on w.id=a.week_id
 where a.workflow='cases' and (p_enrollment is null or r.enrollment_id=p_enrollment) and (private.is_admin() or w.published);
end $$;
revoke all on function public.case_progress(uuid) from public,anon,authenticated;
grant execute on function public.case_progress(uuid) to authenticated;

create function private.guard_case_workflow() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if tg_table_name='assignments' then
  if new.workflow is distinct from old.workflow and exists(select 1 from private.case_runs where assignment_id=old.id) then raise exception using errcode='22023',message='Workflow is locked because case answers exist'; end if;
 else
  if exists(select 1 from public.assignments where id=new.assignment_id and workflow='cases') then raise exception using errcode='42501',message='Complete the case exercise instead of submitting a document or manual credit'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_case_workflow() from public,anon,authenticated,service_role;
create trigger case_workflow_lock before update of workflow on public.assignments for each row execute function private.guard_case_workflow();
create trigger case_submission_denied before insert on public.submissions for each row execute function private.guard_case_workflow();
create trigger case_manual_credit_denied before insert on public.assignment_completions for each row execute function private.guard_case_workflow();

alter function private.resolve_submission_target(uuid) rename to resolve_submission_target_before_cases;
create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if exists(select 1 from public.assignments where id=p_assignment and workflow='cases') then raise exception using errcode='42501',message='Complete the case exercise instead of submitting a document'; end if;
 return private.resolve_submission_target_before_cases(p_assignment);
end $$;
revoke all on function private.resolve_submission_target(uuid),private.resolve_submission_target_before_cases(uuid) from public,anon,authenticated,service_role;
commit;
