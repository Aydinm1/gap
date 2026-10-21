begin;
alter table public.assignments drop constraint assignments_week_id_key;
alter table public.assignments add column sort_order integer not null default 1 check(sort_order>0);
create index assignments_week_order on public.assignments(week_id,sort_order,id);

create function public.save_program_week(p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid=(p_data->>'id')::uuid; w public.program_weeks%rowtype;
 items jsonb; r jsonb; aid uuid; ids uuid[]='{}'; position integer=0; legacy_id uuid;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Invalid week'; end if;
 select * into w from public.program_weeks where id=target for update;
 if w.id is null then raise exception 'Week not found'; end if;
 if coalesce(btrim(p_data->>'title'),'')='' or p_data->>'publicationState' not in ('published','draft') then raise exception 'Invalid week'; end if;
 if p_data->>'publicationState'='published' and coalesce(btrim(p_data->>'description'),'')='' then raise exception 'Description required'; end if;
 if nullif(p_data->>'slidesUrl','') is not null and p_data->>'slidesUrl' !~ '^https?://[^[:space:]]+$' then raise exception 'Invalid slides URL'; end if;
 perform id from public.assignments where week_id=target order by id for update;
 if p_data ? 'assignments' then
   items=p_data->'assignments';
   if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>100 then raise exception 'Invalid assignment list'; end if;
   if p_data ? 'expectedAssignmentIds' then
     if jsonb_typeof(p_data->'expectedAssignmentIds') is distinct from 'array' then raise exception 'Invalid assignment version'; end if;
     if array(select value::uuid from jsonb_array_elements_text(p_data->'expectedAssignmentIds') order by 1)
       is distinct from array(select id from public.assignments where week_id=target order by id) then
       raise exception using errcode='40001',message='Assignment list changed. Reload before saving';
     end if;
   end if;
 else
   -- Existing single-assignment callers may still save, but cannot erase a collection.
   if (select count(*) from public.assignments where week_id=target)>1 then raise exception using errcode='40001',message='Reload this week before editing multiple assignments'; end if;
   select id into legacy_id from public.assignments where week_id=target;
   if p_data->'assignment' is null or p_data->'assignment'='null'::jsonb then items='[]'::jsonb;
   else items=jsonb_build_array((p_data->'assignment')||jsonb_build_object('id',coalesce(legacy_id,gen_random_uuid()))); end if;
 end if;
 for r in select value from jsonb_array_elements(items) loop
   if jsonb_typeof(r) is distinct from 'object' then raise exception 'Invalid assignment'; end if;
   aid=(r->>'id')::uuid;
   if aid is null or aid=any(ids) then raise exception 'Missing or duplicate assignment ID'; end if;
   if exists(select 1 from public.assignments where id=aid and week_id<>target) then raise exception using errcode='42501',message='Assignment belongs to another week'; end if;
   if r->>'dueAt' is null or not isfinite((r->>'dueAt')::timestamptz) then raise exception 'Deadline required'; end if;
   if p_data->>'publicationState'='published' and (coalesce(btrim(r->>'title'),'')='' or coalesce(btrim(r->>'instructions'),'')='') then raise exception 'Assignment title and instructions required'; end if;
   ids=array_append(ids,aid); position=position+1;
   insert into public.assignments(id,week_id,title,instructions,due_at,sort_order)
   values(aid,target,coalesce(r->>'title',''),coalesce(r->>'instructions',''),(r->>'dueAt')::timestamptz,position)
   on conflict(id) do update set title=excluded.title,instructions=excluded.instructions,due_at=excluded.due_at,sort_order=excluded.sort_order
   where assignments.week_id=target;
   if not found then raise exception using errcode='42501',message='Assignment belongs to another week'; end if;
 end loop;
 -- FK restrictions retain submissions, upload intents and assignment briefs. Any
 -- protected deletion rolls back the entire save, including edits to other items.
 delete from public.assignments where week_id=target and not(id=any(ids));
 update public.program_weeks set title=p_data->>'title',description=coalesce(p_data->>'description',''),
 published=p_data->>'publicationState'='published',slides_url=nullif(p_data->>'slidesUrl','') where id=target;
 if jsonb_typeof(p_data->'resources') is distinct from 'array' then raise exception 'Invalid resources'; end if;
 delete from public.resources where week_id=target;
 for r in select value from jsonb_array_elements(p_data->'resources') loop
   if coalesce(r->>'url','') !~ '^https?://[^[:space:]]+$' or (p_data->>'publicationState'='published' and coalesce(btrim(r->>'title'),'')='') then raise exception 'Invalid resource'; end if;
   insert into public.resources(week_id,title,description,resource_type,url,sort_order)
   values(target,r->>'title',r->>'description',r->>'type',r->>'url',(r->>'sortOrder')::integer);
 end loop;
 return target;
end $$;
revoke all on function public.save_program_week(jsonb) from public,anon,authenticated;
grant execute on function public.save_program_week(jsonb) to authenticated;
create or replace function public.admin_mutate(p_action text,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid := nullif(p_data->>'id','')::uuid; result uuid; w public.program_weeks%rowtype;
 a public.assignments%rowtype; r jsonb; person public.people%rowtype; sub public.submissions%rowtype;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin access required'; end if;
 case p_action
 when 'review' then
  select * into sub from public.submissions where id=target for update;
  if sub.id is null or not sub.is_current or sub.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz then
   raise exception using errcode='40001',message='This submission changed. Refresh before reviewing again'; end if;
  perform public.sync_profile();
  update public.submissions set status=(p_data->>'status')::public.submission_status,
   feedback=case when p_data->>'status'='submitted' then null else nullif(btrim(p_data->>'feedback'),'') end,
   reviewed_at=case when p_data->>'status'='submitted' then null else now() end,
   reviewed_by=case when p_data->>'status'='submitted' then null else auth.uid() end where id=target;
 when 'cohort_create' then
  insert into public.program_cohorts(quarter,year,starts_on,ends_on,state) values
   ((p_data->>'quarter')::public.program_quarter,(p_data->>'year')::smallint,(p_data->>'startsOn')::date,(p_data->>'endsOn')::date,(p_data->>'state')::public.cohort_state) returning id into target;
  insert into public.program_weeks(cohort_id,week_number,title) select target,n,'Week '||n from generate_series(1,6) n;
 when 'cohort_state' then
  update public.program_cohorts set state=(p_data->>'state')::public.cohort_state where id=target;
  if not found then raise exception 'Cohort not found'; end if;
 when 'enrollment' then
  update public.cohort_enrollments set participation_status=(p_data->>'participationStatus')::public.participation_status,
   advancement_status=(p_data->>'advancementStatus')::public.advancement_status,
   promotion_response=(p_data->>'promotionResponse')::public.promotion_response where id=target;
  if not found then raise exception 'Enrollment not found'; end if;
 when 'enroll' then
  select * into strict person from public.people where id=(p_data->>'personId')::uuid;
  select enrollment_id into target from private.enroll_in_gap(person.email,person.full_name,(p_data->>'cohortId')::uuid);
 when 'roster' then
  if coalesce(p_data->>'email','') !~* '^[^[:space:]@]+@ucdavis[.]edu$' or coalesce(btrim(p_data->>'fullName'),'')='' then raise exception 'Valid name and UC Davis email required'; end if;
  if target is null then
   insert into public.people(email,full_name) values(lower(btrim(p_data->>'email')),btrim(p_data->>'fullName'))
   on conflict(email) do nothing;
   select * into strict person from public.people where email=lower(btrim(p_data->>'email')) for update;
   insert into public.approved_members(person_id,email,full_name,role) values(person.id,person.email,person.full_name,(p_data->>'role')::public.app_role) returning id into target;
  else
   select p.* into strict person from public.people p join public.approved_members m on m.person_id=p.id where m.id=target for update of p;
   update public.people set email=lower(btrim(p_data->>'email')),full_name=btrim(p_data->>'fullName') where id=person.id;
   update public.approved_members set email=lower(btrim(p_data->>'email')),full_name=btrim(p_data->>'fullName'),
   role=(p_data->>'role')::public.app_role,active=(p_data->>'active')::boolean where id=target;
  end if;
 when 'week' then
  return public.save_program_week(p_data);
 else raise exception 'Unknown admin operation';
 end case;
 return target;
end $$;
commit;
