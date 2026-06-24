begin;

create or replace function public.update_organization_settings(
  p_visitor_retention_months integer,p_contact_retention_months integer,
  p_attendance_retention_months integer,p_audit_retention_months integer,
  p_not_seen_days integer,p_require_service_assignment boolean
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if p_visitor_retention_months not between 1 and 120
    or p_contact_retention_months not between 1 and 120
    or p_attendance_retention_months not between 1 and 120
    or p_audit_retention_months not between 6 and 120
    or p_not_seen_days not between 7 and 730 then raise exception 'invalid settings'; end if;
  update public.organization_settings
  set visitor_retention_months=p_visitor_retention_months,
      contact_retention_months=p_contact_retention_months,
      attendance_retention_months=p_attendance_retention_months,
      audit_retention_months=p_audit_retention_months,
      not_seen_days=p_not_seen_days,
      require_service_assignment=p_require_service_assignment,
      updated_at=now(),updated_by=auth.uid()
  where organization_id=public.current_org_id();
  perform public._write_audit('RETENTION_SETTINGS_CHANGED','organization_settings',public.current_org_id(),'success',
    jsonb_build_object('visitor_months',p_visitor_retention_months,'contact_months',p_contact_retention_months,'attendance_months',p_attendance_retention_months,'audit_months',p_audit_retention_months,'assignment_required',p_require_service_assignment));
end;
$$;

create or replace function public.retention_preview()
returns table (eligible_visitors bigint,eligible_contact_records bigint,eligible_attendance_records bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_settings public.organization_settings%rowtype;
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  select * into v_settings from public.organization_settings where organization_id=public.current_org_id();
  return query select
    (select count(*) from public.visitors v where v.organization_id=public.current_org_id() and v.active=true
      and greatest(v.first_visit_date,coalesce((select max(s.service_date) from public.attendance a join public.services s on s.id=a.service_id where a.visitor_id=v.id and a.voided_at is null),v.first_visit_date)) < current_date-make_interval(months=>v_settings.visitor_retention_months)),
    (select count(*) from public.visitors v where v.organization_id=public.current_org_id() and v.optional_contact is not null and v.first_visit_date < current_date-make_interval(months=>v_settings.contact_retention_months)),
    (select count(*) from public.attendance a join public.services s on s.id=a.service_id where a.organization_id=public.current_org_id() and s.service_date < current_date-make_interval(months=>v_settings.attendance_retention_months));
end;
$$;

create or replace function public.apply_visitor_retention(p_reason text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid := public.current_org_id(); v_settings public.organization_settings%rowtype;
  v_actor uuid := auth.uid(); v_visitor record; v_anonymized integer := 0;
  v_contact_purged integer := 0; v_attendance_deleted integer := 0;
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 10 and 240 then raise exception 'invalid retention reason'; end if;
  select * into v_settings from public.organization_settings where organization_id=v_org_id for update;
  with contact_targets as (
    update public.visitors set optional_contact=null,contact_consent=false
    where organization_id=v_org_id and optional_contact is not null
      and first_visit_date < current_date-make_interval(months=>v_settings.contact_retention_months)
    returning id
  ) select count(*) into v_contact_purged from contact_targets;
  for v_visitor in
    select distinct a.visitor_id from public.attendance a join public.services s on s.id=a.service_id
    where a.organization_id=v_org_id and s.service_date < current_date-make_interval(months=>v_settings.attendance_retention_months)
  loop
    insert into public.retention_actions (organization_id,action_type,visitor_id,performed_by,reason)
    values (v_org_id,'attendance_deleted',v_visitor.visitor_id,v_actor,btrim(p_reason));
  end loop;
  with deleted_attendance as (
    delete from public.attendance a using public.services s
    where a.service_id=s.id and a.organization_id=v_org_id
      and s.service_date < current_date-make_interval(months=>v_settings.attendance_retention_months)
    returning a.id
  ) select count(*) into v_attendance_deleted from deleted_attendance;
  for v_visitor in
    select v.id from public.visitors v where v.organization_id=v_org_id and v.active=true
      and greatest(v.first_visit_date,coalesce((select max(s.service_date) from public.attendance a join public.services s on s.id=a.service_id where a.visitor_id=v.id and a.voided_at is null),v.first_visit_date)) < current_date-make_interval(months=>v_settings.visitor_retention_months)
    for update
  loop
    update public.visitors set full_name='Anonymized visitor',preferred_name=null,optional_contact=null,contact_consent=false,active=false,anonymized_at=now() where id=v_visitor.id;
    insert into public.retention_actions (organization_id,action_type,visitor_id,performed_by,reason)
    values (v_org_id,'visitor_anonymized',v_visitor.id,v_actor,btrim(p_reason));
    v_anonymized := v_anonymized+1;
  end loop;
  perform public._write_audit('RETENTION_APPLIED','retention',gen_random_uuid(),'success',jsonb_build_object('visitors_anonymized',v_anonymized,'contacts_purged',v_contact_purged,'attendance_deleted',v_attendance_deleted));
  return v_anonymized;
end;
$$;

create or replace function public.purge_expired_audit_logs()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_deleted integer;
begin
  with deleted as (
    delete from public.audit_logs log using public.organization_settings settings
    where log.organization_id=settings.organization_id
      and log.event_timestamp < now()-make_interval(months=>settings.audit_retention_months)
    returning log.id
  ) select count(*) into v_deleted from deleted;
  return v_deleted;
end;
$$;

revoke all on function public.record_admin_event(text,text,uuid,text,jsonb) from public, anon;
revoke all on function public.available_services() from public, anon;
revoke all on function public.search_visitors(text,uuid) from public, anon;
revoke all on function public.register_visitor_and_check_in(text,text,date,text,boolean,uuid) from public, anon;
revoke all on function public.check_in_visitor(uuid,uuid) from public, anon;
revoke all on function public.current_attendance(uuid) from public, anon;
revoke all on function public.dashboard_metrics(uuid) from public, anon;
revoke all on function public.create_service(text,date,time) from public, anon;
revoke all on function public.set_service_assignment(uuid,uuid,boolean) from public, anon;
revoke all on function public.attendance_summary(date,date) from public, anon;
revoke all on function public.export_attendance(date,date) from public, anon;
revoke all on function public.correct_attendance(uuid,text) from public, anon;
revoke all on function public.set_user_role(uuid,public.app_role) from public, anon;
revoke all on function public.set_user_active(uuid,boolean) from public, anon;
revoke all on function public.update_organization_settings(integer,integer,integer,integer,integer,boolean) from public, anon;
revoke all on function public.retention_preview() from public, anon;
revoke all on function public.apply_visitor_retention(text) from public, anon;
revoke all on function public.purge_expired_audit_logs() from public, anon, authenticated;

grant execute on function public.record_admin_event(text,text,uuid,text,jsonb) to authenticated;
grant execute on function public.available_services() to authenticated;
grant execute on function public.search_visitors(text,uuid) to authenticated;
grant execute on function public.register_visitor_and_check_in(text,text,date,text,boolean,uuid) to authenticated;
grant execute on function public.check_in_visitor(uuid,uuid) to authenticated;
grant execute on function public.current_attendance(uuid) to authenticated;
grant execute on function public.dashboard_metrics(uuid) to authenticated;
grant execute on function public.create_service(text,date,time) to authenticated;
grant execute on function public.set_service_assignment(uuid,uuid,boolean) to authenticated;
grant execute on function public.attendance_summary(date,date) to authenticated;
grant execute on function public.export_attendance(date,date) to authenticated;
grant execute on function public.correct_attendance(uuid,text) to authenticated;
grant execute on function public.set_user_role(uuid,public.app_role) to authenticated;
grant execute on function public.set_user_active(uuid,boolean) to authenticated;
grant execute on function public.update_organization_settings(integer,integer,integer,integer,integer,boolean) to authenticated;
grant execute on function public.retention_preview() to authenticated;
grant execute on function public.apply_visitor_retention(text) to authenticated;

commit;
