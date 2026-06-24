begin;

create or replace function public.current_profile_is_valid() returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.active = true and coalesce(to_timestamp(nullif(auth.jwt() ->> 'iat','')::bigint),now()) >= p.auth_not_before);
$$;
create or replace function public.current_org_id() returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select p.organization_id from public.user_profiles p where p.id = auth.uid() and p.active = true and coalesce(to_timestamp(nullif(auth.jwt() ->> 'iat','')::bigint),now()) >= p.auth_not_before limit 1;
$$;
create or replace function public.current_app_role() returns public.app_role language sql stable security definer set search_path = public, pg_temp as $$
  select p.role from public.user_profiles p where p.id = auth.uid() and p.active = true and coalesce(to_timestamp(nullif(auth.jwt() ->> 'iat','')::bigint),now()) >= p.auth_not_before limit 1;
$$;
create or replace function public.has_aal2() returns boolean language sql stable set search_path = public, pg_temp as $$ select coalesce(auth.jwt() ->> 'aal','aal1') = 'aal2'; $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select public.current_app_role() = 'administrator'::public.app_role; $$;
create or replace function public.is_usher() returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select public.current_app_role() = 'usher'::public.app_role; $$;
create or replace function public.is_auditor() returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select public.current_app_role() = 'auditor'::public.app_role; $$;
create or replace function public.service_is_authorized(p_service_id uuid) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.services s join public.organization_settings settings on settings.organization_id=s.organization_id
    where s.id=p_service_id and s.organization_id=public.current_org_id() and s.active=true
      and (public.is_admin() or public.is_auditor() or (public.is_usher() and (settings.require_service_assignment=false or exists (
        select 1 from public.service_assignments assignment where assignment.service_id=s.id and assignment.user_id=auth.uid() and assignment.organization_id=s.organization_id
      ))))
  );
$$;

revoke all on function public.current_profile_is_valid() from public;
revoke all on function public.current_org_id() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.has_aal2() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_usher() from public;
revoke all on function public.is_auditor() from public;
revoke all on function public.service_is_authorized(uuid) from public;
grant execute on function public.current_profile_is_valid() to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_aal2() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_usher() to authenticated;
grant execute on function public.is_auditor() to authenticated;
grant execute on function public.service_is_authorized(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.user_profiles enable row level security;
alter table public.organization_settings enable row level security;
alter table public.visitors enable row level security;
alter table public.services enable row level security;
alter table public.service_assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;
alter table public.retention_actions enable row level security;

drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own on public.organizations for select to authenticated using (id=public.current_org_id());
drop policy if exists profiles_select_self on public.user_profiles;
create policy profiles_select_self on public.user_profiles for select to authenticated using (id=auth.uid() and public.current_profile_is_valid());
drop policy if exists profiles_admin_select_org on public.user_profiles;
create policy profiles_admin_select_org on public.user_profiles for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists settings_admin_select on public.organization_settings;
create policy settings_admin_select on public.organization_settings for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists visitors_admin_select on public.visitors;
create policy visitors_admin_select on public.visitors for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists services_admin_select on public.services;
create policy services_admin_select on public.services for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists assignments_admin_select on public.service_assignments;
create policy assignments_admin_select on public.service_assignments for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists attendance_admin_select on public.attendance;
create policy attendance_admin_select on public.attendance for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists audit_admin_select on public.audit_logs;
create policy audit_admin_select on public.audit_logs for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());
drop policy if exists retention_admin_select on public.retention_actions;
create policy retention_admin_select on public.retention_actions for select to authenticated using (public.is_admin() and public.has_aal2() and organization_id=public.current_org_id());

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.organization_settings from anon, authenticated;
revoke all on table public.visitors from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.service_assignments from anon, authenticated;
revoke all on table public.attendance from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on table public.retention_actions from anon, authenticated;
grant select on public.organizations to authenticated;
grant select on public.user_profiles to authenticated;
grant select on public.organization_settings to authenticated;
grant select on public.services to authenticated;
grant select on public.service_assignments to authenticated;
grant select on public.attendance to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.retention_actions to authenticated;

commit;
