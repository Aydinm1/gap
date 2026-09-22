begin;
create table private.monday_import_batches (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 account_id text not null, board_id text not null,
 rows jsonb not null check(jsonb_typeof(rows)='array'),
 mappings jsonb not null default '{}', results jsonb not null default '{}',
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '15 minutes'
);
alter table private.monday_import_batches enable row level security;
revoke all on private.monday_import_batches from public,anon,authenticated,service_role;

-- Only trusted server code can stage Monday-verified identities. A caller's admin
-- session is checked independently on every operation, including each individual row.
create function public.monday_import(p_actor uuid,p_action text,p_batch uuid default null,p_data jsonb default '{}')
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
         result=jsonb_build_object('status','blocked','message','Identity conflict or inactive access. Resolve in GAP before retrying.');
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
   select p.id,a.active into person from public.people p left join public.approved_members a on a.person_id=p.id where p.email=r->>'email';
   if person.active=false then reason='Access is inactive; explicit GAP reactivation is required.'; end if;
   r=r||jsonb_build_object('eligibility',case when reason is not null then 'blocked' when linked.person_id is not null then 'already_linked'
    when exists(select 1 from public.cohort_enrollments e where e.person_id=person.id and e.cohort_id=target) then 'needs_link' else 'ready' end,
    'reason',reason,'result',b.results->(r->>'id'));
   result=result||jsonb_build_array(r);
 end loop;
 return jsonb_build_object('id',b.id,'account',b.account_id,'board',b.board_id,'expiresAt',b.expires_at,'mappings',b.mappings,'rows',result);
end $$;
revoke all on function public.monday_import(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.monday_import(uuid,text,uuid,jsonb) to service_role;
commit;
