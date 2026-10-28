begin;

-- Credit is separate from submitted work: never invent a submission or copy files.
create table public.assignment_completions (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete restrict,
 enrollment_id uuid not null references public.cohort_enrollments(id) on delete restrict,
 granted_by uuid not null references public.people(id) on delete restrict,
 granted_at timestamptz not null default clock_timestamp(),
 revoked_by uuid references public.people(id) on delete restrict,
 revoked_at timestamptz,
 check ((revoked_at is null) = (revoked_by is null))
);
create unique index assignment_completions_current on public.assignment_completions(assignment_id,enrollment_id) where revoked_at is null;
alter table public.assignment_completions enable row level security;
revoke all on public.assignment_completions from anon,authenticated;
grant select on public.assignment_completions to authenticated;
create policy assignment_completions_read on public.assignment_completions for select to authenticated using (
 private.is_admin() or (not private.is_viewer() and revoked_at is null and exists (
  select 1 from public.cohort_enrollments e join public.program_weeks w on w.cohort_id=e.cohort_id
  join public.assignments a on a.week_id=w.id where e.id=enrollment_id and a.id=assignment_id
  and e.person_id=private.my_person_id() and private.can_learn(e.cohort_id) and w.published
 ))
);

create function public.set_assignment_completion(p_action text,p_assignment uuid,p_enrollment uuid,p_credit uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.assignments; e public.cohort_enrollments; credit public.assignment_completions; result uuid;
begin
 perform private.submission_gate();
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 if p_action is null or p_action not in ('grant','revoke') then raise exception using errcode='22023',message='Invalid completion action'; end if;
 select * into a from public.assignments where id=p_assignment for update;
 select * into e from public.cohort_enrollments where id=p_enrollment for update;
 if a.id is null or e.id is null or not exists (
  select 1 from public.program_weeks w join public.program_cohorts c on c.id=w.cohort_id
  where w.id=a.week_id and w.cohort_id=e.cohort_id
 ) then raise exception using errcode='22023',message='Choose an assignment and participant from the same cohort'; end if;

 if p_action='revoke' then
  select * into credit from public.assignment_completions where id=p_credit and assignment_id=a.id and enrollment_id=e.id for update;
  if credit.id is null then raise exception using errcode='40001',message='Completion changed. Refresh and retry'; end if;
  if credit.revoked_at is null then
   update public.assignment_completions set revoked_at=clock_timestamp(),revoked_by=private.my_person_id() where id=credit.id;
  end if;
  return credit.id;
 end if;

 if a.submission_mode<>'individual' or e.participation_status<>'enrolled' or not exists (
  select 1 from public.program_weeks w join public.program_cohorts c on c.id=w.cohort_id
  where w.id=a.week_id and w.published and c.state='active'
 ) or not exists(select 1 from public.approved_members r where r.person_id=e.person_id and r.active and r.role<>'viewer')
 then raise exception using errcode='22023',message='Manual completion requires a published individual assignment and an active enrolled participant'; end if;
 select * into credit from public.assignment_completions where assignment_id=a.id and enrollment_id=e.id and revoked_at is null;
 if credit.id is not null then return credit.id; end if;
 if exists(select 1 from public.submissions where assignment_id=a.id and enrollment_id=e.id and is_current)
 then raise exception using errcode='40001',message='Work was submitted. Refresh and review that submission instead'; end if;
 insert into public.assignment_completions(assignment_id,enrollment_id,granted_by)
 values(a.id,e.id,private.my_person_id()) returning id into result;
 return result;
end $$;
revoke all on function public.set_assignment_completion(text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.set_assignment_completion(text,uuid,uuid,uuid) to authenticated;

-- Serialize credits and every submission channel through the existing gate.
alter function private.resolve_submission_target(uuid) rename to resolve_submission_target_before_credit;
create function private.resolve_submission_target(p_assignment uuid) returns public.submission_targets
language plpgsql security definer set search_path='' as $$
declare target public.submission_targets;
begin
 target=private.resolve_submission_target_before_credit(p_assignment);
 if exists(select 1 from public.assignment_completions where assignment_id=target.assignment_id and enrollment_id=target.enrollment_id and revoked_at is null)
 then raise exception using errcode='42501',message='Your GAP lead has marked this assignment complete'; end if;
 return target;
end $$;
revoke all on function private.resolve_submission_target(uuid),private.resolve_submission_target_before_credit(uuid) from public,anon,authenticated,service_role;

create function private.guard_completion_credit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='assignments' then
  if new.submission_mode is distinct from old.submission_mode and exists(select 1 from public.assignment_completions where assignment_id=old.id)
  then raise exception using errcode='22023',message='Assignments with completion history must remain individual'; end if;
 else
  if exists(select 1 from public.assignment_completions where assignment_id=new.assignment_id and enrollment_id=new.enrollment_id and revoked_at is null)
  then raise exception using errcode='42501',message='Your GAP lead has marked this assignment complete'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_completion_credit() from public,anon,authenticated,service_role;
create trigger completion_credit_submission before insert on public.submissions for each row execute function private.guard_completion_credit();
create trigger completion_credit_mode before update of submission_mode on public.assignments for each row execute function private.guard_completion_credit();
commit;
