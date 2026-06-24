begin;

create or replace function public.create_service(p_service_name text,p_service_date date,p_start_time time)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if char_length(btrim(coalesce(p_service_name,''))) not between 2 and 100 then raise exception 'invalid service name'; end if;
  insert into public.services (organization_id,service_name,service_date,start_time,created_by)
  values (public.current_org_id(),btrim(p_service_name),p_service_date,p_start_time,auth.uid()) returning id into v_id;
  perform public._write_audit('SERVICE_CREATED','service',v_id,'success',jsonb_build_object('service_date',p_service_date));
  return v_id;
end;
$$;

create or replace function public.set_service_assignment(p_service_id uuid,p_user_id uuid,p_assigned boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id();
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if not exists (select 1 from public.services s where s.id=p_service_id and s.organization_id=v_org_id)
    or not exists (select 1 from public.user_profiles p where p.id=p_user_id and p.organization_id=v_org_id and p.role='usher' and p.active=true)
  then raise exception 'invalid assignment'; end if;
  if p_assigned then
    insert into public.service_assignments (organization_id,service_id,user_id,assigned_by)
    values (v_org_id,p_service_id,p_user_id,auth.uid()) on conflict (service_id,user_id) do nothing;
  else
    delete from public.service_assignments where organization_id=v_org_id and service_id=p_service_id and user_id=p_user_id;
  end if;
  perform public._write_audit('SERVICE_ASSIGNMENT_CHANGED','service',p_service_id,'success',jsonb_build_object('user_id',p_user_id,'assigned',p_assigned));
end;
$$;

create or replace function public.attendance_summary(p_from date,p_to date)
returns table (service_id uuid,service_name text,service_date date,total_attendance bigint,first_time_visitors bigint,returning_visitors bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (public.is_admin() or public.is_auditor()) then raise exception 'authorization denied'; end if;
  if p_from is null or p_to is null or p_from>p_to or p_to-p_from>366 then raise exception 'invalid report period'; end if;
  return query select s.id,s.service_name,s.service_date,
    count(a.id) filter (where a.voided_at is null),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date=s.service_date),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date<>s.service_date)
  from public.services s left join public.attendance a on a.service_id=s.id and a.organization_id=s.organization_id
  left join public.visitors v on v.id=a.visitor_id
  where s.organization_id=public.current_org_id() and s.service_date between p_from and p_to
  group by s.id,s.service_name,s.service_date order by s.service_date desc,s.start_time desc;
end;
$$;

create or replace function public.export_attendance(p_from date,p_to date)
returns table (service_date date,service_name text,visitor_record_id uuid,full_name text,preferred_name text,optional_contact text,checked_in_at timestamptz,visitor_type text)
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() or not public.has_aal2() then
    perform public._write_audit('ATTENDANCE_EXPORT_DENIED','export',null,'denied',jsonb_build_object('from',p_from,'to',p_to));
    raise exception 'authorization denied';
  end if;
  if p_from is null or p_to is null or p_from>p_to or p_to-p_from>366 then raise exception 'invalid export period'; end if;
  perform public._write_audit('ATTENDANCE_EXPORTED','export',gen_random_uuid(),'success',jsonb_build_object('from',p_from,'to',p_to));
  return query select s.service_date,s.service_name,v.id,v.full_name,v.preferred_name,
    case when v.contact_consent then v.optional_contact else null end,a.checked_in_at,
    case when v.first_visit_date=s.service_date then 'first-time' else 'returning' end
  from public.attendance a join public.services s on s.id=a.service_id join public.visitors v on v.id=a.visitor_id
  where a.organization_id=public.current_org_id() and a.voided_at is null and s.service_date between p_from and p_to
  order by s.service_date desc,a.checked_in_at;
end;
$$;

create or replace function public.correct_attendance(p_attendance_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id(); v_service_id uuid; v_visitor_id uuid;
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 8 and 240 then raise exception 'invalid correction reason'; end if;
  update public.attendance set voided_at=now(),voided_by=auth.uid(),void_reason=btrim(p_reason)
  where id=p_attendance_id and organization_id=v_org_id and voided_at is null returning service_id,visitor_id into v_service_id,v_visitor_id;
  if not found then raise exception 'attendance unavailable'; end if;
  perform public._write_audit('ATTENDANCE_CORRECTED','attendance',p_attendance_id,'success',jsonb_build_object('service_id',v_service_id,'visitor_id',v_visitor_id,'reason_code','administrator_correction'));
end;
$$;

create or replace function public.set_user_role(p_user_id uuid,p_role public.app_role)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id(); v_old_role public.app_role; v_admin_count integer;
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if p_user_id=auth.uid() then raise exception 'self role changes are not permitted'; end if;
  select role into v_old_role from public.user_profiles where id=p_user_id and organization_id=v_org_id for update;
  if not found then raise exception 'user unavailable'; end if;
  if v_old_role='administrator' and p_role<>'administrator' then
    select count(*) into v_admin_count from public.user_profiles where organization_id=v_org_id and role='administrator' and active=true;
    if v_admin_count<=1 then raise exception 'cannot remove last active administrator'; end if;
  end if;
  update public.user_profiles set role=p_role,auth_not_before=now() where id=p_user_id and organization_id=v_org_id;
  perform public._write_audit('USER_ROLE_CHANGED','user_profile',p_user_id,'success',jsonb_build_object('old_role',v_old_role,'new_role',p_role));
end;
$$;

create or replace function public.set_user_active(p_user_id uuid,p_active boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id(); v_target public.user_profiles%rowtype; v_admin_count integer;
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if p_user_id=auth.uid() then raise exception 'self deactivation is not permitted'; end if;
  select * into v_target from public.user_profiles where id=p_user_id and organization_id=v_org_id for update;
  if not found then raise exception 'user unavailable'; end if;
  if v_target.role='administrator' and v_target.active=true and p_active=false then
    select count(*) into v_admin_count from public.user_profiles where organization_id=v_org_id and role='administrator' and active=true;
    if v_admin_count<=1 then raise exception 'cannot disable last active administrator'; end if;
  end if;
  update public.user_profiles set active=p_active,auth_not_before=now() where id=p_user_id and organization_id=v_org_id;
  perform public._write_audit(case when p_active then 'USER_ENABLED' else 'USER_DISABLED' end,'user_profile',p_user_id,'success',jsonb_build_object('active',p_active));
end;
$$;

commit;
