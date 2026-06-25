begin;

create or replace function public._write_audit(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_outcome text,
  p_safe_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_metadata jsonb;
begin
  if v_org_id is null then
    raise exception 'authorization denied';
  end if;

  v_metadata := jsonb_strip_nulls(
    coalesce(p_safe_metadata, '{}'::jsonb)
      - array[
          'full_name',
          'preferred_name',
          'optional_contact',
          'email',
          'password',
          'token',
          'access_token',
          'refresh_token',
          'secret'
        ]
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    resource_type,
    resource_id,
    outcome,
    safe_metadata
  )
  values (
    v_org_id,
    auth.uid(),
    upper(left(p_action, 80)),
    lower(left(p_resource_type, 80)),
    p_resource_id,
    case when p_outcome in ('success', 'denied', 'failure') then p_outcome else 'failure' end,
    v_metadata
  );
end;
$$;

revoke all on function public._write_audit(text, text, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.record_admin_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_outcome text,
  p_safe_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  perform public._write_audit(
    p_action,
    p_resource_type,
    p_resource_id,
    p_outcome,
    p_safe_metadata
  );
end;
$$;

create or replace function public.available_services()
returns table (
  id uuid,
  service_name text,
  service_date date,
  start_time time,
  active boolean,
  assigned boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    s.service_name,
    s.service_date,
    s.start_time,
    s.active,
    case
      when public.is_admin() or public.is_auditor() then true
      else exists (
        select 1
        from public.service_assignments a
        where a.service_id = s.id
          and a.user_id = auth.uid()
      )
    end as assigned
  from public.services s
  where s.organization_id = public.current_org_id()
    and s.active = true
    and (
      public.is_admin()
      or public.is_auditor()
      or public.service_is_authorized(s.id)
    )
  order by s.service_date desc, s.start_time desc;
$$;

create or replace function public.search_visitors(
  p_query text,
  p_service_id uuid
)
returns table (
  id uuid,
  full_name text,
  preferred_name text,
  first_visit_date date,
  last_seen_date date,
  already_checked_in boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text;
begin
  if not (public.is_admin() or public.is_usher()) then
    perform public._write_audit('VISITOR_SEARCH_DENIED', 'visitor', null, 'denied', '{}'::jsonb);
    raise exception 'authorization denied';
  end if;

  if not public.service_is_authorized(p_service_id) then
    perform public._write_audit(
      'VISITOR_SEARCH_DENIED',
      'service',
      p_service_id,
      'denied',
      jsonb_build_object('reason', 'service_not_authorized')
    );
    raise exception 'service not authorized';
  end if;

  v_query := left(btrim(coalesce(p_query, '')), 100);
  if char_length(v_query) < 1 then
    return;
  end if;

  return query
  select
    v.id,
    v.full_name,
    v.preferred_name,
    v.first_visit_date,
    (
      select max(s.service_date)
      from public.attendance a
      join public.services s on s.id = a.service_id
      where a.visitor_id = v.id
        and a.organization_id = v.organization_id
        and a.voided_at is null
    ) as last_seen_date,
    exists (
      select 1
      from public.attendance a
      where a.visitor_id = v.id
        and a.service_id = p_service_id
        and a.organization_id = v.organization_id
        and a.voided_at is null
    ) as already_checked_in
  from public.visitors v
  where v.organization_id = public.current_org_id()
    and v.active = true
    and v.anonymized_at is null
    and (
      v.full_name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(v.preferred_name, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
    )
  order by v.full_name, v.first_visit_date desc
  limit 25;
end;
$$;

create or replace function public.register_visitor_and_check_in(
  p_full_name text,
  p_preferred_name text,
  p_first_visit_date date,
  p_optional_contact text,
  p_contact_consent boolean,
  p_service_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_service_date date;
  v_visitor_id uuid;
  v_attendance_id uuid;
  v_contact text := nullif(btrim(coalesce(p_optional_contact, '')), '');
begin
  if not (public.is_admin() or public.is_usher()) then
    raise exception 'authorization denied';
  end if;
  if not public.service_is_authorized(p_service_id) then
    raise exception 'service not authorized';
  end if;
  if char_length(btrim(coalesce(p_full_name, ''))) not between 2 and 100 then
    raise exception 'invalid name';
  end if;
  if p_preferred_name is not null and char_length(btrim(p_preferred_name)) > 60 then
    raise exception 'invalid preferred name';
  end if;
  if v_contact is not null and p_contact_consent is not true then
    raise exception 'contact consent required';
  end if;
  if v_contact is not null and char_length(v_contact) > 120 then
    raise exception 'invalid contact';
  end if;

  select s.service_date
  into v_service_date
  from public.services s
  where s.id = p_service_id
    and s.organization_id = v_org_id
    and s.active = true;

  if v_service_date is null or p_first_visit_date <> v_service_date then
    raise exception 'first visit date must match selected service';
  end if;

  insert into public.visitors (
    organization_id,
    full_name,
    preferred_name,
    first_visit_date,
    optional_contact,
    contact_consent,
    created_by
  )
  values (
    v_org_id,
    btrim(p_full_name),
    nullif(btrim(coalesce(p_preferred_name, '')), ''),
    p_first_visit_date,
    v_contact,
    case when v_contact is null then false else p_contact_consent end,
    auth.uid()
  )
  returning id into v_visitor_id;

  insert into public.attendance (
    organization_id,
    visitor_id,
    service_id,
    checked_in_by
  )
  values (
    v_org_id,
    v_visitor_id,
    p_service_id,
    auth.uid()
  )
  returning id into v_attendance_id;

  perform public._write_audit(
    'VISITOR_CREATED',
    'visitor',
    v_visitor_id,
    'success',
    jsonb_build_object('service_id', p_service_id, 'contact_stored', v_contact is not null)
  );
  perform public._write_audit(
    'ATTENDANCE_CREATED',
    'attendance',
    v_attendance_id,
    'success',
    jsonb_build_object('service_id', p_service_id, 'visitor_id', v_visitor_id)
  );

  return v_visitor_id;
end;
$$;

create or replace function public.check_in_visitor(
  p_visitor_id uuid,
  p_service_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_attendance_id uuid;
  v_existing public.attendance%rowtype;
begin
  if not (public.is_admin() or public.is_usher()) then
    raise exception 'authorization denied';
  end if;
  if not public.service_is_authorized(p_service_id) then
    raise exception 'service not authorized';
  end if;
  if not exists (
    select 1 from public.visitors v
    where v.id = p_visitor_id
      and v.organization_id = v_org_id
      and v.active = true
      and v.anonymized_at is null
  ) then
    raise exception 'visitor unavailable';
  end if;

  select *
  into v_existing
  from public.attendance a
  where a.organization_id = v_org_id
    and a.visitor_id = p_visitor_id
    and a.service_id = p_service_id
  for update;

  if found and v_existing.voided_at is null then
    perform public._write_audit(
      'ATTENDANCE_DUPLICATE_BLOCKED',
      'attendance',
      v_existing.id,
      'denied',
      jsonb_build_object('service_id', p_service_id, 'visitor_id', p_visitor_id)
    );
    raise exception 'duplicate attendance';
  elsif found then
    update public.attendance
    set checked_in_at = now(),
        checked_in_by = auth.uid(),
        voided_at = null,
        voided_by = null,
        void_reason = null
    where id = v_existing.id
    returning id into v_attendance_id;
  else
    insert into public.attendance (
      organization_id,
      visitor_id,
      service_id,
      checked_in_by
    )
    values (
      v_org_id,
      p_visitor_id,
      p_service_id,
      auth.uid()
    )
    returning id into v_attendance_id;
  end if;

  perform public._write_audit(
    'ATTENDANCE_CREATED',
    'attendance',
    v_attendance_id,
    'success',
    jsonb_build_object('service_id', p_service_id, 'visitor_id', p_visitor_id)
  );

  return v_attendance_id;
end;
$$;

create or replace function public.current_attendance(
  p_service_id uuid
)
returns table (
  attendance_id uuid,
  visitor_id uuid,
  display_name text,
  visitor_type text,
  checked_in_at timestamptz,
  checked_in_by_name text,
  voided_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_admin() or public.is_usher()) then
    raise exception 'authorization denied';
  end if;
  if not public.service_is_authorized(p_service_id) then
    raise exception 'service not authorized';
  end if;

  return query
  select
    a.id,
    v.id,
    coalesce(nullif(v.preferred_name, ''), v.full_name),
    case when v.first_visit_date = s.service_date then 'first-time' else 'returning' end,
    a.checked_in_at,
    p.display_name,
    a.voided_at
  from public.attendance a
  join public.visitors v on v.id = a.visitor_id
  join public.services s on s.id = a.service_id
  join public.user_profiles p on p.id = a.checked_in_by
  where a.organization_id = public.current_org_id()
    and a.service_id = p_service_id
    and a.voided_at is null
  order by a.checked_in_at desc;
end;
$$;

create or replace function public.dashboard_metrics(
  p_service_id uuid
)
returns table (
  attending bigint,
  first_time bigint,
  "returning" bigint,
  visitor_records bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.service_is_authorized(p_service_id) then
    raise exception 'service not authorized';
  end if;

  return query
  select
    count(a.id) filter (where a.voided_at is null),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date = s.service_date),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date <> s.service_date),
    (select count(*) from public.visitors active_v
      where active_v.organization_id = public.current_org_id()
        and active_v.active = true
        and active_v.anonymized_at is null)
  from public.services s
  left join public.attendance a
    on a.service_id = s.id
    and a.organization_id = s.organization_id
  left join public.visitors v on v.id = a.visitor_id
  where s.id = p_service_id
    and s.organization_id = public.current_org_id()
  group by s.id;
end;
$$;

create or replace function public.create_service(
  p_service_name text,
  p_service_date date,
  p_start_time time
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  if char_length(btrim(coalesce(p_service_name, ''))) not between 2 and 100 then
    raise exception 'invalid service name';
  end if;

  insert into public.services (
    organization_id,
    service_name,
    service_date,
    start_time,
    created_by
  )
  values (
    public.current_org_id(),
    btrim(p_service_name),
    p_service_date,
    p_start_time,
    auth.uid()
  )
  returning id into v_id;

  perform public._write_audit(
    'SERVICE_CREATED',
    'service',
    v_id,
    'success',
    jsonb_build_object('service_date', p_service_date)
  );
  return v_id;
end;
$$;

create or replace function public.set_service_assignment(
  p_service_id uuid,
  p_user_id uuid,
  p_assigned boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;

  if not exists (
    select 1 from public.services s
    where s.id = p_service_id and s.organization_id = v_org_id
  ) or not exists (
    select 1 from public.user_profiles p
    where p.id = p_user_id
      and p.organization_id = v_org_id
      and p.role = 'usher'
      and p.active = true
  ) then
    raise exception 'invalid assignment';
  end if;

  if p_assigned then
    insert into public.service_assignments (
      organization_id,
      service_id,
      user_id,
      assigned_by
    )
    values (v_org_id, p_service_id, p_user_id, auth.uid())
    on conflict (service_id, user_id) do nothing;
  else
    delete from public.service_assignments
    where organization_id = v_org_id
      and service_id = p_service_id
      and user_id = p_user_id;
  end if;

  perform public._write_audit(
    'SERVICE_ASSIGNMENT_CHANGED',
    'service',
    p_service_id,
    'success',
    jsonb_build_object('user_id', p_user_id, 'assigned', p_assigned)
  );
end;
$$;

create or replace function public.attendance_summary(
  p_from date,
  p_to date
)
returns table (
  service_id uuid,
  service_name text,
  service_date date,
  total_attendance bigint,
  first_time_visitors bigint,
  returning_visitors bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_admin() or public.is_auditor()) then
    raise exception 'authorization denied';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'invalid report period';
  end if;

  return query
  select
    s.id,
    s.service_name,
    s.service_date,
    count(a.id) filter (where a.voided_at is null),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date = s.service_date),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date <> s.service_date)
  from public.services s
  left join public.attendance a
    on a.service_id = s.id
    and a.organization_id = s.organization_id
  left join public.visitors v on v.id = a.visitor_id
  where s.organization_id = public.current_org_id()
    and s.service_date between p_from and p_to
  group by s.id, s.service_name, s.service_date
  order by s.service_date desc, s.start_time desc;
end;
$$;

create or replace function public.export_attendance(
  p_from date,
  p_to date
)
returns table (
  service_date date,
  service_name text,
  visitor_record_id uuid,
  full_name text,
  preferred_name text,
  optional_contact text,
  checked_in_at timestamptz,
  visitor_type text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() or not public.has_aal2() then
    perform public._write_audit(
      'ATTENDANCE_EXPORT_DENIED',
      'export',
      null,
      'denied',
      jsonb_build_object('from', p_from, 'to', p_to)
    );
    raise exception 'authorization denied';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'invalid export period';
  end if;

  perform public._write_audit(
    'ATTENDANCE_EXPORTED',
    'export',
    gen_random_uuid(),
    'success',
    jsonb_build_object('from', p_from, 'to', p_to)
  );

  return query
  select
    s.service_date,
    s.service_name,
    v.id,
    v.full_name,
    v.preferred_name,
    case when v.contact_consent then v.optional_contact else null end,
    a.checked_in_at,
    case when v.first_visit_date = s.service_date then 'first-time' else 'returning' end
  from public.attendance a
  join public.services s on s.id = a.service_id
  join public.visitors v on v.id = a.visitor_id
  where a.organization_id = public.current_org_id()
    and a.voided_at is null
    and s.service_date between p_from and p_to
  order by s.service_date desc, a.checked_in_at;
end;
$$;

create or replace function public.correct_attendance(
  p_attendance_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_service_id uuid;
  v_visitor_id uuid;
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 8 and 240 then
    raise exception 'invalid correction reason';
  end if;

  update public.attendance
  set voided_at = now(),
      voided_by = auth.uid(),
      void_reason = btrim(p_reason)
  where id = p_attendance_id
    and organization_id = v_org_id
    and voided_at is null
  returning service_id, visitor_id into v_service_id, v_visitor_id;

  if not found then
    raise exception 'attendance unavailable';
  end if;

  perform public._write_audit(
    'ATTENDANCE_CORRECTED',
    'attendance',
    p_attendance_id,
    'success',
    jsonb_build_object('service_id', v_service_id, 'visitor_id', v_visitor_id, 'reason_code', 'administrator_correction')
  );
end;
$$;

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_old_role public.app_role;
  v_admin_count integer;
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'self role changes are not permitted';
  end if;

  select role into v_old_role
  from public.user_profiles
  where id = p_user_id and organization_id = v_org_id
  for update;

  if not found then raise exception 'user unavailable'; end if;

  if v_old_role = 'administrator' and p_role <> 'administrator' then
    select count(*) into v_admin_count
    from public.user_profiles
    where organization_id = v_org_id
      and role = 'administrator'
      and active = true;
    if v_admin_count <= 1 then
      raise exception 'cannot remove last active administrator';
    end if;
  end if;

  update public.user_profiles
  set role = p_role,
      auth_not_before = now()
  where id = p_user_id and organization_id = v_org_id;

  perform public._write_audit(
    'USER_ROLE_CHANGED',
    'user_profile',
    p_user_id,
    'success',
    jsonb_build_object('old_role', v_old_role, 'new_role', p_role)
  );
end;
$$;

create or replace function public.set_user_active(
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_target public.user_profiles%rowtype;
  v_admin_count integer;
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'self deactivation is not permitted';
  end if;

  select * into v_target
  from public.user_profiles
  where id = p_user_id and organization_id = v_org_id
  for update;

  if not found then raise exception 'user unavailable'; end if;

  if v_target.role = 'administrator' and v_target.active = true and p_active = false then
    select count(*) into v_admin_count
    from public.user_profiles
    where organization_id = v_org_id
      and role = 'administrator'
      and active = true;
    if v_admin_count <= 1 then
      raise exception 'cannot disable last active administrator';
    end if;
  end if;

  update public.user_profiles
  set active = p_active,
      auth_not_before = now()
  where id = p_user_id and organization_id = v_org_id;

  perform public._write_audit(
    case when p_active then 'USER_ENABLED' else 'USER_DISABLED' end,
    'user_profile',
    p_user_id,
    'success',
    jsonb_build_object('active', p_active)
  );
end;
$$;

create or replace function public.update_organization_settings(
  p_visitor_retention_months integer,
  p_contact_retention_months integer,
  p_attendance_retention_months integer,
  p_audit_retention_months integer,
  p_not_seen_days integer,
  p_require_service_assignment boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  if p_visitor_retention_months not between 1 and 120
    or p_contact_retention_months not between 1 and 120
    or p_attendance_retention_months not between 1 and 120
    or p_audit_retention_months not between 6 and 120
    or p_not_seen_days not between 7 and 730 then
    raise exception 'invalid settings';
  end if;

  update public.organization_settings
  set visitor_retention_months = p_visitor_retention_months,
      contact_retention_months = p_contact_retention_months,
      attendance_retention_months = p_attendance_retention_months,
      audit_retention_months = p_audit_retention_months,
      not_seen_days = p_not_seen_days,
      require_service_assignment = p_require_service_assignment,
      updated_at = now(),
      updated_by = auth.uid()
  where organization_id = public.current_org_id();

  perform public._write_audit(
    'RETENTION_SETTINGS_CHANGED',
    'organization_settings',
    public.current_org_id(),
    'success',
    jsonb_build_object(
      'visitor_months', p_visitor_retention_months,
      'contact_months', p_contact_retention_months,
      'attendance_months', p_attendance_retention_months,
      'audit_months', p_audit_retention_months,
      'assignment_required', p_require_service_assignment
    )
  );
end;
$$;

create or replace function public.retention_preview()
returns table (
  eligible_visitors bigint,
  eligible_contact_records bigint,
  eligible_attendance_records bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.organization_settings%rowtype;
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;

  select * into v_settings
  from public.organization_settings
  where organization_id = public.current_org_id();

  return query
  select
    (
      select count(*)
      from public.visitors v
      where v.organization_id = public.current_org_id()
        and v.active = true
        and greatest(
          v.first_visit_date,
          coalesce((
            select max(s.service_date)
            from public.attendance a
            join public.services s on s.id = a.service_id
            where a.visitor_id = v.id and a.voided_at is null
          ), v.first_visit_date)
        ) < current_date - make_interval(months => v_settings.visitor_retention_months)
    ),
    (
      select count(*)
      from public.visitors v
      where v.organization_id = public.current_org_id()
        and v.optional_contact is not null
        and v.first_visit_date < current_date - make_interval(months => v_settings.contact_retention_months)
    ),
    (
      select count(*)
      from public.attendance a
      join public.services s on s.id = a.service_id
      where a.organization_id = public.current_org_id()
        and s.service_date < current_date - make_interval(months => v_settings.attendance_retention_months)
    );
end;
$$;

create or replace function public.apply_visitor_retention(
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_settings public.organization_settings%rowtype;
  v_actor uuid := auth.uid();
  v_visitor record;
  v_anonymized integer := 0;
  v_contact_purged integer := 0;
  v_attendance_deleted integer := 0;
begin
  if not public.is_admin() or not public.has_aal2() then
    raise exception 'authorization denied';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 10 and 240 then
    raise exception 'invalid retention reason';
  end if;

  select * into v_settings
  from public.organization_settings
  where organization_id = v_org_id
  for update;

  with contact_targets as (
    update public.visitors
    set optional_contact = null,
        contact_consent = false
    where organization_id = v_org_id
      and optional_contact is not null
      and first_visit_date < current_date - make_interval(months => v_settings.contact_retention_months)
    returning id
  )
  select count(*) into v_contact_purged from contact_targets;

  for v_visitor in
    select distinct a.visitor_id
    from public.attendance a
    join public.services s on s.id = a.service_id
    where a.organization_id = v_org_id
      and s.service_date < current_date - make_interval(months => v_settings.attendance_retention_months)
  loop
    insert into public.retention_actions (
      organization_id, action_type, visitor_id, performed_by, reason
    )
    values (
      v_org_id, 'attendance_deleted', v_visitor.visitor_id, v_actor, btrim(p_reason)
    );
  end loop;

  with deleted_attendance as (
    delete from public.attendance a
    using public.services s
    where a.service_id = s.id
      and a.organization_id = v_org_id
      and s.service_date < current_date - make_interval(months => v_settings.attendance_retention_months)
    returning a.id
  )
  select count(*) into v_attendance_deleted from deleted_attendance;

  for v_visitor in
    select v.id
    from public.visitors v
    where v.organization_id = v_org_id
      and v.active = true
      and greatest(
        v.first_visit_date,
        coalesce((
          select max(s.service_date)
          from public.attendance a
          join public.services s on s.id = a.service_id
          where a.visitor_id = v.id and a.voided_at is null
        ), v.first_visit_date)
      ) < current_date - make_interval(months => v_settings.visitor_retention_months)
    for update
  loop
    update public.visitors
    set full_name = 'Anonymized visitor',
        preferred_name = null,
        optional_contact = null,
        contact_consent = false,
        active = false,
        anonymized_at = now()
    where id = v_visitor.id;

    insert into public.retention_actions (
      organization_id, action_type, visitor_id, performed_by, reason
    )
    values (
      v_org_id, 'visitor_anonymized', v_visitor.id, v_actor, btrim(p_reason)
    );

    v_anonymized := v_anonymized + 1;
  end loop;

  perform public._write_audit(
    'RETENTION_APPLIED',
    'retention',
    gen_random_uuid(),
    'success',
    jsonb_build_object(
      'visitors_anonymized', v_anonymized,
      'contacts_purged', v_contact_purged,
      'attendance_deleted', v_attendance_deleted
    )
  );

  return v_anonymized;
end;
$$;

create or replace function public.purge_expired_audit_logs()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  -- This function is not granted to application users. Run it only from a
  -- protected scheduled job using the database owner or service role.
  with deleted as (
    delete from public.audit_logs log
    using public.organization_settings settings
    where log.organization_id = settings.organization_id
      and log.event_timestamp < now() - make_interval(months => settings.audit_retention_months)
    returning log.id
  )
  select count(*) into v_deleted from deleted;

  return v_deleted;
end;
$$;

revoke all on function public.record_admin_event(text, text, uuid, text, jsonb) from public, anon;
revoke all on function public.available_services() from public, anon;
revoke all on function public.search_visitors(text, uuid) from public, anon;
revoke all on function public.register_visitor_and_check_in(text, text, date, text, boolean, uuid) from public, anon;
revoke all on function public.check_in_visitor(uuid, uuid) from public, anon;
revoke all on function public.current_attendance(uuid) from public, anon;
revoke all on function public.dashboard_metrics(uuid) from public, anon;
revoke all on function public.create_service(text, date, time) from public, anon;
revoke all on function public.set_service_assignment(uuid, uuid, boolean) from public, anon;
revoke all on function public.attendance_summary(date, date) from public, anon;
revoke all on function public.export_attendance(date, date) from public, anon;
revoke all on function public.correct_attendance(uuid, text) from public, anon;
revoke all on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke all on function public.set_user_active(uuid, boolean) from public, anon;
revoke all on function public.update_organization_settings(integer, integer, integer, integer, integer, boolean) from public, anon;
revoke all on function public.retention_preview() from public, anon;
revoke all on function public.apply_visitor_retention(text) from public, anon;
revoke all on function public.purge_expired_audit_logs() from public, anon, authenticated;

grant execute on function public.record_admin_event(text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.available_services() to authenticated;
grant execute on function public.search_visitors(text, uuid) to authenticated;
grant execute on function public.register_visitor_and_check_in(text, text, date, text, boolean, uuid) to authenticated;
grant execute on function public.check_in_visitor(uuid, uuid) to authenticated;
grant execute on function public.current_attendance(uuid) to authenticated;
grant execute on function public.dashboard_metrics(uuid) to authenticated;
grant execute on function public.create_service(text, date, time) to authenticated;
grant execute on function public.set_service_assignment(uuid, uuid, boolean) to authenticated;
grant execute on function public.attendance_summary(date, date) to authenticated;
grant execute on function public.export_attendance(date, date) to authenticated;
grant execute on function public.correct_attendance(uuid, text) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;
grant execute on function public.update_organization_settings(integer, integer, integer, integer, integer, boolean) to authenticated;
grant execute on function public.retention_preview() to authenticated;
grant execute on function public.apply_visitor_retention(text) to authenticated;

commit;
