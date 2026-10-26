begin;

create table public.assignment_grading_references (
 assignment_id uuid primary key references public.assignments(id) on delete restrict,
 rubric text not null default '' check(length(rubric)<=50000),
 example text not null default '' check(length(example)<=50000),
 text_version bigint not null default 0 check(text_version>=0),
 file_version bigint not null default 0 check(file_version>=0),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.grading_example_documents (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignment_grading_references(assignment_id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 original_filename text not null check(length(original_filename) between 1 and 240),
 path text unique not null,
 file_size bigint not null check(file_size between 1 and 20971520),
 state text not null default 'pending' check(state in ('pending','ready','abandoned')),
 is_current boolean not null default false,
 expected_file_version bigint not null,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '1 hour',
 cleanup_after timestamptz,
 cleanup_failed boolean not null default false,
 check(not is_current or state='ready')
);
create unique index grading_example_current on public.grading_example_documents(assignment_id) where is_current;
create index grading_example_owner on public.grading_example_documents(owner_id);
alter table public.assignment_grading_references enable row level security;
alter table public.grading_example_documents enable row level security;
revoke all on public.assignment_grading_references,public.grading_example_documents from public,anon,authenticated;
grant select on public.assignment_grading_references,public.grading_example_documents to authenticated;
grant all on public.assignment_grading_references,public.grading_example_documents to service_role;
create policy grading_reference_admin on public.assignment_grading_references for select to authenticated using(private.is_admin());
create policy grading_example_admin on public.grading_example_documents for select to authenticated using(private.is_admin());

create function public.save_grading_reference(p_assignment uuid,p_rubric text,p_example text,p_version bigint)
returns public.assignment_grading_references language plpgsql security definer set search_path='' as $$
declare r public.assignment_grading_references;
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if p_rubric is null or p_example is null or length(p_rubric)>50000 or length(p_example)>50000 or p_version is null or p_version<0 then raise exception 'Invalid grading reference'; end if;
 perform 1 from public.assignments where id=p_assignment for update;
 if not found then raise exception 'Assignment unavailable'; end if;
 insert into public.assignment_grading_references(assignment_id) values(p_assignment) on conflict do nothing;
 select * into r from public.assignment_grading_references where assignment_id=p_assignment for update;
 -- A lost response may safely retry the exact saved values, but not overwrite another edit.
 if r.text_version=p_version+1 and r.rubric=p_rubric and r.example=p_example then return r; end if;
 if r.text_version<>p_version then raise exception using errcode='40001',message='Grading reference changed. Reload before saving.'; end if;
 update public.assignment_grading_references set rubric=p_rubric,example=p_example,text_version=text_version+1,updated_at=clock_timestamp()
 where assignment_id=p_assignment returning * into r;
 return r;
end $$;
revoke all on function public.save_grading_reference(uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.save_grading_reference(uuid,text,text,bigint) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('grading-examples','grading-examples',false,20971520,array['application/pdf']);
create function private.may_upload_grading_example(p_path text) returns boolean
language sql volatile security definer set search_path='' as $$
 select private.is_admin() and exists(select 1 from public.grading_example_documents
 where path=p_path and owner_id=auth.uid() and state='pending' and expires_at>clock_timestamp())
$$;
create function private.may_read_grading_example(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.is_admin() and exists(select 1 from public.grading_example_documents where path=p_path and state='ready')
$$;
revoke all on function private.may_upload_grading_example(text),private.may_read_grading_example(text) from public,anon,authenticated;
grant execute on function private.may_upload_grading_example(text),private.may_read_grading_example(text) to authenticated;
create policy grading_example_insert on storage.objects for insert to authenticated
with check(bucket_id='grading-examples' and private.may_upload_grading_example(name));
create policy grading_example_read on storage.objects for select to authenticated
using(bucket_id='grading-examples' and private.may_read_grading_example(name));

-- Server-only: the caller attests bounded PDF inspection after verifying live Auth.
create function public.grading_example(p_actor uuid,p_action text,p_id uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.grading_example_documents; r public.assignment_grading_references; aid uuid; did uuid; filename text;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor,'role','authenticated')::text,true);
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if p_action not in ('prepare','get','finalize','cancel','remove') then raise exception 'Unknown operation'; end if;
 if p_action in ('prepare','remove') then aid=(p_data->>'assignmentId')::uuid;
 else select assignment_id into aid from public.grading_example_documents where id=p_id and owner_id=p_actor; end if;
 perform 1 from public.assignments where id=aid for update;
 if not found then raise exception 'Assignment unavailable'; end if;
 insert into public.assignment_grading_references(assignment_id) values(aid) on conflict do nothing;
 select * into r from public.assignment_grading_references where assignment_id=aid for update;
 if p_action in ('prepare','remove') then
   if r.file_version is distinct from (p_data->>'version')::bigint then return jsonb_build_object('error','stale'); end if;
   if p_action='remove' then
     update public.grading_example_documents set is_current=false where assignment_id=aid and is_current;
     update public.assignment_grading_references set file_version=file_version+1 where assignment_id=aid;
     return jsonb_build_object('removed',true,'version',r.file_version+1);
   end if;
   filename=p_data->>'name';
   if filename is null or length(filename) not between 1 and 240 or filename !~* '[.]pdf$' or filename ~ '[[:cntrl:]/\\]' or btrim(filename)='' then raise exception 'Invalid PDF filename'; end if;
   if (select count(*) from public.grading_example_documents where owner_id=p_actor and state='pending' and expires_at>clock_timestamp())>=10 then raise exception 'Too many pending uploads'; end if;
   did=gen_random_uuid();
   insert into public.grading_example_documents(id,assignment_id,owner_id,original_filename,path,file_size,expected_file_version)
   values(did,aid,p_actor,filename,p_actor::text||'/'||aid::text||'/'||did::text||'-'||regexp_replace(filename,'[^a-zA-Z0-9._-]','_','g'),(p_data->>'size')::bigint,r.file_version) returning * into d;
 else
   select * into d from public.grading_example_documents where id=p_id and owner_id=p_actor for update;
 end if;
 if d.id is null then raise exception 'Upload unavailable'; end if;
 if d.state='ready' then return to_jsonb(d); end if;
 if p_action='cancel' or d.expires_at<=clock_timestamp() then
   update public.grading_example_documents set state='abandoned' where id=d.id returning * into d;
   return to_jsonb(d);
 end if;
 if d.state<>'pending' then return jsonb_build_object('error','abandoned'); end if;
 if p_action='finalize' then
   if d.expected_file_version<>r.file_version then
     update public.grading_example_documents set state='abandoned' where id=d.id;
     return jsonb_build_object('error','stale');
   end if;
   if (p_data->>'size')::bigint is distinct from d.file_size or not exists(
     select 1 from storage.objects where bucket_id='grading-examples' and name=d.path
     and (metadata->>'size')::bigint=d.file_size and metadata->>'mimetype'='application/pdf') then raise exception 'Invalid stored object'; end if;
   update public.grading_example_documents set is_current=false where assignment_id=aid and is_current;
   update public.grading_example_documents set state='ready',is_current=true where id=d.id returning * into d;
   update public.assignment_grading_references set file_version=file_version+1 where assignment_id=aid;
 end if;
 return to_jsonb(d);
end $$;
revoke all on function public.grading_example(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.grading_example(uuid,text,uuid,jsonb) to service_role;

-- State is abandoned under the same assignment→reference→document lock order before
-- Storage API deletion. Revisit paths after a lease, including successful deletions,
-- so an already-in-flight transfer cannot permanently orphan a late object.
create function public.cleanup_grading_examples(p_owner uuid default null,p_id uuid default null,p_failed boolean default true)
returns setof public.grading_example_documents language plpgsql security definer set search_path='' as $$
declare candidate record; d public.grading_example_documents;
begin
 if p_id is not null then
   update public.grading_example_documents set cleanup_failed=p_failed
   where id=p_id and state='abandoned' and (p_owner is null or owner_id=p_owner);
   return;
 end if;
 for candidate in select id,assignment_id from public.grading_example_documents
 where (p_owner is null or owner_id=p_owner) and (state='abandoned' or state='pending' and expires_at<=clock_timestamp())
 and (cleanup_after is null or cleanup_after<=clock_timestamp()) order by created_at limit 100 loop
   perform 1 from public.assignments where id=candidate.assignment_id for update;
   perform 1 from public.assignment_grading_references where assignment_id=candidate.assignment_id for update;
   select * into d from public.grading_example_documents where id=candidate.id for update;
   if d.state='ready' or d.state='pending' and d.expires_at>clock_timestamp() or d.cleanup_after>clock_timestamp() then continue; end if;
   update public.grading_example_documents set state='abandoned',cleanup_after=clock_timestamp()+interval '5 minutes',cleanup_failed=true
   where id=d.id returning * into d;
   return next d;
 end loop;
end $$;
revoke all on function public.cleanup_grading_examples(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.cleanup_grading_examples(uuid,uuid,boolean) to service_role;
commit;
