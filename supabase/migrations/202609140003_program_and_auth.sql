begin;
create type public.submission_type as enum ('file','link');
create type public.submission_status as enum ('submitted','revision_requested','completed');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 person_id uuid unique not null references public.people(id) on delete restrict,
 email text unique not null, full_name text not null, role public.app_role not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.program_weeks (
 id uuid primary key default gen_random_uuid(),
 cohort_id uuid not null references public.program_cohorts(id) on delete restrict,
 week_number smallint not null check (week_number between 1 and 6),
 title text not null check (btrim(title) <> ''), description text not null default '',
 published boolean not null default false, slides_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(cohort_id,week_number), check (not published or btrim(description) <> ''),
 check (slides_url is null or slides_url ~ '^https?://[^[:space:]]+$')
);
create table public.resources (
 id uuid primary key default gen_random_uuid(), week_id uuid not null references public.program_weeks(id) on delete cascade,
 title text not null, description text, resource_type text not null check (resource_type in ('guide','template','reading','video')),
 url text not null, sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index resources_week_idx on public.resources(week_id);
create table public.assignments (
 id uuid primary key default gen_random_uuid(), week_id uuid unique not null references public.program_weeks(id) on delete restrict,
 title text not null, instructions text not null, due_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.submissions (
 id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.assignments(id) on delete restrict,
 enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
 submission_type public.submission_type not null, original_filename text, file_path text, submitted_url text,
 status public.submission_status not null default 'submitted', feedback text,
 reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
 supersedes_submission_id uuid references public.submissions(id) on delete restrict,
 is_current boolean not null default true, submitted_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((submission_type='link' and submitted_url ~ '^https?://[^[:space:]]+$' and submitted_url is not null and file_path is null and original_filename is null)
 or (submission_type='file' and file_path is not null and original_filename is not null and submitted_url is null)),
 check (status <> 'revision_requested' or length(btrim(feedback)) > 0 and feedback is not null)
);
create unique index submissions_one_current on public.submissions(assignment_id,enrollment_id) where is_current;
create index submissions_enrollment_idx on public.submissions(enrollment_id);
create index submissions_reviewer_idx on public.submissions(reviewed_by);
create index submissions_supersedes_idx on public.submissions(supersedes_submission_id);

create function private.validate_submission_scope() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.assignments a join public.program_weeks w on w.id=a.week_id
 join public.cohort_enrollments e on e.cohort_id=w.cohort_id where a.id=new.assignment_id and e.id=new.enrollment_id)
 then raise exception 'Assignment and enrollment must belong to the same cohort'; end if;
 if new.supersedes_submission_id is not null and not exists(select 1 from public.submissions s
 where s.id=new.supersedes_submission_id and s.assignment_id=new.assignment_id and s.enrollment_id=new.enrollment_id and not s.is_current)
 then raise exception 'Invalid submission history'; end if;
 return new;
end $$;
create trigger submission_scope before insert or update on public.submissions for each row execute function private.validate_submission_scope();

-- Identity is read from Auth and the current roster, never from editable user metadata.
create function private.current_member() returns setof public.approved_members
language sql stable security definer set search_path='' as $$
 select r.* from public.approved_members r join auth.users u on lower(u.email)=r.email
 join public.people p on p.id=r.person_id and p.email=r.email
 where u.id=(select auth.uid()) and r.active and u.email_confirmed_at is not null
 and lower(u.email) ~ '^[^[:space:]@]+@ucdavis[.]edu$'
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.current_member() where role='admin')
$$;
create function private.my_person_id() returns uuid language sql stable security definer set search_path='' as $$
 select person_id from private.current_member() limit 1
$$;
create function private.can_learn(p_cohort uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cohort_enrollments e join public.program_cohorts c on c.id=e.cohort_id
 where e.person_id=private.my_person_id() and e.cohort_id=p_cohort and e.participation_status='enrolled' and c.state='active')
$$;
create function public.sync_profile() returns setof public.profiles language plpgsql security definer set search_path='' as $$
declare r public.approved_members%rowtype;
begin
 select * into r from private.current_member();
 if r.id is null then raise exception using errcode='42501',message='Access denied'; end if;
 insert into public.profiles(id,person_id,email,full_name,role) values(auth.uid(),r.person_id,r.email,r.full_name,r.role)
 on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,role=excluded.role
 where profiles.person_id=excluded.person_id;
 if not found then raise exception 'Profile identity conflict'; end if;
 return query select * from public.profiles where id=auth.uid();
end $$;
create function public.week_catalog(p_cohort_id uuid)
returns table(id uuid,cohort_id uuid,week_number smallint,title text,published boolean)
language sql stable security definer set search_path='' as $$
 select w.id,w.cohort_id,w.week_number,w.title,w.published from public.program_weeks w
 where w.cohort_id=p_cohort_id and (private.is_admin() or private.can_learn(p_cohort_id)) order by w.week_number
$$;

alter table public.profiles enable row level security;
alter table public.program_weeks enable row level security;
alter table public.resources enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
revoke all on public.profiles,public.program_weeks,public.resources,public.assignments,public.submissions from public,anon,authenticated;
grant select on public.people,public.approved_members,public.program_cohorts,public.cohort_enrollments,
 public.profiles,public.program_weeks,public.resources,public.assignments,public.submissions to authenticated;
create policy people_read on public.people for select to authenticated using (private.is_admin() or id=private.my_person_id());
create policy roster_read on public.approved_members for select to authenticated using (private.is_admin() or person_id=private.my_person_id());
create policy cohorts_read on public.program_cohorts for select to authenticated using (private.is_admin() or private.can_learn(id));
create policy enrollments_read on public.cohort_enrollments for select to authenticated using (private.is_admin() or person_id=private.my_person_id());
create policy profiles_read on public.profiles for select to authenticated using (private.is_admin() or person_id=private.my_person_id());
create policy weeks_read on public.program_weeks for select to authenticated using (private.is_admin() or published and private.can_learn(cohort_id));
create policy resources_read on public.resources for select to authenticated using (exists(select 1 from public.program_weeks w where w.id=week_id));
create policy assignments_read on public.assignments for select to authenticated using (exists(select 1 from public.program_weeks w where w.id=week_id));
create policy submissions_read on public.submissions for select to authenticated using (private.is_admin() or exists(select 1 from public.cohort_enrollments e where e.id=enrollment_id and e.person_id=private.my_person_id()));

create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger weeks_updated before update on public.program_weeks for each row execute function private.touch_updated_at();
create trigger resources_updated before update on public.resources for each row execute function private.touch_updated_at();
create trigger assignments_updated before update on public.assignments for each row execute function private.touch_updated_at();
create trigger submissions_updated before update on public.submissions for each row execute function private.touch_updated_at();

revoke all on function private.current_member(),private.is_admin(),private.my_person_id(),private.can_learn(uuid),private.validate_submission_scope(),public.sync_profile(),public.week_catalog(uuid) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_member(),private.is_admin(),private.my_person_id(),private.can_learn(uuid),public.sync_profile(),public.week_catalog(uuid) to authenticated;
commit;
