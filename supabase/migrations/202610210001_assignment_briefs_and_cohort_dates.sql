begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('assignment-briefs','assignment-briefs',false,20971520,array['application/pdf']);

create table public.assignment_documents (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 original_filename text not null check(length(original_filename) between 1 and 240),
 path text unique not null,
 file_size bigint not null check(file_size between 1 and 20971520),
 state text not null default 'pending' check(state in ('pending','ready','abandoned')),
 is_current boolean not null default false,
 expected_id uuid references public.assignment_documents(id) on delete restrict,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '1 hour',
 check(not is_current or state='ready')
);
create unique index assignment_document_current on public.assignment_documents(assignment_id) where is_current;
create index assignment_document_assignment on public.assignment_documents(assignment_id);
alter table public.assignment_documents enable row level security;
revoke all on public.assignment_documents from public,anon,authenticated;
grant select on public.assignment_documents to authenticated;
grant all on public.assignment_documents to service_role;

create policy assignment_document_read on public.assignment_documents for select to authenticated
using(private.is_admin() or (state='ready' and is_current and exists(
 select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id
 where a.id=assignment_id and w.published and private.can_learn(w.cohort_id))));

create function private.may_upload_brief(p_path text) returns boolean
language sql volatile security definer set search_path='' as $$
 select private.is_admin() and exists(select 1 from public.assignment_documents
 where path=p_path and owner_id=auth.uid() and state='pending' and expires_at>clock_timestamp())
$$;
create function private.may_download_brief(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.assignment_documents d join public.assignments a on a.id=d.assignment_id
 join public.program_weeks w on w.id=a.week_id where d.path=p_path and d.state='ready'
 and (private.is_admin() or (d.is_current and w.published and private.can_learn(w.cohort_id))))
$$;
revoke all on function private.may_upload_brief(text),private.may_download_brief(text) from public,anon,authenticated;
grant execute on function private.may_upload_brief(text),private.may_download_brief(text) to authenticated;
create policy brief_insert on storage.objects for insert to authenticated
with check(bucket_id='assignment-briefs' and private.may_upload_brief(name));
create policy brief_read on storage.objects for select to authenticated
using(bucket_id='assignment-briefs' and private.may_download_brief(name));

-- Only trusted server code may attest PDF inspection. Actor comes from verified Auth.
create function public.assignment_brief(p_actor uuid,p_action text,p_id uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.assignment_documents%rowtype; aid uuid; current_id uuid; filename text; locked_id uuid;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if p_action='prepare' then
   aid=(p_data->>'assignmentId')::uuid;
 else
   select assignment_id into aid from public.assignment_documents where id=p_id and owner_id=p_actor;
 end if;
 -- Serialize all brief changes for this assignment, including concurrent first uploads.
 select id into locked_id from public.assignments where id=aid for update;
 if locked_id is null then raise exception 'Save assignment first'; end if;
 select id into current_id from public.assignment_documents where assignment_id=aid and is_current;
 if p_action='prepare' then
   if current_id is distinct from (p_data->>'expectedId')::uuid then return jsonb_build_object('error','stale'); end if;
   filename=p_data->>'name';
   if filename !~* '[.]pdf$' or filename ~ '[[:cntrl:]/\\]' or btrim(filename)='' then raise exception 'Invalid PDF filename'; end if;
   if (select count(*) from public.assignment_documents where owner_id=p_actor and state='pending' and expires_at>clock_timestamp())>=10 then raise exception 'Too many uploads'; end if;
   insert into public.assignment_documents(assignment_id,owner_id,original_filename,path,file_size,expected_id)
   values(aid,p_actor,filename,p_actor::text||'/'||aid::text||'/'||gen_random_uuid()::text||'-'||regexp_replace(filename,'[^a-zA-Z0-9._-]','_','g'),(p_data->>'size')::bigint,current_id) returning * into d;
 else
   select * into d from public.assignment_documents where id=p_id and owner_id=p_actor for update;
 end if;
 if d.id is null then raise exception 'Upload unavailable'; end if;
 if d.state='ready' then return to_jsonb(d); end if;
 if p_action='cancel' or d.expires_at<=clock_timestamp() then
   update public.assignment_documents set state='abandoned' where id=d.id returning * into d;
   return to_jsonb(d);
 end if;
 if d.state<>'pending' then return jsonb_build_object('error','abandoned'); end if;
 if p_action='finalize' then
   if d.expected_id is distinct from current_id then
     update public.assignment_documents set state='abandoned' where id=d.id;
     return jsonb_build_object('error','stale');
   end if;
   if (p_data->>'size')::bigint is distinct from d.file_size or not exists(
     select 1 from storage.objects where bucket_id='assignment-briefs' and name=d.path
     and (metadata->>'size')::bigint=d.file_size and metadata->>'mimetype'='application/pdf') then raise exception 'Invalid object'; end if;
   update public.assignment_documents set is_current=false where assignment_id=aid and is_current;
   update public.assignment_documents set state='ready',is_current=true where id=d.id returning * into d;
 elsif p_action not in ('get','prepare') then raise exception 'Unknown operation'; end if;
 return to_jsonb(d);
end $$;
revoke all on function public.assignment_brief(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.assignment_brief(uuid,text,uuid,jsonb) to service_role;

create function public.update_cohort_dates(p_id uuid,p_starts_on date,p_ends_on date) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if p_starts_on is null or p_ends_on is null or p_ends_on<p_starts_on then raise exception 'Invalid dates'; end if;
 update public.program_cohorts set starts_on=p_starts_on,ends_on=p_ends_on where id=p_id;
 if not found then raise exception 'Cohort unavailable'; end if;
 return p_id;
end $$;
revoke all on function public.update_cohort_dates(uuid,date,date) from public,anon,authenticated;
grant execute on function public.update_cohort_dates(uuid,date,date) to authenticated;
commit;
