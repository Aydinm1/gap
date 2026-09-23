begin;
alter table public.submissions drop constraint submission_file_metadata;
alter table public.submissions add constraint submission_file_metadata check
 ((submission_type='link' and file_size is null and mime_type is null) or
 (submission_type='file' and file_size is not null and file_size between 1 and 20971520 and mime_type is not null));

drop function public.cleanup_uploads(uuid,boolean);
-- Optional owner scope makes isolated test cleanup incapable of claiming real uploads.
create function public.cleanup_uploads(p_id uuid default null,p_failed boolean default false,p_owner uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if p_id is not null then
   update private.upload_intents set cleanup_error=p_failed where id=p_id and state='abandoned'
   and (p_owner is null or owner_id=p_owner);
   return '{}'::jsonb;
 end if;
 with candidates as (
 select id from private.upload_intents where (state='abandoned' or state='pending' and expires_at<=clock_timestamp())
 and (p_owner is null or owner_id=p_owner)
 and (cleanup_at is null or cleanup_at<clock_timestamp()-interval '5 minutes')
 order by cleanup_at nulls first limit 100 for update skip locked
 ), claimed as (
 update private.upload_intents i set state='abandoned',cleanup_at=clock_timestamp(),cleanup_error=true
 from candidates c where i.id=c.id returning i.id,i.path
 ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into result from claimed;
 return result;
end $$;
revoke all on function public.cleanup_uploads(uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.cleanup_uploads(uuid,boolean,uuid) to service_role;
commit;
