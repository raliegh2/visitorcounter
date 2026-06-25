begin;

-- Archived objects are retained only for controlled administrator recovery.
-- They must not be reachable through PostgREST by anonymous or authenticated users.
do $$
declare
  policy_row record;
  object_name text;
  function_name text;
begin
  for policy_row in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename like 'legacy\_%' escape '\'
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  end loop;

  foreach object_name in array array[
    'legacy_profiles',
    'legacy_people',
    'legacy_services',
    'legacy_attendance_records',
    'legacy_follow_ups',
    'legacy_audit_logs',
    'legacy_service_attendance_summary'
  ]
  loop
    if to_regclass(format('public.%I', object_name)) is not null then
      execute format(
        'revoke all privileges on table public.%I from public, anon, authenticated',
        object_name
      );
    end if;
  end loop;

  foreach function_name in array array[
    'legacy_current_user_role()',
    'legacy_is_admin()',
    'legacy_is_staff()',
    'legacy_handle_new_user()',
    'legacy_set_updated_at()'
  ]
  loop
    if to_regprocedure('public.' || function_name) is not null then
      execute format(
        'revoke execute on function public.%s from public, anon, authenticated',
        function_name
      );
    end if;
  end loop;
end;
$$;

-- Trigger-only functions must not be callable through the API.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.initialize_organization_settings() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Authorization helpers are for authenticated sessions and internal policy checks only.
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.current_org_id() from public, anon;
revoke execute on function public.current_profile_is_valid() from public, anon;
revoke execute on function public.has_aal2() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_auditor() from public, anon;
revoke execute on function public.is_usher() from public, anon;
revoke execute on function public.service_is_authorized(uuid) from public, anon;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_profile_is_valid() to authenticated;
grant execute on function public.has_aal2() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_auditor() to authenticated;
grant execute on function public.is_usher() to authenticated;
grant execute on function public.service_is_authorized(uuid) to authenticated;

commit;
