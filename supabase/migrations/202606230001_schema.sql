begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('administrator', 'usher', 'auditor');
  end if;
  if not exists (select 1 from pg_type where typname = 'retention_action_type') then
    create type public.retention_action_type as enum (
      'contact_purged',
      'visitor_anonymized',
      'attendance_deleted',
      'manual_deletion'
    );
  end if;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  role public.app_role not null default 'usher',
  active boolean not null default true,
  auth_not_before timestamptz not null default '1970-01-01 00:00:00+00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  visitor_retention_months integer not null default 24 check (visitor_retention_months between 1 and 120),
  contact_retention_months integer not null default 12 check (contact_retention_months between 1 and 120),
  attendance_retention_months integer not null default 36 check (attendance_retention_months between 1 and 120),
  audit_retention_months integer not null default 24 check (audit_retention_months between 6 and 120),
  not_seen_days integer not null default 30 check (not_seen_days between 7 and 730),
  require_service_assignment boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(id) on delete set null
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 100),
  preferred_name text check (preferred_name is null or char_length(btrim(preferred_name)) between 1 and 60),
  first_visit_date date not null,
  optional_contact text check (optional_contact is null or char_length(optional_contact) <= 120),
  contact_consent boolean not null default false,
  active boolean not null default true,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  constraint visitors_contact_requires_consent
    check (optional_contact is null or contact_consent = true),
  constraint visitors_anonymized_state
    check (
      anonymized_at is null
      or (
        active = false
        and optional_contact is null
        and contact_consent = false
      )
    )
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_name text not null check (char_length(btrim(service_name)) between 2 and 100),
  service_date date not null,
  start_time time not null,
  active boolean not null default true,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, service_name, service_date, start_time)
);

create table if not exists public.service_assignments (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  assigned_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (service_id, user_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  visitor_id uuid not null references public.visitors(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.user_profiles(id) on delete restrict,
  void_reason text check (void_reason is null or char_length(btrim(void_reason)) between 8 and 240),
  constraint attendance_single_checkin unique (organization_id, visitor_id, service_id),
  constraint attendance_void_consistency check (
    (voided_at is null and voided_by is null and void_reason is null)
    or
    (voided_at is not null and voided_by is not null and void_reason is not null)
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  resource_type text not null check (char_length(resource_type) between 2 and 80),
  resource_id uuid,
  event_timestamp timestamptz not null default now(),
  outcome text not null check (outcome in ('success', 'denied', 'failure')),
  safe_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_metadata) = 'object')
);

create table if not exists public.retention_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  action_type public.retention_action_type not null,
  visitor_id uuid references public.visitors(id) on delete set null,
  performed_by uuid not null references public.user_profiles(id) on delete restrict,
  performed_at timestamptz not null default now(),
  reason text not null check (char_length(btrim(reason)) between 10 and 240)
);


-- Composite keys ensure organization_id cannot disagree with referenced rows,
-- even when a privileged maintenance client writes directly.
alter table public.user_profiles
  add constraint user_profiles_org_id_unique unique (organization_id, id);
alter table public.visitors
  add constraint visitors_org_id_unique unique (organization_id, id);
alter table public.services
  add constraint services_org_id_unique unique (organization_id, id);

alter table public.visitors
  add constraint visitors_created_by_same_org
  foreign key (organization_id, created_by)
  references public.user_profiles (organization_id, id)
  on delete restrict;

alter table public.services
  add constraint services_created_by_same_org
  foreign key (organization_id, created_by)
  references public.user_profiles (organization_id, id)
  on delete restrict;

alter table public.service_assignments
  add constraint assignments_service_same_org
  foreign key (organization_id, service_id)
  references public.services (organization_id, id)
  on delete cascade,
  add constraint assignments_user_same_org
  foreign key (organization_id, user_id)
  references public.user_profiles (organization_id, id)
  on delete cascade,
  add constraint assignments_actor_same_org
  foreign key (organization_id, assigned_by)
  references public.user_profiles (organization_id, id)
  on delete restrict;

alter table public.attendance
  add constraint attendance_visitor_same_org
  foreign key (organization_id, visitor_id)
  references public.visitors (organization_id, id)
  on delete restrict,
  add constraint attendance_service_same_org
  foreign key (organization_id, service_id)
  references public.services (organization_id, id)
  on delete restrict,
  add constraint attendance_actor_same_org
  foreign key (organization_id, checked_in_by)
  references public.user_profiles (organization_id, id)
  on delete restrict,
  add constraint attendance_void_actor_same_org
  foreign key (organization_id, voided_by)
  references public.user_profiles (organization_id, id)
  on delete restrict;

alter table public.retention_actions
  add constraint retention_actor_same_org
  foreign key (organization_id, performed_by)
  references public.user_profiles (organization_id, id)
  on delete restrict;

create index if not exists user_profiles_org_role_idx
  on public.user_profiles (organization_id, role, active);
create index if not exists visitors_org_name_idx
  on public.visitors (organization_id, lower(full_name)) where active = true;
create index if not exists visitors_org_first_visit_idx
  on public.visitors (organization_id, first_visit_date);
create index if not exists services_org_date_idx
  on public.services (organization_id, service_date desc, start_time);
create index if not exists attendance_service_active_idx
  on public.attendance (organization_id, service_id, checked_in_at)
  where voided_at is null;
create index if not exists attendance_visitor_idx
  on public.attendance (organization_id, visitor_id, checked_in_at desc);
create index if not exists audit_logs_org_time_idx
  on public.audit_logs (organization_id, event_timestamp desc);
create index if not exists retention_actions_org_time_idx
  on public.retention_actions (organization_id, performed_at desc);
create index if not exists service_assignments_user_idx
  on public.service_assignments (organization_id, user_id, service_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_visitors_updated_at on public.visitors;
create trigger set_visitors_updated_at
before update on public.visitors
for each row execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();


create or replace function public.initialize_organization_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.organization_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
after insert on public.organizations
for each row execute function public.initialize_organization_settings();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_display_name text;
begin
  begin
    v_org_id := nullif(new.raw_app_meta_data ->> 'organization_id', '')::uuid;
  exception when others then
    v_org_id := null;
  end;

  if v_org_id is null or not exists (select 1 from public.organizations where id = v_org_id) then
    return new;
  end if;

  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'Staff member'), '@', 1)
  );

  insert into public.user_profiles (
    id,
    organization_id,
    display_name,
    role,
    active
  )
  values (
    new.id,
    v_org_id,
    left(v_display_name, 80),
    case
      when new.raw_app_meta_data ->> 'role' in ('administrator', 'usher', 'auditor')
        then (new.raw_app_meta_data ->> 'role')::public.app_role
      else 'usher'::public.app_role
    end,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

commit;
