begin;
-- Enabling a guide is staged while unpublished, so recommendations can be configured
-- before publication checks. The first recommendation may arrive after research.
create function private.guard_guided_mode() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if new.workflow is distinct from old.workflow then
  if exists(select 1 from public.program_weeks where id=new.week_id and published) then raise exception using errcode='22023',message='Return the week to draft before changing its workflow'; end if;
  if exists(select 1 from private.guided_states where assignment_id=old.id) or exists(select 1 from public.submissions where assignment_id=old.id) or exists(select 1 from private.upload_intents where assignment_id=old.id) then raise exception using errcode='22023',message='Workflow is locked because work or upload history exists'; end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_guided_mode() from public,anon,authenticated,service_role;
create trigger guided_mode before update of workflow on public.assignments for each row execute function private.guard_guided_mode();

-- A trigger enforces immutable revealed recommendations, but permits missing setup
-- to be filled after a team has saved research. No supplied recommendations are invented.
create function private.guard_guided_recommendation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.guided_states where assignment_id=old.assignment_id and team_id=old.team_id) then raise exception using errcode='22023',message='Recommendation is locked because the team has started research'; end if;
 return new;
end $$;
revoke all on function private.guard_guided_recommendation() from public,anon,authenticated,service_role;
create trigger guided_recommendation_locked before update on private.guided_recommendations for each row execute function private.guard_guided_recommendation();
commit;
