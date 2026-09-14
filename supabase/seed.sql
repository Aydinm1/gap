-- Fictional local-development data only. No Auth users or credentials are seeded.
insert into public.program_cohorts(id,quarter,year,starts_on,ends_on,state) values
 ('10000000-0000-4000-8000-000000000001','fall',2026,'2026-09-01','2026-12-15','active'),
 ('10000000-0000-4000-8000-000000000002','spring',2026,'2026-03-01','2026-06-15','archived') on conflict do nothing;
insert into public.people(id,email,full_name) values
 ('20000000-0000-4000-8000-000000000001','gap.test.admin@ucdavis.edu','Taylor Lead'),
 ('20000000-0000-4000-8000-000000000002','gap.test.member@ucdavis.edu','Alex Analyst'),
 ('20000000-0000-4000-8000-000000000003','gap.test.other@ucdavis.edu','Jordan Analyst') on conflict do nothing;
insert into public.approved_members(person_id,email,full_name,role)
 select id,email,full_name,case when email='gap.test.admin@ucdavis.edu' then 'admin'::public.app_role else 'member'::public.app_role end from public.people
 where id in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003') on conflict do nothing;
insert into public.cohort_enrollments(person_id,cohort_id)
 select p.id,c.id from public.people p cross join public.program_cohorts c
 where p.email in ('gap.test.admin@ucdavis.edu','gap.test.member@ucdavis.edu','gap.test.other@ucdavis.edu')
 and c.id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002') on conflict do nothing;
insert into public.program_weeks(cohort_id,week_number,title,description,published)
 select c.id,n,titles[n],'Practice the core skills of consulting through a focused workshop and assignment.',n<=2 from public.program_cohorts c
 cross join generate_series(1,6) n cross join (select array['Consulting Fundamentals','Research & Problem Solving','Client Communication','Data & Insights','Building Recommendations','Final Case'] titles) t
 where c.id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002') on conflict do nothing;
insert into public.assignments(week_id,title,instructions,due_at)
 select id,case when week_number=1 then 'Consulting foundations' else 'Build an issue tree' end,
 'Define the problem, separate the issue areas, and cite a source for sizing each branch. Submit a link the review team can open.',
 case when week_number=1 then '2026-09-10T23:59:00-07:00'::timestamptz else '2026-09-20T23:59:00-07:00'::timestamptz end
 from public.program_weeks where cohort_id='10000000-0000-4000-8000-000000000001' and week_number<=2 on conflict do nothing;
insert into public.submissions(assignment_id,enrollment_id,submission_type,submitted_url,status,feedback)
 select a.id,e.id,'link','https://example.com/gap-sample',
 case when w.week_number=1 then 'completed'::public.submission_status when p.email='gap.test.member@ucdavis.edu' then 'revision_requested'::public.submission_status else 'submitted'::public.submission_status end,
 case when w.week_number=2 and p.email='gap.test.member@ucdavis.edu' then 'Make the issue areas mutually exclusive and add a source for sizing each branch.' else null end
 from public.assignments a join public.program_weeks w on w.id=a.week_id join public.cohort_enrollments e on e.cohort_id=w.cohort_id join public.people p on p.id=e.person_id
 where p.email in ('gap.test.member@ucdavis.edu','gap.test.other@ucdavis.edu') on conflict do nothing;
