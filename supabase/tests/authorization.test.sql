begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select ok(
  to_regclass('public.legacy_profiles') is null
  or not has_table_privilege('authenticated', 'public.legacy_profiles', 'SELECT'),
  'authenticated users cannot read legacy profiles'
);
select ok(
  to_regclass('public.legacy_people') is null
  or not has_table_privilege('authenticated', 'public.legacy_people', 'SELECT'),
  'authenticated users cannot read legacy people'
);
select ok(
  to_regclass('public.legacy_services') is null
  or not has_table_privilege('authenticated', 'public.legacy_services', 'SELECT'),
  'authenticated users cannot read legacy services'
);
select ok(
  to_regclass('public.legacy_attendance_records') is null
  or not has_table_privilege('authenticated', 'public.legacy_attendance_records', 'SELECT'),
  'authenticated users cannot read legacy attendance'
);
select ok(
  to_regclass('public.legacy_follow_ups') is null
  or not has_table_privilege('authenticated', 'public.legacy_follow_ups', 'SELECT'),
  'authenticated users cannot read legacy follow-ups'
);
select ok(
  to_regclass('public.legacy_audit_logs') is null
  or not has_table_privilege('authenticated', 'public.legacy_audit_logs', 'SELECT'),
  'authenticated users cannot read legacy audit logs'
);
select ok(
  to_regclass('public.legacy_service_attendance_summary') is null
  or not has_table_privilege('authenticated', 'public.legacy_service_attendance_summary', 'SELECT'),
  'authenticated users cannot read the legacy attendance view'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename like 'legacy\_%' escape '\'),
  0,
  'legacy tables have no API-facing RLS policies'
);

select ok(
  to_regprocedure('public.legacy_current_user_role()') is null
  or not has_function_privilege('authenticated', to_regprocedure('public.legacy_current_user_role()'), 'EXECUTE'),
  'authenticated users cannot execute legacy role helper'
);
select ok(
  to_regprocedure('public.legacy_is_admin()') is null
  or not has_function_privilege('authenticated', to_regprocedure('public.legacy_is_admin()'), 'EXECUTE'),
  'authenticated users cannot execute legacy admin helper'
);
select ok(
  to_regprocedure('public.legacy_is_staff()') is null
  or not has_function_privilege('authenticated', to_regprocedure('public.legacy_is_staff()'), 'EXECUTE'),
  'authenticated users cannot execute legacy staff helper'
);
select ok(
  not has_function_privilege('anon', 'public.current_app_role()', 'EXECUTE'),
  'anonymous users cannot execute role helper'
);
select ok(
  not has_function_privilege('anon', 'public.current_org_id()', 'EXECUTE'),
  'anonymous users cannot execute organization helper'
);
select ok(
  not has_function_privilege('anon', 'public.is_admin()', 'EXECUTE'),
  'anonymous users cannot execute admin helper'
);
select ok(
  not has_function_privilege('anon', 'public.is_usher()', 'EXECUTE'),
  'anonymous users cannot execute usher helper'
);

select ok(
  has_function_privilege('authenticated', 'public.available_services()', 'EXECUTE'),
  'authenticated staff can request authorized services'
);
select ok(
  has_function_privilege('authenticated', 'public.search_visitors(text,uuid)', 'EXECUTE'),
  'authenticated ushers can use controlled visitor search'
);
select ok(
  has_function_privilege('authenticated', 'public.check_in_visitor(uuid,uuid)', 'EXECUTE'),
  'authenticated ushers can use controlled check-in'
);

select * from finish();
rollback;
