begin;

create table private.monday_application_links (
  id uuid primary key default gen_random_uuid(),
  account_id text not null check (account_id <> '' and account_id = btrim(account_id)),
  board_id text not null check (board_id <> '' and board_id = btrim(board_id)),
  item_id text not null check (item_id <> '' and item_id = btrim(item_id)),
  enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, board_id, item_id)
);
create index monday_links_enrollment_idx on private.monday_application_links(enrollment_id);
alter table private.monday_application_links enable row level security;
revoke all on private.monday_application_links from public, anon, authenticated, service_role;
grant select on private.monday_application_links to service_role;
create trigger monday_links_updated before update on private.monday_application_links
for each row execute function private.touch_updated_at();

-- Private SQL operation, NOT a public PostgREST RPC or a mock-admin action.
-- The trusted caller must verify admin authority or Monday approval before calling.
create function private.enroll_in_gap(
  p_email text,
  p_full_name text,
  p_cohort_id uuid,
  p_account_id text default null,
  p_board_id text default null,
  p_item_id text default null
) returns table (person_id uuid, enrollment_id uuid, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_name text := btrim(p_full_name);
  v_person public.people%rowtype;
  v_roster public.approved_members%rowtype;
  v_enrollment public.cohort_enrollments%rowtype;
  v_link private.monday_application_links%rowtype;
  v_created boolean := false;
begin
  if v_email is null or v_email !~ '^[^[:space:]@]+@ucdavis[.]edu$'
    or v_name is null or v_name = '' or p_cohort_id is null then
    raise exception using errcode = '22023', message = 'Valid UC Davis email, full name, and cohort are required';
  end if;
  if not ((p_account_id is null and p_board_id is null and p_item_id is null)
    or (p_account_id is not null and btrim(p_account_id) <> '' and p_account_id = btrim(p_account_id)
      and p_board_id is not null and btrim(p_board_id) <> '' and p_board_id = btrim(p_board_id)
      and p_item_id is not null and btrim(p_item_id) <> '' and p_item_id = btrim(p_item_id))) then
    raise exception using errcode = '22023', message = 'Supply all three Monday identifiers or none';
  end if;

  -- Low-volume cohort provisioning is serialized; constraints protect all other writers.
  -- Transaction-scoped: also released automatically on error/rollback.
  perform pg_catalog.pg_advisory_xact_lock(180, 20260914);
  perform 1 from public.program_cohorts where id = p_cohort_id for share;
  if not found then
    raise exception using errcode = '22023', message = 'Target cohort does not exist';
  end if;

  select * into v_link from private.monday_application_links
    where account_id = p_account_id and board_id = p_board_id and item_id = p_item_id;
  if found then
    select * into strict v_enrollment from public.cohort_enrollments where id = v_link.enrollment_id for update;
    select * into strict v_person from public.people where id = v_enrollment.person_id for update;
    if v_enrollment.cohort_id <> p_cohort_id or v_person.email <> v_email then
      raise exception using errcode = '22023', message = 'Monday application identity or cohort conflict; resolve manually';
    end if;
  else
    insert into public.people(email, full_name) values (v_email, v_name)
      on conflict (email) do nothing;
    select * into strict v_person from public.people where email = v_email for update;
  end if;

  insert into public.approved_members(person_id, email, full_name)
    values (v_person.id, v_person.email, v_person.full_name)
    on conflict on constraint approved_members_person_id_key do nothing;
  select * into strict v_roster from public.approved_members where approved_members.person_id = v_person.id for update;
  if not v_roster.active then
    raise exception using errcode = '22023', message = 'Access is inactive; a GAP administrator must reactivate it explicitly';
  end if;
  if v_roster.email <> v_person.email then
    raise exception using errcode = '22023', message = 'Roster identity conflict; resolve manually';
  end if;

  insert into public.cohort_enrollments(person_id, cohort_id)
    values (v_person.id, p_cohort_id) on conflict on constraint cohort_enrollments_cohort_id_person_id_key do nothing
    returning * into v_enrollment;
  v_created := found;
  if not v_created then
    select * into strict v_enrollment from public.cohort_enrollments
      where cohort_id = p_cohort_id and cohort_enrollments.person_id = v_person.id for update;
  end if;
  if p_account_id is not null and v_link.id is null then
    insert into private.monday_application_links(account_id, board_id, item_id, enrollment_id)
      values (p_account_id, p_board_id, p_item_id, v_enrollment.id);
  end if;
  return query select v_person.id, v_enrollment.id, v_created;
end;
$$;
revoke all on function private.enroll_in_gap(text, text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function private.enroll_in_gap(text, text, uuid, text, text, text) to service_role;

commit;
