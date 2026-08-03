begin;

alter table public.user_profiles
  add column if not exists requested_role public.app_role not null default 'usher',
  add column if not exists role_status text not null default 'approved';

update public.user_profiles
set requested_role = role,
    role_status = 'approved'
where requested_role is null
   or role_status is null;

alter table public.user_profiles
  drop constraint if exists user_profiles_role_status_check;

alter table public.user_profiles
  add constraint user_profiles_role_status_check
  check (role_status in ('pending', 'approved', 'rejected'));

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  email text check (email is null or char_length(btrim(email)) <= 254),
  phone text check (phone is null or char_length(btrim(phone)) <= 40),
  address text check (address is null or char_length(btrim(address)) <= 240),
  ministry text check (ministry is null or char_length(btrim(ministry)) <= 120),
  joined_date date,
  active boolean not null default true,
  import_batch_id uuid,
  imported_at timestamptz,
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  constraint members_created_by_same_org
    foreign key (organization_id, created_by)
    references public.user_profiles (organization_id, id)
    on delete restrict
);

create table if not exists public.care_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  visitor_id uuid,
  member_id uuid,
  note_text text not null check (char_length(btrim(note_text)) between 2 and 2000),
  note_type text not null default 'care'
    check (note_type in ('care', 'prayer', 'follow_up', 'visit')),
  status text not null default 'open'
    check (status in ('open', 'resolved')),
  visibility text not null default 'pastoral_team'
    check (visibility in ('assigned_team', 'pastoral_team', 'administrator')),
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint care_notes_one_person check ((visitor_id is null) <> (member_id is null)),
  constraint care_notes_visitor_same_org
    foreign key (organization_id, visitor_id)
    references public.visitors (organization_id, id)
    on delete restrict,
  constraint care_notes_member_same_org
    foreign key (organization_id, member_id)
    references public.members (organization_id, id)
    on delete restrict,
  constraint care_notes_actor_same_org
    foreign key (organization_id, created_by)
    references public.user_profiles (organization_id, id)
    on delete restrict
);

create table if not exists public.visit_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  visitor_id uuid,
  member_id uuid,
  visited_by uuid not null references public.user_profiles(id) on delete restrict,
  outcome text not null default 'completed'
    check (char_length(btrim(outcome)) between 2 and 120),
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint visit_records_one_person check ((visitor_id is null) <> (member_id is null)),
  constraint visit_records_visitor_same_org
    foreign key (organization_id, visitor_id)
    references public.visitors (organization_id, id)
    on delete restrict,
  constraint visit_records_member_same_org
    foreign key (organization_id, member_id)
    references public.members (organization_id, id)
    on delete restrict,
  constraint visit_records_actor_same_org
    foreign key (organization_id, visited_by)
    references public.user_profiles (organization_id, id)
    on delete restrict
);

create table if not exists public.pastor_applications (
  profile_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  church_name text not null check (char_length(btrim(church_name)) between 2 and 160),
  pastor_name text not null check (char_length(btrim(pastor_name)) between 2 and 120),
  district text not null check (char_length(btrim(district)) between 2 and 120),
  denomination text not null check (char_length(btrim(denomination)) between 2 and 120),
  church_phone text not null check (char_length(btrim(church_phone)) between 7 and 40),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  verification_notes text check (verification_notes is null or char_length(btrim(verification_notes)) <= 500),
  constraint pastor_application_profile_same_org
    foreign key (organization_id, profile_id)
    references public.user_profiles (organization_id, id)
    on delete cascade,
  constraint pastor_application_reviewer_same_org
    foreign key (organization_id, reviewed_by)
    references public.user_profiles (organization_id, id)
    on delete restrict
);

create index if not exists members_org_name_idx
  on public.members (organization_id, lower(last_name), lower(first_name))
  where active = true;
create index if not exists care_notes_org_person_idx
  on public.care_notes (organization_id, visitor_id, member_id, created_at desc);
create index if not exists care_notes_org_status_idx
  on public.care_notes (organization_id, status, created_at desc);
create index if not exists visit_records_org_person_idx
  on public.visit_records (organization_id, visitor_id, member_id, visited_at desc);
create index if not exists pastor_applications_org_time_idx
  on public.pastor_applications (organization_id, submitted_at desc);

create or replace trigger set_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create or replace function public.current_profile_is_valid()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role_status = 'approved'
      and coalesce(
        to_timestamp(nullif(auth.jwt() ->> 'iat', '')::bigint),
        now()
      ) >= p.auth_not_before
  );
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.organization_id
  from public.user_profiles p
  where p.id = auth.uid()
    and p.active = true
    and p.role_status = 'approved'
    and coalesce(
      to_timestamp(nullif(auth.jwt() ->> 'iat', '')::bigint),
      now()
    ) >= p.auth_not_before
  limit 1;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role
  from public.user_profiles p
  where p.id = auth.uid()
    and p.active = true
    and p.role_status = 'approved'
    and coalesce(
      to_timestamp(nullif(auth.jwt() ->> 'iat', '')::bigint),
      now()
    ) >= p.auth_not_before
  limit 1;
$$;

create or replace function public.is_usher()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_app_role() in ('usher'::public.app_role, 'pastor'::public.app_role);
$$;

create or replace function public.is_pastor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_app_role() = 'pastor'::public.app_role;
$$;

create or replace function public.is_pastor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_app_role() in ('pastor'::public.app_role, 'administrator'::public.app_role);
$$;

revoke all on function public.is_pastor() from public;
revoke all on function public.is_pastor_or_admin() from public;
grant execute on function public.is_pastor() to authenticated;
grant execute on function public.is_pastor_or_admin() to authenticated;

drop policy if exists profiles_select_self on public.user_profiles;
create policy profiles_select_self
on public.user_profiles for select
to authenticated
using (id = auth.uid());

alter table public.members enable row level security;
alter table public.care_notes enable row level security;
alter table public.visit_records enable row level security;
alter table public.pastor_applications enable row level security;

create policy members_select_pastor_admin
on public.members for select
to authenticated
using (organization_id = public.current_org_id() and public.is_pastor_or_admin());

create policy members_insert_pastor_admin
on public.members for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and public.is_pastor_or_admin()
  and created_by = auth.uid()
);

create policy members_update_pastor_admin
on public.members for update
to authenticated
using (organization_id = public.current_org_id() and public.is_pastor_or_admin())
with check (organization_id = public.current_org_id() and public.is_pastor_or_admin());

create policy care_notes_select_ministry
on public.care_notes for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (
    public.is_pastor_or_admin()
    or (public.current_app_role() = 'usher'::public.app_role and visitor_id is not null and visibility = 'assigned_team')
  )
);

create policy care_notes_insert_ministry
on public.care_notes for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and created_by = auth.uid()
  and (
    public.is_pastor_or_admin()
    or (public.current_app_role() = 'usher'::public.app_role and visitor_id is not null and visibility = 'assigned_team')
  )
);

create policy visit_records_select_ministry
on public.visit_records for select
to authenticated
using (
  organization_id = public.current_org_id()
  and (public.is_pastor_or_admin() or (public.current_app_role() = 'usher'::public.app_role and visitor_id is not null))
);

create policy visit_records_insert_ministry
on public.visit_records for insert
to authenticated
with check (
  organization_id = public.current_org_id()
  and visited_by = auth.uid()
  and (public.is_pastor_or_admin() or (public.current_app_role() = 'usher'::public.app_role and visitor_id is not null))
);

create policy pastor_applications_select_self
on public.pastor_applications for select
to authenticated
using (profile_id = auth.uid());

create policy pastor_applications_admin_select
on public.pastor_applications for select
to authenticated
using (organization_id = public.current_org_id() and public.is_admin());

revoke all on table public.members from anon, authenticated;
revoke all on table public.care_notes from anon, authenticated;
revoke all on table public.visit_records from anon, authenticated;
revoke all on table public.pastor_applications from anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_org_count integer;
  v_display_name text;
  v_requested public.app_role := 'usher'::public.app_role;
  v_role public.app_role := 'usher'::public.app_role;
  v_status text := 'approved';
  v_requested_text text;
begin
  begin
    v_org_id := nullif(new.raw_app_meta_data ->> 'organization_id', '')::uuid;
  exception when others then
    v_org_id := null;
  end;

  if v_org_id is null or not exists (select 1 from public.organizations where id = v_org_id) then
    select count(*) into v_org_count from public.organizations;
    if v_org_count = 1 then
      select id into v_org_id from public.organizations order by created_at limit 1;
    else
      return new;
    end if;
  end if;

  v_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'Staff member'), '@', 1)
  );

  v_requested_text := coalesce(
    nullif(new.raw_user_meta_data ->> 'requested_role', ''),
    nullif(new.raw_app_meta_data ->> 'role', ''),
    'usher'
  );

  if v_requested_text in ('administrator', 'usher', 'pastor', 'auditor') then
    v_requested := v_requested_text::public.app_role;
  end if;

  if new.raw_app_meta_data ->> 'role' in ('administrator', 'usher', 'pastor', 'auditor') then
    v_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
    v_status := 'approved';
  elsif v_requested = 'pastor'::public.app_role then
    v_role := 'usher'::public.app_role;
    v_status := 'pending';
  else
    v_role := 'usher'::public.app_role;
    v_status := 'approved';
  end if;

  insert into public.user_profiles (
    id,
    organization_id,
    display_name,
    role,
    requested_role,
    role_status,
    active
  )
  values (
    new.id,
    v_org_id,
    left(v_display_name, 80),
    v_role,
    v_requested,
    v_status,
    true
  )
  on conflict (id) do nothing;

  if v_requested = 'pastor'::public.app_role then
    insert into public.pastor_applications (
      profile_id,
      organization_id,
      church_name,
      pastor_name,
      district,
      denomination,
      church_phone
    )
    values (
      new.id,
      v_org_id,
      left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'church_name'), ''), 'Verification required'), 160),
      left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'pastor_name'), ''), v_display_name), 120),
      left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'district'), ''), 'Verification required'), 120),
      left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'denomination'), ''), 'Verification required'), 120),
      left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'church_phone'), ''), 'Not provided'), 40)
    )
    on conflict (profile_id) do update set
      church_name = excluded.church_name,
      pastor_name = excluded.pastor_name,
      district = excluded.district,
      denomination = excluded.denomination,
      church_phone = excluded.church_phone,
      submitted_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      verification_notes = null;
  end if;

  return new;
end;
$$;

create or replace function public.ministry_dashboard_metrics()
returns table (
  visitor_records bigint,
  member_records bigint,
  open_care_needs bigint,
  completed_visits bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
  v_role public.app_role := public.current_app_role();
begin
  if v_org_id is null then raise exception 'authorization denied'; end if;

  return query
  select
    (select count(*) from public.visitors v where v.organization_id = v_org_id and v.active and v.anonymized_at is null),
    case when v_role in ('administrator'::public.app_role, 'pastor'::public.app_role)
      then (select count(*) from public.members m where m.organization_id = v_org_id and m.active)
      else 0::bigint end,
    case
      when v_role in ('administrator'::public.app_role, 'pastor'::public.app_role)
        then (select count(*) from public.care_notes c where c.organization_id = v_org_id and c.status = 'open')
      when v_role = 'usher'::public.app_role
        then (select count(*) from public.care_notes c where c.organization_id = v_org_id and c.status = 'open' and c.visitor_id is not null and c.visibility = 'assigned_team')
      else 0::bigint
    end,
    case
      when v_role in ('administrator'::public.app_role, 'pastor'::public.app_role)
        then (select count(*) from public.visit_records r where r.organization_id = v_org_id)
      when v_role = 'usher'::public.app_role
        then (select count(*) from public.visit_records r where r.organization_id = v_org_id and r.visitor_id is not null)
      else 0::bigint
    end;
end;
$$;

create or replace function public.search_members(p_query text default '')
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  ministry text,
  joined_date date,
  active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := left(btrim(coalesce(p_query, '')), 100);
begin
  if not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;

  return query
  select m.id, m.first_name, m.last_name, m.email, m.phone, m.address, m.ministry,
         m.joined_date, m.active, m.created_at
  from public.members m
  where m.organization_id = public.current_org_id()
    and m.active = true
    and (
      v_query = ''
      or m.first_name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or m.last_name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(m.email, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(m.phone, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(m.ministry, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
    )
  order by m.last_name, m.first_name
  limit 300;
end;
$$;

create or replace function public.create_member(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_address text,
  p_ministry text,
  p_joined_date date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if char_length(btrim(coalesce(p_first_name, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_last_name, ''))) not between 1 and 80 then
    raise exception 'invalid member name';
  end if;

  insert into public.members (
    organization_id, first_name, last_name, email, phone, address, ministry,
    joined_date, created_by
  ) values (
    public.current_org_id(), btrim(p_first_name), btrim(p_last_name),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_ministry, '')), ''),
    p_joined_date, auth.uid()
  ) returning id into v_id;

  perform public._write_audit(
    'MEMBER_CREATED', 'member', v_id, 'success',
    jsonb_build_object('has_email', nullif(btrim(coalesce(p_email, '')), '') is not null,
                       'has_phone', nullif(btrim(coalesce(p_phone, '')), '') is not null)
  );
  return v_id;
end;
$$;

create or replace function public.bulk_import_members(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_count integer := 0;
  v_batch uuid := gen_random_uuid();
  v_first text;
  v_last text;
begin
  if not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'invalid import batch';
  end if;

  for v_item in select value from jsonb_array_elements(p_rows)
  loop
    v_first := btrim(coalesce(v_item ->> 'first_name', ''));
    v_last := btrim(coalesce(v_item ->> 'last_name', ''));
    if char_length(v_first) not between 1 and 80 or char_length(v_last) not between 1 and 80 then
      raise exception 'invalid member name in import';
    end if;

    insert into public.members (
      organization_id, first_name, last_name, email, phone, address, ministry,
      joined_date, import_batch_id, imported_at, created_by
    ) values (
      public.current_org_id(), v_first, v_last,
      nullif(left(btrim(coalesce(v_item ->> 'email', '')), 254), ''),
      nullif(left(btrim(coalesce(v_item ->> 'phone', '')), 40), ''),
      nullif(left(btrim(coalesce(v_item ->> 'address', '')), 240), ''),
      nullif(left(btrim(coalesce(v_item ->> 'ministry', '')), 120), ''),
      case when coalesce(v_item ->> 'joined_date', '') ~ '^\d{4}-\d{2}-\d{2}$'
        then (v_item ->> 'joined_date')::date else null end,
      v_batch, now(), auth.uid()
    );
    v_count := v_count + 1;
  end loop;

  perform public._write_audit(
    'MEMBERS_IMPORTED', 'member_import', v_batch, 'success',
    jsonb_build_object('row_count', v_count)
  );
  return v_count;
end;
$$;

create or replace function public.search_care_people(p_query text default '')
returns table (
  person_type text,
  person_id uuid,
  display_name text,
  contact text,
  subtitle text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_query text := left(btrim(coalesce(p_query, '')), 100);
begin
  if not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;

  return query
  select 'visitor'::text, v.id,
         coalesce(nullif(v.preferred_name, ''), v.full_name),
         case when public.is_pastor_or_admin() and v.contact_consent then v.optional_contact else null end,
         'Visitor · first visit ' || v.first_visit_date::text
  from public.visitors v
  where v.organization_id = public.current_org_id()
    and v.active and v.anonymized_at is null
    and (v_query = '' or v.full_name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(v.preferred_name, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\')
  union all
  select 'member'::text, m.id, m.first_name || ' ' || m.last_name,
         coalesce(m.phone, m.email),
         'Member' || case when m.ministry is null then '' else ' · ' || m.ministry end
  from public.members m
  where public.is_pastor_or_admin()
    and m.organization_id = public.current_org_id()
    and m.active
    and (v_query = '' or m.first_name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or m.last_name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(m.email, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\'
      or coalesce(m.phone, '') ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%' escape '\')
  order by 3
  limit 300;
end;
$$;

create or replace function public.care_notes_for_person(p_person_type text, p_person_id uuid)
returns table (
  id uuid,
  note_text text,
  note_type text,
  status text,
  visibility text,
  created_at timestamptz,
  created_by_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_person_type not in ('visitor', 'member') then raise exception 'invalid person type'; end if;
  if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if p_person_type = 'visitor' and not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;

  return query
  select c.id, c.note_text, c.note_type, c.status, c.visibility, c.created_at, p.display_name
  from public.care_notes c
  join public.user_profiles p on p.id = c.created_by
  where c.organization_id = public.current_org_id()
    and ((p_person_type = 'visitor' and c.visitor_id = p_person_id)
      or (p_person_type = 'member' and c.member_id = p_person_id))
    and (public.is_pastor_or_admin() or (c.visitor_id is not null and c.visibility = 'assigned_team'))
  order by c.created_at desc
  limit 200;
end;
$$;

create or replace function public.visits_for_person(p_person_type text, p_person_id uuid)
returns table (
  id uuid,
  outcome text,
  visited_at timestamptz,
  visited_by_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_person_type not in ('visitor', 'member') then raise exception 'invalid person type'; end if;
  if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if p_person_type = 'visitor' and not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;

  return query
  select r.id, r.outcome, r.visited_at, p.display_name
  from public.visit_records r
  join public.user_profiles p on p.id = r.visited_by
  where r.organization_id = public.current_org_id()
    and ((p_person_type = 'visitor' and r.visitor_id = p_person_id)
      or (p_person_type = 'member' and r.member_id = p_person_id))
  order by r.visited_at desc
  limit 200;
end;
$$;

create or replace function public.add_care_note(
  p_person_type text,
  p_person_id uuid,
  p_note_text text,
  p_note_type text,
  p_visibility text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_visibility text := p_visibility;
begin
  if p_person_type not in ('visitor', 'member') then raise exception 'invalid person type'; end if;
  if char_length(btrim(coalesce(p_note_text, ''))) not between 2 and 2000 then raise exception 'invalid note'; end if;
  if p_note_type not in ('care', 'prayer', 'follow_up', 'visit') then raise exception 'invalid note type'; end if;
  if p_visibility not in ('assigned_team', 'pastoral_team', 'administrator') then raise exception 'invalid visibility'; end if;

  if public.current_app_role() = 'usher'::public.app_role then
    if p_person_type <> 'visitor' then raise exception 'authorization denied'; end if;
    v_visibility := 'assigned_team';
  elsif not public.is_pastor_or_admin() then
    raise exception 'authorization denied';
  end if;

  if p_person_type = 'visitor' and not exists (
    select 1 from public.visitors where id = p_person_id and organization_id = public.current_org_id() and active and anonymized_at is null
  ) then raise exception 'person unavailable'; end if;
  if p_person_type = 'member' and not exists (
    select 1 from public.members where id = p_person_id and organization_id = public.current_org_id() and active
  ) then raise exception 'person unavailable'; end if;

  insert into public.care_notes (
    organization_id, visitor_id, member_id, note_text, note_type, visibility, created_by
  ) values (
    public.current_org_id(),
    case when p_person_type = 'visitor' then p_person_id else null end,
    case when p_person_type = 'member' then p_person_id else null end,
    btrim(p_note_text), p_note_type, v_visibility, auth.uid()
  ) returning id into v_id;

  perform public._write_audit(
    'CARE_NOTE_CREATED', 'care_note', v_id, 'success',
    jsonb_build_object('person_type', p_person_type, 'person_id', p_person_id, 'visibility', v_visibility)
  );
  return v_id;
end;
$$;

create or replace function public.record_person_visit(
  p_person_type text,
  p_person_id uuid,
  p_outcome text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_person_type not in ('visitor', 'member') then raise exception 'invalid person type'; end if;
  if char_length(btrim(coalesce(p_outcome, ''))) not between 2 and 120 then raise exception 'invalid outcome'; end if;
  if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if p_person_type = 'visitor' and not (public.is_admin() or public.is_usher()) then raise exception 'authorization denied'; end if;

  insert into public.visit_records (
    organization_id, visitor_id, member_id, visited_by, outcome
  ) values (
    public.current_org_id(),
    case when p_person_type = 'visitor' then p_person_id else null end,
    case when p_person_type = 'member' then p_person_id else null end,
    auth.uid(), btrim(p_outcome)
  ) returning id into v_id;

  perform public._write_audit(
    'VISIT_RECORDED', 'visit_record', v_id, 'success',
    jsonb_build_object('person_type', p_person_type, 'person_id', p_person_id)
  );
  return v_id;
end;
$$;

create or replace function public.list_pastor_applications()
returns table (
  profile_id uuid,
  display_name text,
  requested_role public.app_role,
  role_status text,
  church_name text,
  pastor_name text,
  district text,
  denomination text,
  church_phone text,
  submitted_at timestamptz,
  verification_notes text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;

  return query
  select a.profile_id, p.display_name, p.requested_role, p.role_status,
         a.church_name, a.pastor_name, a.district, a.denomination,
         a.church_phone, a.submitted_at, a.verification_notes
  from public.pastor_applications a
  join public.user_profiles p on p.id = a.profile_id
  where a.organization_id = public.current_org_id()
  order by case when p.role_status = 'pending' then 0 else 1 end, a.submitted_at desc;
end;
$$;

create or replace function public.review_pastor_application(
  p_user_id uuid,
  p_approved boolean,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid := public.current_org_id();
begin
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if p_user_id = auth.uid() then raise exception 'self review is not permitted'; end if;
  if not exists (
    select 1 from public.pastor_applications
    where profile_id = p_user_id and organization_id = v_org_id
  ) then raise exception 'application unavailable'; end if;

  update public.user_profiles
  set role = case when p_approved then 'pastor'::public.app_role else 'usher'::public.app_role end,
      requested_role = 'pastor'::public.app_role,
      role_status = case when p_approved then 'approved' else 'rejected' end,
      active = true,
      auth_not_before = now()
  where id = p_user_id and organization_id = v_org_id;

  update public.pastor_applications
  set reviewed_at = now(), reviewed_by = auth.uid(),
      verification_notes = nullif(left(btrim(coalesce(p_notes, '')), 500), '')
  where profile_id = p_user_id and organization_id = v_org_id;

  perform public._write_audit(
    case when p_approved then 'PASTOR_APPROVED' else 'PASTOR_REJECTED' end,
    'user_profile', p_user_id, 'success',
    jsonb_build_object('approved', p_approved)
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
  if not public.is_admin() or not public.has_aal2() then raise exception 'authorization denied'; end if;
  if p_user_id = auth.uid() then raise exception 'self role changes are not permitted'; end if;

  select role into v_old_role
  from public.user_profiles
  where id = p_user_id and organization_id = v_org_id
  for update;

  if not found then raise exception 'user unavailable'; end if;

  if v_old_role = 'administrator' and p_role <> 'administrator' then
    select count(*) into v_admin_count
    from public.user_profiles
    where organization_id = v_org_id and role = 'administrator' and active = true;
    if v_admin_count <= 1 then raise exception 'cannot remove last active administrator'; end if;
  end if;

  update public.user_profiles
  set role = p_role,
      requested_role = p_role,
      role_status = 'approved',
      auth_not_before = now()
  where id = p_user_id and organization_id = v_org_id;

  perform public._write_audit(
    'USER_ROLE_CHANGED', 'user_profile', p_user_id, 'success',
    jsonb_build_object('old_role', v_old_role, 'new_role', p_role)
  );
end;
$$;

revoke all on function public.ministry_dashboard_metrics() from public, anon;
revoke all on function public.search_members(text) from public, anon;
revoke all on function public.create_member(text, text, text, text, text, text, date) from public, anon;
revoke all on function public.bulk_import_members(jsonb) from public, anon;
revoke all on function public.search_care_people(text) from public, anon;
revoke all on function public.care_notes_for_person(text, uuid) from public, anon;
revoke all on function public.visits_for_person(text, uuid) from public, anon;
revoke all on function public.add_care_note(text, uuid, text, text, text) from public, anon;
revoke all on function public.record_person_visit(text, uuid, text) from public, anon;
revoke all on function public.list_pastor_applications() from public, anon;
revoke all on function public.review_pastor_application(uuid, boolean, text) from public, anon;

grant execute on function public.ministry_dashboard_metrics() to authenticated;
grant execute on function public.search_members(text) to authenticated;
grant execute on function public.create_member(text, text, text, text, text, text, date) to authenticated;
grant execute on function public.bulk_import_members(jsonb) to authenticated;
grant execute on function public.search_care_people(text) to authenticated;
grant execute on function public.care_notes_for_person(text, uuid) to authenticated;
grant execute on function public.visits_for_person(text, uuid) to authenticated;
grant execute on function public.add_care_note(text, uuid, text, text, text) to authenticated;
grant execute on function public.record_person_visit(text, uuid, text) to authenticated;
grant execute on function public.list_pastor_applications() to authenticated;
grant execute on function public.review_pastor_application(uuid, boolean, text) to authenticated;

commit;
