begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'user_profiles', 'user_profiles table exists');
select has_table('public', 'visitors', 'visitors table exists');
select has_table('public', 'services', 'services table exists');
select has_table('public', 'attendance', 'attendance table exists');
select has_table('public', 'audit_logs', 'audit_logs table exists');
select has_table('public', 'retention_actions', 'retention_actions table exists');
select has_table('public', 'service_assignments', 'service_assignments table exists');

select has_function('public', 'register_visitor_and_check_in', array['text','text','date','text','boolean','uuid'], 'registration transaction function exists');
select has_function('public', 'check_in_visitor', array['uuid','uuid'], 'check-in function exists');
select has_function('public', 'set_user_role', array['uuid','app_role'], 'role-change function exists');
select has_function('public', 'apply_visitor_retention', array['text'], 'retention function exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.visitors'::regclass),
  'RLS is enabled on visitors'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.attendance'::regclass),
  'RLS is enabled on attendance'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'attendance_single_checkin'
      and conrelid = 'public.attendance'::regclass
  ),
  'duplicate attendance constraint exists'
);

select * from finish();
rollback;
