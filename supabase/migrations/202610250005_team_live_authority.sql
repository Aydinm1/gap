begin;
-- Recheck after acquiring the gate: a request that waited behind a role change must
-- not keep authority that was observed before that change committed.
alter function public.manage_team(text,jsonb) set schema private;
alter function private.manage_team(text,jsonb) rename to manage_team_impl;
revoke all on function private.manage_team_impl(text,jsonb) from public,anon,authenticated,service_role;
create function public.manage_team(p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 if not private.is_admin() then raise exception using errcode='42501',message='Admin required'; end if;
 return private.manage_team_impl(p_action,p_data);
end $$;
revoke all on function public.manage_team(text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_team(text,jsonb) to authenticated;
alter function public.file_upload(uuid,text,uuid,jsonb) set schema private;
alter function private.file_upload(uuid,text,uuid,jsonb) rename to team_file_upload_impl;
revoke all on function private.team_file_upload_impl(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.file_upload(p_actor uuid,p_action text,p_intent uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.submission_gate();
 -- The implementation sets the trusted actor claims and checks live access after
 -- this gate. Browser roles cannot execute either privileged implementation.
 return private.team_file_upload_impl(p_actor,p_action,p_intent,p_data);
end $$;
revoke all on function public.file_upload(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.file_upload(uuid,text,uuid,jsonb) to service_role;
commit;
