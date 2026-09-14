begin;
create function public.submit_link(p_assignment_id uuid,p_url text,p_expected_id uuid default null,p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.cohort_enrollments%rowtype; s public.submissions%rowtype; result uuid;
begin
 if private.my_person_id() is null then raise exception using errcode='42501',message='Access denied'; end if;
 if p_url is null or p_url !~ '^https?://[^[:space:]]+$' then raise exception 'Enter a valid web link'; end if;
 select en.* into e from public.cohort_enrollments en join public.program_weeks w on w.cohort_id=en.cohort_id
 join public.assignments a on a.week_id=w.id where a.id=p_assignment_id and w.published
 and en.person_id=private.my_person_id() and private.can_learn(en.cohort_id) and en.participation_status='enrolled' for update of en;
 if e.id is null then raise exception using errcode='42501',message='Assignment unavailable'; end if;
 select * into s from public.submissions where assignment_id=p_assignment_id and enrollment_id=e.id and is_current for update;
 if s.id is distinct from p_expected_id or s.updated_at is distinct from p_expected_updated_at then
 raise exception using errcode='40001',message='This submission changed. Refresh before submitting again'; end if;
 if s.status='completed' then raise exception 'Completed submissions cannot be replaced'; end if;
 update public.submissions set is_current=false where id=s.id;
 insert into public.submissions(assignment_id,enrollment_id,submission_type,submitted_url,supersedes_submission_id)
 values(p_assignment_id,e.id,'link',p_url,s.id) returning id into result;
 return result;
end $$;

create function public.admin_mutate(p_action text,p_data jsonb) returns uuid
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
  select * into w from public.program_weeks where id=target for update;
  if w.id is null then raise exception 'Week not found'; end if;
  if coalesce(p_data->>'title','')='' then raise exception 'Week title required'; end if;
  if p_data->>'publicationState'='published' and coalesce(btrim(p_data->>'description'),'')='' then raise exception 'Description required for publishing'; end if;
  update public.program_weeks set title=p_data->>'title',description=coalesce(p_data->>'description',''),
   published=p_data->>'publicationState'='published',slides_url=nullif(p_data->>'slidesUrl','') where id=target;
  select * into a from public.assignments where week_id=target;
  if p_data->'assignment' is null or p_data->'assignment'='null'::jsonb then
   delete from public.assignments where week_id=target;
  else
   r:=p_data->'assignment';
   if p_data->>'publicationState'='published' and (coalesce(btrim(r->>'title'),'')='' or coalesce(btrim(r->>'instructions'),'')='') then raise exception 'Assignment title and instructions required'; end if;
   insert into public.assignments(week_id,title,instructions,due_at) values(target,r->>'title',r->>'instructions',(r->>'dueAt')::timestamptz)
    on conflict(week_id) do update set title=excluded.title,instructions=excluded.instructions,due_at=excluded.due_at;
  end if;
  delete from public.resources where week_id=target;
  for r in select value from jsonb_array_elements(p_data->'resources') loop
   if p_data->>'publicationState'='published' and (coalesce(btrim(r->>'title'),'')='' or coalesce(r->>'url','') !~ '^https?://[^[:space:]]+$') then raise exception 'Valid resource title and URL required'; end if;
   insert into public.resources(week_id,title,description,resource_type,url,sort_order)
    values(target,r->>'title',r->>'description',r->>'type',r->>'url',(r->>'sortOrder')::integer);
  end loop;
 else raise exception 'Unknown admin operation';
 end case;
 return target;
end $$;
revoke all on function public.submit_link(uuid,text,uuid,timestamptz),public.admin_mutate(text,jsonb) from public,anon,authenticated;
grant execute on function public.submit_link(uuid,text,uuid,timestamptz),public.admin_mutate(text,jsonb) to authenticated;
commit;
