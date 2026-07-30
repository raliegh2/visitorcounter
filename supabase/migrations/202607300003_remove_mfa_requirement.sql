-- The application no longer offers or enforces authenticator-app MFA.
-- Keep this helper for compatibility with existing policies and RPCs while
-- making authorization depend on the user's approved role and organization.
create or replace function public.has_aal2()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select true;
$$;

comment on function public.has_aal2() is
  'Compatibility helper. Authenticator assurance level is no longer required by this application.';
