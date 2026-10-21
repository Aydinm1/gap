begin;
alter table public.submissions add column submitted_text text;
alter table public.submissions drop constraint submissions_check;
alter table public.submissions drop constraint submission_file_metadata;
alter table public.submissions add constraint submission_payload check (
 (submission_type='link' and submitted_url is not null and submitted_url ~ '^https?://[^[:space:]]+$'
  and submitted_text is null and file_path is null and original_filename is null and file_size is null and mime_type is null)
 or (submission_type='file' and file_path is not null and original_filename is not null
  and file_size is not null and file_size between 1 and 20971520 and mime_type is not null
  and submitted_url is null and submitted_text is null)
 or (submission_type='text' and submitted_text is not null and char_length(submitted_text) between 1 and 20000
  and submitted_text ~ ('[^[:space:]' || chr(160) || chr(65279) || ']')
  and submitted_url is null and file_path is null and original_filename is null and file_size is null and mime_type is null)
);

create function public.submit_text(p_assignment_id uuid, p_text text,
 p_expected_id uuid default null, p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.cohort_enrollments%rowtype; s public.submissions%rowtype; result uuid;
begin
 if private.my_person_id() is null then raise exception using errcode='42501',message='Access denied'; end if;
 if p_text is null or char_length(p_text) not between 1 and 20000
  or p_text !~ ('[^[:space:]' || chr(160) || chr(65279) || ']') then raise exception 'Enter a response of up to 20000 characters'; end if;
 select en.* into e from public.cohort_enrollments en join public.program_weeks w on w.cohort_id=en.cohort_id
 join public.assignments a on a.week_id=w.id where a.id=p_assignment_id and w.published
 and en.person_id=private.my_person_id() and private.can_learn(en.cohort_id) and en.participation_status='enrolled' for update of en;
 if e.id is null then raise exception using errcode='42501',message='Assignment unavailable'; end if;
 select * into s from public.submissions where assignment_id=p_assignment_id and enrollment_id=e.id and is_current for update;
 if s.id is distinct from p_expected_id or s.updated_at is distinct from p_expected_updated_at then
  raise exception using errcode='40001',message='This submission changed. Refresh before submitting again'; end if;
 if s.status='completed' then raise exception 'Completed submissions cannot be replaced'; end if;
 update public.submissions set is_current=false where id=s.id;
 insert into public.submissions(assignment_id,enrollment_id,submission_type,submitted_text,supersedes_submission_id)
 values(p_assignment_id,e.id,'text',p_text,s.id) returning id into result;
 return result;
end $$;
revoke all on function public.submit_text(uuid,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.submit_text(uuid,text,uuid,timestamptz) to authenticated;
commit;
