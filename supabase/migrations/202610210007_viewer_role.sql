-- Commit the enum label before any migration uses it in expressions or functions.
alter type public.app_role add value 'viewer';
