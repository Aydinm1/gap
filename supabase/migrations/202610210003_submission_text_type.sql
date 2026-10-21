-- Commit the enum addition before constraints/functions use the new value.
alter type public.submission_type add value if not exists 'text';
