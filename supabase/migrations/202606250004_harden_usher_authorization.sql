begin;

-- Archived objects are retained only for controlled administrator recovery.
-- They must not be reachable through PostgREST by anonymous or authenticated users.
do $$
declare
  policy_row record;
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
end;
$$;

revoke all privileges on table public.legacy_profiles from public, anon, authenticated;
revoke all privileges on table public.legacy_people from public, anon, authenticated;
revoke all privileges on table public.legacy_services from public, anon, authenticated;
revoke all privileges on table public.legacy_attendance_records from public, anon, authenticated;
revoke all privileges on table public.legacy_follow_ups from public, anon, authenticated;
revoke all privileges on table public.legacy_audit_logs from public, anon, authenticated;
revoke all privileges on table public.legacy_service_attendance_summary from public, anon, authenticated;

-- Legacy helper functions are not part of the supported application API.
revoke execute on function public.legacy_current_user_role() from public, anon, authenticated;
revoke execute on function public.legacy_is_admin() from public, anon, authenticated;
revoke execute on function public.legacy_is_staff() from public, anon, authenticated;
revoke execute on function public.legacy_handle_new_user() from public, anon, authenticated;
revoke execute on function public.legacy_set_updated_at() from public, anon, authenticated;

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
