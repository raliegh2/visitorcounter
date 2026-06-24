-- Local-development organization only. No real visitor data is included.
insert into public.organizations (id, name)
values ('00000000-0000-4000-8000-000000000001', 'Community Church')
on conflict (id) do update set name = excluded.name;

insert into public.organization_settings (
  organization_id, visitor_retention_months, contact_retention_months,
  attendance_retention_months, audit_retention_months, not_seen_days,
  require_service_assignment
)
values ('00000000-0000-4000-8000-000000000001',24,12,36,24,30,true)
on conflict (organization_id) do nothing;
