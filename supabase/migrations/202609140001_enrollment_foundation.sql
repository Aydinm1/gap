-- Deliberately limited P5 foundation. Member policies and the rest of P5 follow later.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create type public.app_role as enum ('member', 'admin');
create type public.program_quarter as enum ('fall', 'winter', 'spring');
create type public.cohort_state as enum ('draft', 'active', 'archived');
create type public.participation_status as enum ('enrolled', 'completed', 'withdrew');
create type public.advancement_status as enum ('pending', 'promoted', 'not_promoted');
create type public.promotion_response as enum ('pending', 'joined', 'declined');

create table public.people (
  id uuid primary key default gen_random_uuid(),
  email text unique not null check (email = lower(btrim(email)) and email <> ''),
  full_name text not null check (btrim(full_name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.approved_members (
  id uuid primary key default gen_random_uuid(),
  person_id uuid unique not null references public.people(id) on delete restrict,
  email text unique not null check (email = lower(btrim(email)) and email <> ''),
  full_name text not null check (btrim(full_name) <> ''),
  role public.app_role not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.program_cohorts (
  id uuid primary key default gen_random_uuid(),
  quarter public.program_quarter not null,
  year smallint not null,
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  state public.cohort_state not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quarter, year)
);
create table public.cohort_enrollments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.program_cohorts(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,
  participation_status public.participation_status not null default 'enrolled',
  advancement_status public.advancement_status not null default 'pending',
  promotion_response public.promotion_response,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, person_id),
  check ((advancement_status = 'promoted' and promotion_response is not null)
    or (advancement_status <> 'promoted' and promotion_response is null))
);
create index cohort_enrollments_person_idx on public.cohort_enrollments(person_id);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

create trigger people_updated before update on public.people
for each row execute function private.touch_updated_at();
create trigger roster_updated before update on public.approved_members
for each row execute function private.touch_updated_at();
create trigger cohorts_updated before update on public.program_cohorts
for each row execute function private.touch_updated_at();
create trigger enrollments_updated before update on public.cohort_enrollments
for each row execute function private.touch_updated_at();

alter table public.people enable row level security;
alter table public.approved_members enable row level security;
alter table public.program_cohorts enable row level security;
alter table public.cohort_enrollments enable row level security;
revoke all on public.people, public.approved_members, public.program_cohorts,
  public.cohort_enrollments from public, anon, authenticated, service_role;
grant select, insert, update on public.people, public.approved_members,
  public.program_cohorts, public.cohort_enrollments to service_role;

commit;
