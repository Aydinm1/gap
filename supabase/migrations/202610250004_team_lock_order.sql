begin;
-- Roster/enrollment statement triggers already take the provisioning gate. Always
-- acquire it first, including member saves, so live revocation and test-scope changes
-- cannot invert the shared submission gate's lock order.
create or replace function private.submission_gate() returns void language plpgsql volatile set search_path='' as $$
begin
 perform pg_advisory_xact_lock(180,20260914);
 perform pg_advisory_xact_lock(hashtextextended('gap-shared-submission-v1',0));
end $$;
commit;
