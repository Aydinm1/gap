begin;
create function private.is_viewer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.current_member() where role='viewer')
$$;
create or replace function private.can_learn(p_cohort uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from public.cohort_enrollments e join public.program_cohorts c on c.id=e.cohort_id
 where e.person_id=private.my_person_id() and e.cohort_id=p_cohort and e.participation_status='enrolled' and c.state='active')
$$;
create function private.can_read_content(p_cohort uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can_learn(p_cohort) or (private.is_viewer() and exists(select 1 from public.program_cohorts where id=p_cohort and state in ('active','archived')))
$$;
revoke all on function private.is_viewer(),private.can_read_content(uuid) from public,anon,authenticated;
grant execute on function private.is_viewer(),private.can_read_content(uuid) to authenticated;
alter policy cohorts_read on public.program_cohorts using(private.is_admin() or private.can_read_content(id));
alter policy weeks_read on public.program_weeks using(private.is_admin() or published and private.can_read_content(cohort_id));
alter policy enrollments_read on public.cohort_enrollments using(private.is_admin() or (not private.is_viewer() and person_id=private.my_person_id()));
alter policy submissions_read on public.submissions using(private.is_admin() or (not private.is_viewer() and exists(
 select 1 from public.cohort_enrollments e where e.id=enrollment_id and e.person_id=private.my_person_id())));
create or replace function public.week_catalog(p_cohort_id uuid)
returns table(id uuid,cohort_id uuid,week_number smallint,title text,published boolean)
language sql stable security definer set search_path='' as $$
 select w.id,w.cohort_id,w.week_number,w.title,w.published from public.program_weeks w
 where w.cohort_id=p_cohort_id and (private.is_admin() or private.can_read_content(p_cohort_id)) order by w.week_number
$$;
alter policy assignment_document_read on public.assignment_documents using(private.is_admin() or (state='ready' and is_current and exists(
 select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id where a.id=assignment_id and w.published and private.can_read_content(w.cohort_id))));
create or replace function private.may_download_brief(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.assignment_documents d join public.assignments a on a.id=d.assignment_id
 join public.program_weeks w on w.id=a.week_id where d.path=p_path and d.state='ready'
 and (private.is_admin() or (d.is_current and w.published and private.can_read_content(w.cohort_id))))
$$;
create or replace function private.may_download(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select not private.is_viewer() and exists(select 1 from public.submissions s join public.cohort_enrollments e on e.id=s.enrollment_id
 where s.submission_type='file' and s.file_path=p_path and (private.is_admin() or e.person_id=private.my_person_id()))
$$;

-- Serialize role/enrollment changes before acquiring row locks. Both manual and Monday
-- provisioning already use this advisory lock; triggers additionally protect trusted writers.
create function private.lock_viewer_access() returns trigger language plpgsql security definer set search_path='' as $$
begin perform pg_advisory_xact_lock(180,20260914); return null; end $$;
create trigger viewer_roster_lock before insert or update on public.approved_members for each statement execute function private.lock_viewer_access();
create trigger viewer_enrollment_lock before insert or update on public.cohort_enrollments for each statement execute function private.lock_viewer_access();
create function private.validate_viewer_roster() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='viewer' and (TG_OP='INSERT' or old.role is distinct from new.role or old.person_id is distinct from new.person_id)
 and exists(select 1 from public.cohort_enrollments e join public.program_cohorts c on c.id=e.cohort_id
 where e.person_id=new.person_id and e.participation_status='enrolled' and c.state in ('active','draft')) then
  raise exception using errcode='22023',message='Resolve current cohort participation before changing this person to Viewer';
 end if; return new;
end $$;
create trigger viewer_roster_guard before insert or update on public.approved_members for each row execute function private.validate_viewer_roster();
create function private.validate_viewer_enrollment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.approved_members where person_id=new.person_id and role='viewer') and
 (TG_OP='INSERT' or new.participation_status='enrolled') then
  raise exception using errcode='22023',message='Change Viewer access to Member or Admin before enrolling this person';
 end if; return new;
end $$;
create trigger viewer_enrollment_guard before insert or update on public.cohort_enrollments for each row execute function private.validate_viewer_enrollment();
revoke all on function private.lock_viewer_access(),private.validate_viewer_roster(),private.validate_viewer_enrollment() from public,anon,authenticated;

-- A former participant may retain old attempts/intents after conversion to Viewer.
-- Deny even service-mediated get/cancel/finalize, not only new upload preparation.
alter function public.file_upload(uuid,text,uuid,jsonb) set schema private;
alter function private.file_upload(uuid,text,uuid,jsonb) rename to file_upload_impl;
revoke all on function private.file_upload_impl(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.file_upload(p_actor uuid,p_action text,p_intent uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 if private.is_viewer() then raise exception using errcode='42501',message='Viewer access is read-only'; end if;
 return private.file_upload_impl(p_actor,p_action,p_intent,p_data);
end $$;
revoke all on function public.file_upload(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.file_upload(uuid,text,uuid,jsonb) to service_role;
create or replace function public.monday_import(p_actor uuid,p_action text,p_batch uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare b private.monday_import_batches%rowtype; r jsonb; other jsonb; target uuid;
 result jsonb; outcome record; linked record; person record; reason text;
begin
 if not exists(select 1 from auth.users u join public.approved_members a on a.email=lower(u.email)
 join public.people p on p.id=a.person_id and p.email=a.email
 where u.id=p_actor and u.email_confirmed_at is not null and a.active and a.role='admin'
 and a.email ~ '^[^[:space:]@]+@ucdavis[.]edu$'
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')) then
 raise exception using errcode='42501',message='Active admin required'; end if;
 if p_action='stage' then
   insert into private.monday_import_batches(owner_id,account_id,board_id,rows)
   values(p_actor,p_data->>'account',p_data->>'board',p_data->'rows') returning * into b;
 else
   select * into b from private.monday_import_batches where id=p_batch and owner_id=p_actor for update;
   if b.id is null then raise exception using errcode='42501',message='Import unavailable'; end if;
   if b.expires_at<=clock_timestamp() then raise exception using errcode='22023',message='Preview expired. Reload it.'; end if;
 end if;
 if p_action='map' then
   if b.results<>'{}'::jsonb then raise exception 'Reload before changing processed mappings'; end if;
   if jsonb_typeof(p_data)<>'object' then raise exception 'Invalid mappings'; end if;
   update private.monday_import_batches set mappings=p_data where id=b.id returning * into b;
 elsif p_action='process' then
   select value into r from jsonb_array_elements(b.rows) where value->>'id'=p_data->>'id';
   if r is null then raise exception 'Unknown item'; end if;
   if b.results->(r->>'id')->>'status' in ('enrolled','linked','already_linked') then
     return b.results->(r->>'id');
   end if;
   -- p_data is a fresh provider read, never a browser payload.
   if (r-'status') is distinct from (p_data-'status') then
     result=jsonb_build_object('status','blocked','message','Monday record changed. Reload preview.');
   else
     reason=null;
     if coalesce(r->>'issue','')<>'' then reason=r->>'issue'; end if;
     if coalesce(r->>'checked','false')<>'true' then reason='Enrollment checkbox is not checked.'; end if;
     target=nullif(b.mappings->>(r->>'cohortKey'),'')::uuid;
     if target is null or not exists(select 1 from public.program_cohorts where id=target and state in ('active','draft')) then reason='Choose an active or draft GAP cohort.'; end if;
     for other in select value from jsonb_array_elements(b.rows) loop
       if other->>'id'<>r->>'id' and other->>'email'=r->>'email'
       and b.mappings->>(other->>'cohortKey')=target::text then reason='Duplicate email in target cohort. Resolve in Monday.'; end if;
     end loop;
     if reason is not null then result=jsonb_build_object('status','blocked','message',reason);
     else
       begin
         select * into outcome from private.enroll_in_gap(r->>'email',r->>'name',target,b.account_id,b.board_id,r->>'id');
         result=jsonb_build_object('status',case when outcome.created then 'enrolled' else 'linked' end,
           'personId',outcome.person_id,'enrollmentId',outcome.enrollment_id,'message','Enrollment saved.');
       exception when sqlstate '22023' then
         result=jsonb_build_object('status','blocked','message',case when SQLERRM like 'Change Viewer access%' then 'Change Viewer access to Member or Admin before enrollment.' else 'Identity conflict or inactive access. Resolve in GAP before retrying.' end);
       when others then
         result=jsonb_build_object('status','failed','message','Enrollment failed. No partial changes saved; retry or contact your GAP lead.');
       end;
     end if;
   end if;
   update private.monday_import_batches set results=jsonb_set(results,array[r->>'id'],result) where id=b.id;
   return result;
 elsif p_action not in ('stage','get','map') then raise exception 'Unknown operation';
 end if;
 -- Derive current eligibility without mutating program/access records.
 result='[]'::jsonb;
 for r in select value from jsonb_array_elements(b.rows) loop
   reason=nullif(r->>'issue','');
   target=nullif(b.mappings->>(r->>'cohortKey'),'')::uuid;
   if target is null or not exists(select 1 from public.program_cohorts where id=target and state in ('active','draft')) then reason=coalesce(reason,'Choose an active or draft GAP cohort.'); end if;
   for other in select value from jsonb_array_elements(b.rows) loop
     if other->>'id'<>r->>'id' and other->>'email'=r->>'email'
     and b.mappings->>(other->>'cohortKey')=target::text then reason='Duplicate email in target cohort. Resolve in Monday.'; end if;
   end loop;
   select e.person_id,e.cohort_id,p.email into linked from private.monday_application_links l
   join public.cohort_enrollments e on e.id=l.enrollment_id join public.people p on p.id=e.person_id
   where l.account_id=b.account_id and l.board_id=b.board_id and l.item_id=r->>'id';
   if found and (linked.email<>r->>'email' or linked.cohort_id is distinct from target) then reason='Existing Monday link conflicts with this identity or cohort.'; end if;
   select p.id,a.active,a.role into person from public.people p left join public.approved_members a on a.person_id=p.id where p.email=r->>'email';
   if person.role='viewer' then reason='Change Viewer access to Member or Admin before enrollment.'; end if;
   if person.active=false then reason='Access is inactive; explicit GAP reactivation is required.'; end if;
   r=r||jsonb_build_object('eligibility',case when reason is not null then 'blocked' when linked.person_id is not null then 'already_linked'
    when exists(select 1 from public.cohort_enrollments e where e.person_id=person.id and e.cohort_id=target) then 'needs_link' else 'ready' end,
    'reason',reason,'result',b.results->(r->>'id'));
   result=result||jsonb_build_array(r);
 end loop;
 return jsonb_build_object('id',b.id,'account',b.account_id,'board',b.board_id,'expiresAt',b.expires_at,'mappings',b.mappings,'rows',result);
end $$;
commit;
