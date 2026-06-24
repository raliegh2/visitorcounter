begin;

create or replace function public._write_audit(
  p_action text, p_resource_type text, p_resource_id uuid, p_outcome text,
  p_safe_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id(); v_metadata jsonb;
begin
  if v_org_id is null then raise exception 'authorization denied'; end if;
  v_metadata := jsonb_strip_nulls(coalesce(p_safe_metadata,'{}'::jsonb) - array['full_name','preferred_name','optional_contact','email','password','token','access_token','refresh_token','secret']);
  insert into public.audit_logs (organization_id,actor_user_id,action,resource_type,resource_id,outcome,safe_metadata)
  values (v_org_id,auth.uid(),upper(left(p_action,80)),lower(left(p_resource_type,80)),p_resource_id,case when p_outcome in ('success','denied','failure') then p_outcome else 'failure' end,v_metadata);
end;
$$;
revoke all on function public._write_audit(text,text,uuid,text,jsonb) from public, anon, authenticated;

create or replace function public.record_admin_event(
  p_action text, p_resource_type text, p_resource_id uuid, p_outcome text,
  p_safe_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  perform public._write_audit(p_action,p_resource_type,p_resource_id,p_outcome,p_safe_metadata);
end;
$$;

create or replace function public.available_services()
returns table (id uuid,service_name text,service_date date,start_time time,active boolean,assigned boolean)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id,s.service_name,s.service_date,s.start_time,s.active,
    case when public.is_admin() or public.is_auditor() then true else exists (
      select 1 from public.service_assignments a where a.service_id=s.id and a.user_id=auth.uid()
    ) end as assigned
  from public.services s
  where s.organization_id=public.current_org_id() and s.active=true
    and (public.is_admin() or public.is_auditor() or public.service_is_authorized(s.id))
  order by s.service_date desc,s.start_time desc;
$$;

create or replace function public.search_visitors(p_query text,p_service_id uuid)
returns table (id uuid,full_name text,preferred_name text,first_visit_date date,last_seen_date date,already_checked_in boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_query text;
begin
  if not (public.is_admin() or public.is_usher()) then
    perform public._write_audit('VISITOR_SEARCH_DENIED','visitor',null,'denied','{}'::jsonb);
    raise exception 'authorization denied';
  end if;
  if not public.service_is_authorized(p_service_id) then
    perform public._write_audit('VISITOR_SEARCH_DENIED','service',p_service_id,'denied',jsonb_build_object('reason','service_not_authorized'));
    raise exception 'service not authorized';
  end if;
  v_query := left(btrim(coalesce(p_query,'')),100);
  if char_length(v_query)<1 then return; end if;
  return query
  select v.id,v.full_name,v.preferred_name,v.first_visit_date,
    (select max(s.service_date) from public.attendance a join public.services s on s.id=a.service_id where a.visitor_id=v.id and a.organization_id=v.organization_id and a.voided_at is null),
    exists (select 1 from public.attendance a where a.visitor_id=v.id and a.service_id=p_service_id and a.organization_id=v.organization_id and a.voided_at is null)
  from public.visitors v
  where v.organization_id=public.current_org_id() and v.active=true and v.anonymized_at is null
    and (v.full_name ilike '%'||replace(replace(v_query,'%','\%'),'_','\_')||'%' escape '\'
      or coalesce(v.preferred_name,'') ilike '%'||replace(replace(v_query,'%','\%'),'_','\_')||'%' escape '\')
  order by v.full_name,v.first_visit_date desc limit 25;
end;
$$;

create or replace function public.register_visitor_and_check_in(
  p_full_name text,p_preferred_name text,p_first_visit_date date,p_optional_contact text,
  p_contact_consent boolean,p_service_id uuid
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid := public.current_org_id(); v_service_date date; v_visitor_id uuid;
  v_attendance_id uuid; v_contact text := nullif(btrim(coalesce(p_optional_contact,'')),'');
begin
  if not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;
  if not public.service_is_authorized(p_service_id) then raise exception 'service not authorized'; end if;
  if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 100 then raise exception 'invalid name'; end if;
  if p_preferred_name is not null and char_length(btrim(p_preferred_name))>60 then raise exception 'invalid preferred name'; end if;
  if v_contact is not null and p_contact_consent is not true then raise exception 'contact consent required'; end if;
  if v_contact is not null and char_length(v_contact)>120 then raise exception 'invalid contact'; end if;
  select s.service_date into v_service_date from public.services s where s.id=p_service_id and s.organization_id=v_org_id and s.active=true;
  if v_service_date is null or p_first_visit_date<>v_service_date then raise exception 'first visit date must match selected service'; end if;
  insert into public.visitors (organization_id,full_name,preferred_name,first_visit_date,optional_contact,contact_consent,created_by)
  values (v_org_id,btrim(p_full_name),nullif(btrim(coalesce(p_preferred_name,'')),''),p_first_visit_date,v_contact,case when v_contact is null then false else p_contact_consent end,auth.uid()) returning id into v_visitor_id;
  insert into public.attendance (organization_id,visitor_id,service_id,checked_in_by)
  values (v_org_id,v_visitor_id,p_service_id,auth.uid()) returning id into v_attendance_id;
  perform public._write_audit('VISITOR_CREATED','visitor',v_visitor_id,'success',jsonb_build_object('service_id',p_service_id,'contact_stored',v_contact is not null));
  perform public._write_audit('ATTENDANCE_CREATED','attendance',v_attendance_id,'success',jsonb_build_object('service_id',p_service_id,'visitor_id',v_visitor_id));
  return v_visitor_id;
end;
$$;

create or replace function public.check_in_visitor(p_visitor_id uuid,p_service_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id(); v_attendance_id uuid; v_existing public.attendance%rowtype;
begin
  if not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;
  if not public.service_is_authorized(p_service_id) then raise exception 'service not authorized'; end if;
  if not exists (select 1 from public.visitors v where v.id=p_visitor_id and v.organization_id=v_org_id and v.active=true and v.anonymized_at is null) then raise exception 'visitor unavailable'; end if;
  select * into v_existing from public.attendance a where a.organization_id=v_org_id and a.visitor_id=p_visitor_id and a.service_id=p_service_id for update;
  if found and v_existing.voided_at is null then
    perform public._write_audit('ATTENDANCE_DUPLICATE_BLOCKED','attendance',v_existing.id,'denied',jsonb_build_object('service_id',p_service_id,'visitor_id',p_visitor_id));
    raise exception 'duplicate attendance';
  elsif found then
    update public.attendance set checked_in_at=now(),checked_in_by=auth.uid(),voided_at=null,voided_by=null,void_reason=null where id=v_existing.id returning id into v_attendance_id;
  else
    insert into public.attendance (organization_id,visitor_id,service_id,checked_in_by) values (v_org_id,p_visitor_id,p_service_id,auth.uid()) returning id into v_attendance_id;
  end if;
  perform public._write_audit('ATTENDANCE_CREATED','attendance',v_attendance_id,'success',jsonb_build_object('service_id',p_service_id,'visitor_id',p_visitor_id));
  return v_attendance_id;
end;
$$;

create or replace function public.current_attendance(p_service_id uuid)
returns table (attendance_id uuid,visitor_id uuid,display_name text,visitor_type text,checked_in_at timestamptz,checked_in_by_name text,voided_at timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;
  if not public.service_is_authorized(p_service_id) then raise exception 'service not authorized'; end if;
  return query select a.id,v.id,coalesce(nullif(v.preferred_name,''),v.full_name),case when v.first_visit_date=s.service_date then 'first-time' else 'returning' end,a.checked_in_at,p.display_name,a.voided_at
  from public.attendance a join public.visitors v on v.id=a.visitor_id join public.services s on s.id=a.service_id join public.user_profiles p on p.id=a.checked_in_by
  where a.organization_id=public.current_org_id() and a.service_id=p_service_id and a.voided_at is null order by a.checked_in_at desc;
end;
$$;

create or replace function public.dashboard_metrics(p_service_id uuid)
returns table (attending bigint,first_time bigint,returning bigint,visitor_records bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.service_is_authorized(p_service_id) then raise exception 'service not authorized'; end if;
  return query select
    count(a.id) filter (where a.voided_at is null),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date=s.service_date),
    count(a.id) filter (where a.voided_at is null and v.first_visit_date<>s.service_date),
    (select count(*) from public.visitors active_v where active_v.organization_id=public.current_org_id() and active_v.active=true and active_v.anonymized_at is null)
  from public.services s left join public.attendance a on a.service_id=s.id and a.organization_id=s.organization_id left join public.visitors v on v.id=a.visitor_id
  where s.id=p_service_id and s.organization_id=public.current_org_id() group by s.id;
end;
$$;

commit;
