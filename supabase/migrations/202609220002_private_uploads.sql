begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('submissions','submissions',false,20971520,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table private.upload_intents (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 assignment_id uuid not null references public.assignments(id) on delete restrict,
 enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
 submission_id uuid not null unique default gen_random_uuid(),
 path text not null unique,
 original_filename text not null check(length(original_filename) between 1 and 240),
 expected_size bigint not null check(expected_size between 1 and 20971520),
 mime_type text not null,
 expected_id uuid references public.submissions(id) on delete restrict,
 expected_updated_at timestamptz,
 state text not null default 'pending' check(state in ('pending','committed','abandoned')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '1 hour',
 cleanup_at timestamptz,
 cleanup_error boolean not null default false
);
create index upload_intents_cleanup on private.upload_intents(state,expires_at,cleanup_at);
create index upload_intents_owner on private.upload_intents(owner_id);
alter table private.upload_intents enable row level security;
revoke all on private.upload_intents from public,anon,authenticated,service_role;
alter table public.submissions add column file_size bigint, add column mime_type text;
alter table public.submissions add constraint submission_file_metadata check
 ((submission_type='link' and file_size is null and mime_type is null) or
 (submission_type='file' and file_size between 1 and 20971520 and mime_type is not null));

create function private.may_upload(p_path text) returns boolean
language sql volatile security definer set search_path='' as $$
 select exists(select 1 from private.upload_intents i
 join public.cohort_enrollments e on e.id=i.enrollment_id
 join public.assignments a on a.id=i.assignment_id
 join public.program_weeks w on w.id=a.week_id
 where i.path=p_path and i.owner_id=(select auth.uid()) and i.state='pending'
 and i.expires_at>clock_timestamp() and e.person_id=private.my_person_id()
 and private.can_learn(e.cohort_id) and w.published
 and not exists(select 1 from public.submissions s where s.enrollment_id=e.id
 and s.assignment_id=a.id and s.is_current and s.status='completed'))
$$;
create function private.may_download(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.submissions s join public.cohort_enrollments e on e.id=s.enrollment_id
 where s.submission_type='file' and s.file_path=p_path
 and (private.is_admin() or e.person_id=private.my_person_id()))
$$;
revoke all on function private.may_upload(text),private.may_download(text) from public,anon,authenticated;
grant execute on function private.may_upload(text),private.may_download(text) to authenticated;
create policy submission_insert on storage.objects for insert to authenticated
 with check(bucket_id='submissions' and private.may_upload(name));
create policy submission_download on storage.objects for select to authenticated
 using(bucket_id='submissions' and private.may_download(name));
-- No UPDATE/DELETE policies: unique objects are immutable to browser clients.

-- Only the application server may attest content inspection. Actor is obtained from
-- getUser(), never from browser input. All operations repeat live roster checks here.
create function public.file_upload(p_actor uuid,p_action text,p_intent uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare i private.upload_intents%rowtype; e public.cohort_enrollments%rowtype;
 s public.submissions%rowtype; filename text; ext text; mime text; sid uuid; aid uuid;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 if private.my_person_id() is null then raise exception using errcode='42501',message='Access denied'; end if;
 if p_action='prepare' then
   aid=(p_data->>'assignmentId')::uuid;
   filename=p_data->>'name'; ext=lower(substring(filename from '[.]([^.]+)$'));
   mime=case ext when 'pdf' then 'application/pdf'
   when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   when 'pptx' then 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
   when 'xlsx' then 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' end;
   if mime is null or mime is distinct from p_data->>'mime' or filename ~ '[[:cntrl:]/\\]' then raise exception 'Invalid file'; end if;
   select en.* into e from public.cohort_enrollments en join public.program_weeks w on w.cohort_id=en.cohort_id
   join public.assignments a on a.week_id=w.id where a.id=aid and w.published
   and en.person_id=private.my_person_id() and private.can_learn(en.cohort_id) for update of en;
   if e.id is null then raise exception using errcode='42501',message='Assignment unavailable'; end if;
   select * into s from public.submissions where assignment_id=aid and enrollment_id=e.id and is_current for update;
   if s.id is distinct from (p_data->>'expectedId')::uuid or s.updated_at is distinct from (p_data->>'expectedUpdatedAt')::timestamptz then
     return jsonb_build_object('error','stale'); end if;
   if s.status='completed' then return jsonb_build_object('error','closed'); end if;
   if (select count(*) from private.upload_intents where owner_id=p_actor and state='pending' and expires_at>clock_timestamp())>=10 then
     return jsonb_build_object('error','too_many'); end if;
   sid=gen_random_uuid();
   insert into private.upload_intents(owner_id,assignment_id,enrollment_id,submission_id,path,original_filename,expected_size,mime_type,expected_id,expected_updated_at)
   values(p_actor,aid,e.id,sid,p_actor::text||'/'||aid::text||'/'||sid::text||'-'||regexp_replace(filename,'[^a-zA-Z0-9._-]','_','g'),filename,(p_data->>'size')::bigint,mime,s.id,s.updated_at)
   returning * into i;
 else
   select * into i from private.upload_intents where id=p_intent and owner_id=p_actor for update;
   if i.id is null then raise exception using errcode='42501',message='Upload unavailable'; end if;
 end if;
 if i.state='committed' then return jsonb_build_object('id',i.id,'state',i.state,'submissionId',i.submission_id); end if;
 if p_action='cancel' or i.expires_at<=clock_timestamp() then
   update private.upload_intents set state='abandoned' where id=i.id;
   return jsonb_build_object('error','abandoned');
 end if;
 if i.state<>'pending' then return jsonb_build_object('error','abandoned'); end if;
 if p_action='finalize' then
   select * into e from public.cohort_enrollments where id=i.enrollment_id for update;
   select * into s from public.submissions where assignment_id=i.assignment_id and enrollment_id=e.id and is_current for update;
   if e.person_id is distinct from private.my_person_id() or not private.can_learn(e.cohort_id)
   or not exists(select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id where a.id=i.assignment_id and w.published)
   or s.status='completed' or s.id is distinct from i.expected_id or s.updated_at is distinct from i.expected_updated_at then
     update private.upload_intents set state='abandoned' where id=i.id;
     return jsonb_build_object('error','stale');
   end if;
   if (p_data->>'size')::bigint is distinct from i.expected_size or p_data->>'mime' is distinct from i.mime_type
   or not exists(select 1 from storage.objects o where o.bucket_id='submissions' and o.name=i.path
     and (o.metadata->>'size')::bigint=i.expected_size and o.metadata->>'mimetype'=i.mime_type) then
     update private.upload_intents set state='abandoned' where id=i.id;
     return jsonb_build_object('error','invalid');
   end if;
   update public.submissions set is_current=false where id=s.id;
   insert into public.submissions(id,assignment_id,enrollment_id,submission_type,original_filename,file_path,file_size,mime_type,supersedes_submission_id)
   values(i.submission_id,i.assignment_id,e.id,'file',i.original_filename,i.path,i.expected_size,i.mime_type,s.id);
   update private.upload_intents set state='committed' where id=i.id;
   return jsonb_build_object('id',i.id,'state','committed','submissionId',i.submission_id);
 elsif p_action not in ('prepare','get') then raise exception 'Unknown operation'; end if;
 return jsonb_build_object('id',i.id,'state',i.state,'path',i.path,'name',i.original_filename,'size',i.expected_size,'mime',i.mime_type,'expiresAt',i.expires_at);
end $$;
revoke all on function public.file_upload(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.file_upload(uuid,text,uuid,jsonb) to service_role;

-- Claim is a terminal transition, so a finalizer cannot commit once deletion starts.
-- Revisit abandoned rows to remove late-finishing TUS objects; never purge the ledger.
create function public.cleanup_uploads(p_id uuid default null,p_failed boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_id is not null then
   update private.upload_intents set cleanup_error=p_failed where id=p_id and state='abandoned';
   return '{}'::jsonb;
 end if;
 with candidates as (
 select id from private.upload_intents where (state='abandoned' or state='pending' and expires_at<=clock_timestamp())
 and (cleanup_at is null or cleanup_at<clock_timestamp()-interval '5 minutes')
 order by cleanup_at nulls first limit 100 for update skip locked
 ), claimed as (
 update private.upload_intents i set state='abandoned',cleanup_at=clock_timestamp(),cleanup_error=true
 from candidates c where i.id=c.id returning i.id,i.path
 ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into result from claimed;
 return result;
end $$;
revoke all on function public.cleanup_uploads(uuid,boolean) from public,anon,authenticated;
grant execute on function public.cleanup_uploads(uuid,boolean) to service_role;
commit;
