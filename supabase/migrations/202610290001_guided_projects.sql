begin;

alter table public.assignments add column workflow text not null default 'standard'
 check(workflow in ('standard','guided'));
alter table public.assignments add constraint guided_team_only check(workflow<>'guided' or submission_mode='team');

create table private.guided_configs (
 assignment_id uuid primary key references public.assignments(id) on delete restrict,
 overview text not null check(length(overview) between 1 and 50000),
 direction_intro text not null check(length(direction_intro) between 1 and 50000),
 final_brief text not null check(length(final_brief) between 1 and 50000),
 version bigint not null default 1
);
create table private.guided_recommendations (
 assignment_id uuid not null references private.guided_configs(assignment_id) on delete restrict,
 team_id uuid not null references public.cohort_teams(id) on delete restrict,
 company text not null check(length(btrim(company)) between 1 and 300),
 title text not null check(length(btrim(title)) between 1 and 300),
 guidance text not null check(length(btrim(guidance)) between 1 and 50000),
 version bigint not null default 1,
 primary key(assignment_id,team_id)
);
create table private.guided_states (
 assignment_id uuid not null references private.guided_configs(assignment_id) on delete restrict,
 team_id uuid not null references public.cohort_teams(id) on delete restrict,
 original_research jsonb not null,
 research jsonb not null,
 researched_by uuid not null references public.people(id),
 researched_at timestamptz not null default clock_timestamp(),
 updated_by uuid not null references public.people(id),
 updated_at timestamptz not null default clock_timestamp(),
 version bigint not null default 1,
 direction text check(direction in ('recommended','alternative')),
 frozen boolean not null default false,
 primary key(assignment_id,team_id)
);
create table private.guided_requests (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null,
 team_id uuid not null,
 proposal jsonb not null,
 requested_by uuid not null references public.people(id),
 requested_at timestamptz not null default clock_timestamp(),
 status text not null default 'pending' check(status in ('pending','approved','changes_requested','superseded')),
 decision_note text not null default '' check(length(decision_note)<=50000),
 decision text check(decision in ('approved','changes_requested')),
 decided_by uuid references public.people(id),
 decided_at timestamptz,
 foreign key(assignment_id,team_id) references private.guided_states(assignment_id,team_id) on delete restrict
);
create table private.guided_receipts (
 actor_id uuid not null references auth.users(id),request_id uuid not null,payload jsonb not null,
 result jsonb not null,primary key(actor_id,request_id)
);
alter table private.guided_configs enable row level security;
alter table private.guided_recommendations enable row level security;
alter table private.guided_states enable row level security;
alter table private.guided_requests enable row level security;
alter table private.guided_receipts enable row level security;
revoke all on private.guided_configs,private.guided_recommendations,private.guided_states,private.guided_requests,private.guided_receipts from public,anon,authenticated,service_role;

-- All protected team data is projected here, never through shared content loaders.
create function public.read_guided_project(p_assignment uuid,p_team uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.assignments; w public.program_weeks; tid uuid; s private.guided_states; result jsonb;
begin
 select * into a from public.assignments where id=p_assignment;
 select * into w from public.program_weeks where id=a.week_id;
 if not private.is_admin() and not(w.published and private.can_read_content(w.cohort_id)) or a.id is null
 then raise exception using errcode='42501',message='Assignment unavailable'; end if;
 select jsonb_build_object('workflow',a.workflow,'config',to_jsonb(c)) into result from (select 1) x left join private.guided_configs c on c.assignment_id=a.id;
 if private.is_admin() then
  result=result||jsonb_build_object('teams',coalesce((select jsonb_agg(jsonb_build_object(
   'id',t.id,'name',t.name,'isTest',t.is_test,'members',(select count(*) from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id where m.team_id=t.id and e.participation_status='enrolled'),
   'recommendation',(select to_jsonb(r) from private.guided_recommendations r where r.assignment_id=a.id and r.team_id=t.id),
   'state',(select to_jsonb(g) from private.guided_states g where g.assignment_id=a.id and g.team_id=t.id),
   'requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.requested_at desc,q.id) from private.guided_requests q where q.assignment_id=a.id and q.team_id=t.id),'[]'::jsonb)
  ) order by t.is_test,t.name,t.id) from public.cohort_teams t where t.cohort_id=w.cohort_id),'[]'::jsonb));
  tid=p_team;
  if tid is null then
   select m.team_id into tid from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id
   where e.person_id=private.my_person_id() and e.cohort_id=w.cohort_id and e.participation_status='enrolled' and private.can_learn(e.cohort_id);
  end if;
 else
  if p_team is not null then raise exception using errcode='42501',message='Team selection is admin only'; end if;
  if not private.is_viewer() then
   select m.team_id into tid from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id
    where e.person_id=private.my_person_id() and e.cohort_id=w.cohort_id and e.participation_status='enrolled' and private.can_learn(e.cohort_id);
  end if;
 end if;
 if tid is not null then
  if not exists(select 1 from public.cohort_teams where id=tid and cohort_id=w.cohort_id) then raise exception using errcode='42501',message='Team unavailable'; end if;
  select * into s from private.guided_states where assignment_id=a.id and team_id=tid;
  result=result||jsonb_build_object('teamId',tid,'state',case when s.team_id is null then null else jsonb_build_object('research',s.research,'version',s.version,'direction',s.direction,'frozen',s.frozen,'researched_at',s.researched_at) end,
   'recommendation',case when s.team_id is not null or private.is_admin() then (select to_jsonb(r) from private.guided_recommendations r where r.assignment_id=a.id and r.team_id=tid) end,
   'requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.requested_at desc,q.id) from private.guided_requests q where q.assignment_id=a.id and q.team_id=tid),'[]'::jsonb));
 end if;
 return result;
end $$;
revoke all on function public.read_guided_project(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_guided_project(uuid,uuid) to authenticated;

create function private.guided_fields_valid(p_value jsonb,p_fields text[],p_limit int) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(p_value)='object' and not exists(select 1 from unnest(p_fields) f where
 jsonb_typeof(p_value->f) is distinct from 'string' or length(btrim(p_value->>f)) not between 1 and p_limit)
$$;
revoke all on function private.guided_fields_valid(jsonb,text[],int) from public,anon,authenticated,service_role;

create function public.mutate_guided_project(p_action text,p_assignment uuid,p_data jsonb,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.assignments; w public.program_weeks; tid uuid; s private.guided_states;
 cfg private.guided_configs; rec private.guided_recommendations; q private.guided_requests;
 receipt private.guided_receipts; payload jsonb; result jsonb; expected bigint; mode text;
begin
 perform private.submission_gate();
 if private.my_person_id() is null or private.is_viewer() or p_request is null or jsonb_typeof(p_data) is distinct from 'object'
 then raise exception using errcode='42501',message='Access denied'; end if;
 select * into a from public.assignments where id=p_assignment for update;
 select * into w from public.program_weeks where id=a.week_id;
 if a.id is null then raise exception using errcode='22023',message='Save the assignment first'; end if;
 if p_action in ('config','recommendation','decide') then
  if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 else
  if not w.published or not private.can_learn(w.cohort_id) or a.workflow<>'guided'
  then raise exception using errcode='42501',message='Assignment unavailable'; end if;
  select m.team_id into tid from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id
   where e.person_id=private.my_person_id() and e.cohort_id=w.cohort_id and e.participation_status='enrolled';
  if tid is null then raise exception using errcode='42501',message='Ask your GAP lead to assign your team'; end if;
 end if;
 payload=jsonb_build_object('action',p_action,'assignment',p_assignment,'data',p_data,'team',tid);
 select * into receipt from private.guided_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then
  if receipt.payload<>payload then raise exception using errcode='22023',message='Retry request changed'; end if;
  return receipt.result;
 end if;
 expected=(p_data->>'version')::bigint;
 if expected is null or expected<0 then raise exception using errcode='22023',message='Version required'; end if;
 if p_action='config' then
  mode=p_data->>'workflow';
  if mode is null or mode not in ('standard','guided') or (mode='guided' and a.submission_mode<>'team') then raise exception using errcode='22023',message='Guided projects require Team mode'; end if;
  select * into cfg from private.guided_configs where assignment_id=a.id for update;
  if expected<>coalesce(cfg.version,0) then raise exception using errcode='40001',message='Configuration changed. Copy your edits before reloading'; end if;
  if mode<>a.workflow and (exists(select 1 from private.guided_states where assignment_id=a.id) or exists(select 1 from public.submissions where assignment_id=a.id) or exists(select 1 from private.upload_intents where assignment_id=a.id))
  then raise exception using errcode='22023',message='Workflow is locked because work or upload history exists'; end if;
  if not private.guided_fields_valid(p_data,array['overview','directionIntro','finalBrief'],50000) then raise exception using errcode='22023',message='Each instruction section needs 1–50,000 characters'; end if;
  insert into private.guided_configs(assignment_id,overview,direction_intro,final_brief) values(a.id,p_data->>'overview',p_data->>'directionIntro',p_data->>'finalBrief')
   on conflict(assignment_id) do update set overview=excluded.overview,direction_intro=excluded.direction_intro,final_brief=excluded.final_brief,version=guided_configs.version+1;
  update public.assignments set workflow=mode where id=a.id;
 elsif p_action='recommendation' then
  tid=(p_data->>'teamId')::uuid;
  if not exists(select 1 from public.cohort_teams where id=tid and cohort_id=w.cohort_id) or not exists(select 1 from private.guided_configs where assignment_id=a.id)
  then raise exception using errcode='22023',message='Save guided configuration and choose a team from this cohort'; end if;
  select * into rec from private.guided_recommendations where assignment_id=a.id and team_id=tid for update;
  if expected<>coalesce(rec.version,0) then raise exception using errcode='40001',message='Recommendation changed. Copy your edits before reloading'; end if;
  if rec.team_id is not null and exists(select 1 from private.guided_states where assignment_id=a.id and team_id=tid) then raise exception using errcode='22023',message='Recommendation is locked because the team has started its research'; end if;
  if not private.guided_fields_valid(p_data,array['company','title'],300) or not private.guided_fields_valid(p_data,array['guidance'],50000) then raise exception using errcode='22023',message='Enter company, title and guidance within their limits'; end if;
  insert into private.guided_recommendations(assignment_id,team_id,company,title,guidance) values(a.id,tid,p_data->>'company',p_data->>'title',p_data->>'guidance')
   on conflict(assignment_id,team_id) do update set company=excluded.company,title=excluded.title,guidance=excluded.guidance,version=guided_recommendations.version+1;
 else
  if p_action='decide' then tid=(p_data->>'teamId')::uuid; end if;
  select * into s from private.guided_states where assignment_id=a.id and team_id=tid for update;
  if expected<>coalesce(s.version,0) then raise exception using errcode='40001',message='Team work changed. Your input is retained; copy it before reloading'; end if;
  if s.frozen then raise exception using errcode='22023',message='Research and direction are frozen after the first final submission'; end if;
  if p_action='research' then
   if not coalesce(private.guided_fields_valid(p_data->'research',array['risk1','risk2','question'],10000),false) or ((p_data->'research') - array['risk1','risk2','question']) is distinct from '{}'::jsonb then raise exception using errcode='22023',message='Complete both risks/citations and your initial question (up to 10,000 characters each)'; end if;
   insert into private.guided_states(assignment_id,team_id,original_research,research,researched_by,updated_by)
    values(a.id,tid,p_data->'research',p_data->'research',private.my_person_id(),private.my_person_id())
    on conflict(assignment_id,team_id) do update set research=excluded.research,version=guided_states.version+1,updated_by=excluded.updated_by,updated_at=clock_timestamp();
   update public.cohort_teams set locked=true where id=tid;
  elsif p_action in ('recommended','alternative','decide') then
   if s.team_id is null then raise exception using errcode='22023',message='Save team research first'; end if;
   if not exists(select 1 from private.guided_recommendations where assignment_id=a.id and team_id=tid) then raise exception using errcode='22023',message='Your project direction is being prepared'; end if;
   if p_action='recommended' then
    update private.guided_requests set status='superseded' where assignment_id=a.id and team_id=tid and status in ('pending','approved','changes_requested');
    update private.guided_states set direction='recommended' where assignment_id=a.id and team_id=tid;
   elsif p_action='alternative' then
    if not coalesce(private.guided_fields_valid(p_data->'proposal',array['risk','direction','question','evidence'],10000),false) or ((p_data->'proposal') - array['risk','direction','question','evidence']) is distinct from '{}'::jsonb then raise exception using errcode='22023',message='Complete the risk/citation, direction, question and evidence plan'; end if;
    update private.guided_requests set status='superseded' where assignment_id=a.id and team_id=tid and status in ('pending','approved','changes_requested');
    insert into private.guided_requests(assignment_id,team_id,proposal,requested_by) values(a.id,tid,p_data->'proposal',private.my_person_id());
    update private.guided_states set direction='alternative' where assignment_id=a.id and team_id=tid;
   else
    select * into q from private.guided_requests where id=(p_data->>'requestId')::uuid and assignment_id=a.id and team_id=tid for update;
    if q.id is null or q.status<>'pending' or s.direction<>'alternative' then raise exception using errcode='40001',message='This request changed. Reload before deciding'; end if;
    if p_data->>'decision' is null or p_data->>'decision' not in ('approved','changes_requested') or jsonb_typeof(p_data->'note') is distinct from 'string' or length(p_data->>'note')>50000 or (p_data->>'decision'='changes_requested' and btrim(p_data->>'note')='') then raise exception using errcode='22023',message='Choose a decision and explain requested changes'; end if;
    update private.guided_requests set status=p_data->>'decision',decision=p_data->>'decision',decision_note=p_data->>'note',decided_by=private.my_person_id(),decided_at=clock_timestamp() where id=q.id;
   end if;
   update private.guided_states set version=version+1,updated_by=private.my_person_id(),updated_at=clock_timestamp() where assignment_id=a.id and team_id=tid;
  else raise exception using errcode='22023',message='Unknown guided operation'; end if;
 end if;
 result=jsonb_build_object('saved',true);
 insert into private.guided_receipts values(auth.uid(),p_request,payload,result);
 return result;
end $$;
revoke all on function public.mutate_guided_project(text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mutate_guided_project(text,uuid,jsonb,uuid) to authenticated;

create function private.guided_ready(p_assignment uuid,p_team uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.guided_states s join private.guided_recommendations r using(assignment_id,team_id)
 where s.assignment_id=p_assignment and s.team_id=p_team and (s.direction='recommended' or s.direction='alternative' and exists(
 select 1 from private.guided_requests q where q.assignment_id=s.assignment_id and q.team_id=s.team_id and q.status='approved')))
$$;
revoke all on function private.guided_ready(uuid,uuid) from public,anon,authenticated,service_role;

alter function private.resolve_submission_target(uuid) rename to resolve_submission_target_before_guided;
create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets
language plpgsql security definer set search_path='' as $$
declare t public.submission_targets;
begin
 t=private.resolve_submission_target_before_guided(p_assignment);
 if exists(select 1 from public.assignments where id=p_assignment and workflow='guided') and not private.guided_ready(p_assignment,t.team_id)
 then raise exception using errcode='42501',message='Choose the recommended direction or obtain alternative approval before submitting'; end if;
 return t;
end $$;
revoke all on function private.resolve_submission_target(uuid),private.resolve_submission_target_before_guided(uuid) from public,anon,authenticated,service_role;

create function private.guard_guided_submission() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if exists(select 1 from public.assignments where id=new.assignment_id and workflow='guided') then
  if new.submission_type='text' or not private.guided_ready(new.assignment_id,new.team_id) then raise exception using errcode='42501',message='Guided projects require an approved direction and a document or document link'; end if;
  update private.guided_states set frozen=true where assignment_id=new.assignment_id and team_id=new.team_id;
 end if;
 return new;
end $$;
revoke all on function private.guard_guided_submission() from public,anon,authenticated,service_role;
create trigger guided_submission before insert on public.submissions for each row execute function private.guard_guided_submission();

-- Publication validates populated official teams; test and future teams block only their own flow.
create function private.guard_guided_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if new.published and exists(select 1 from public.assignments a join public.cohort_teams t on t.cohort_id=new.cohort_id
 where a.week_id=new.id and a.workflow='guided' and not t.is_test
 and exists(select 1 from public.team_memberships m join public.cohort_enrollments e on e.id=m.enrollment_id where m.team_id=t.id and e.participation_status='enrolled')
 and not exists(select 1 from private.guided_recommendations r where r.assignment_id=a.id and r.team_id=t.id))
 then raise exception using errcode='22023',message='Configure a recommended direction for every populated official team before publishing'; end if;
 return new;
end $$;
revoke all on function private.guard_guided_publication() from public,anon,authenticated,service_role;
create trigger guided_publication after insert or update on public.program_weeks for each row execute function private.guard_guided_publication();
commit;
