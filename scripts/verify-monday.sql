\set ON_ERROR_STOP on
begin;
do $$
declare actor uuid=gen_random_uuid(); person uuid=gen_random_uuid(); cohort uuid=gen_random_uuid();
 batch jsonb; row jsonb; result jsonb; batch_id uuid;
begin
 insert into auth.users(id,email,email_confirmed_at) values(actor,actor::text||'@ucdavis.edu',now());
 insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at)
 values(actor::text,actor,jsonb_build_object('sub',actor::text),'google',now(),now());
 insert into public.people(id,email,full_name) values(person,actor::text||'@ucdavis.edu','Import fixture');
 insert into public.approved_members(person_id,email,full_name,role) values(person,actor::text||'@ucdavis.edu','Import fixture','admin');
 insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values(cohort,'fall',2998,'2998-09-01','2998-12-01','draft');
 row=jsonb_build_object('id','fixture-item','name','Fixture Member','email',gen_random_uuid()::text||'@ucdavis.edu','cohortKey','fall','cohortLabel','Fall','status','Alumni','checked',true,'issue','');
 batch=public.monday_import(actor,'stage',null,jsonb_build_object('account','fixture','board','fixture','rows',jsonb_build_array(row)));
 batch_id=(batch->>'id')::uuid;
 batch=public.monday_import(actor,'map',batch_id,jsonb_build_object('fall',cohort));
 if batch->'rows'->0->>'eligibility'<>'ready' then raise exception 'Expected ready'; end if;
 result=public.monday_import(actor,'process',batch_id,row||'{"checked":false}'::jsonb);
 if result->>'status'<>'blocked' then raise exception 'Unchecked accepted'; end if;
 if exists(select 1 from public.people where email=row->>'email') then raise exception 'Partial enrollment'; end if;
 result=public.monday_import(actor,'process',batch_id,row);
 if result->>'status'<>'enrolled' then raise exception 'Enrollment failed: %',result; end if;
 if public.monday_import(actor,'process',batch_id,row)<>result then raise exception 'Retry changed receipt'; end if;
 if (select count(*) from public.cohort_enrollments where cohort_id=cohort)<>1 then raise exception 'Duplicate enrollment'; end if;
 begin
   perform public.monday_import(gen_random_uuid(),'get',batch_id);
   raise exception 'Unauthorized caller accepted';
 exception when insufficient_privilege then null; end;
 update public.approved_members set active=false where person_id=person;
 begin
   perform public.monday_import(actor,'get',batch_id);
   raise exception 'Inactive caller accepted';
 exception when insufficient_privilege then null; end;
 update public.approved_members set active=true where person_id=person;
 update private.monday_import_batches set expires_at=now()-interval '1 minute' where id=batch_id;
 begin
   perform public.monday_import(actor,'get',batch_id);
   raise exception 'Expired preview accepted';
 exception when invalid_parameter_value then null; end;
 if has_function_privilege('authenticated','public.monday_import(uuid,text,uuid,jsonb)','execute') then raise exception 'Browser RPC grant'; end if;
 if has_table_privilege('authenticated','private.monday_import_batches','select') then raise exception 'Batch read grant'; end if;
 raise notice 'Monday staging, mapping, changed approval, rollback, enrollment, retry, authorization and expiry checks passed';
end $$;
rollback;
