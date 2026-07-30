-- Role-based workspaces, member imports, care notes, and ministry visit tracking.

alter table public.user_profiles
  add column if not exists requested_role text not null default 'usher',
  add column if not exists role_status text not null default 'approved',
  add column if not exists clerk_user_id text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_requested_role_check') then
    alter table public.user_profiles add constraint user_profiles_requested_role_check check (requested_role in ('usher', 'pastor', 'administrator'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_role_status_check') then
    alter table public.user_profiles add constraint user_profiles_role_status_check check (role_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  email text,
  phone text,
  address text,
  membership_status text not null default 'active' check (membership_status in ('active', 'inactive', 'prospective')),
  last_contact_at timestamptz,
  imported_at timestamptz,
  import_batch_id uuid,
  created_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.care_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  visitor_id uuid references public.visitors(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  note_text text not null check (char_length(note_text) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  visibility text not null default 'pastoral_team' check (visibility in ('assigned_team', 'pastoral_team', 'admin_only')),
  created_by uuid not null references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_notes_one_person check ((visitor_id is not null)::integer + (member_id is not null)::integer = 1)
);

create table if not exists public.visit_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  visitor_id uuid references public.visitors(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  visited_at timestamptz not null default now(),
  visited_by uuid not null references public.user_profiles(id),
  outcome text not null default 'completed' check (outcome in ('planned', 'attempted', 'completed', 'follow_up_needed')),
  summary text,
  created_at timestamptz not null default now(),
  constraint visit_records_one_person check ((visitor_id is not null)::integer + (member_id is not null)::integer = 1)
);

create table if not exists public.pastor_applications (
  profile_id uuid primary key references public.user_profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  church_name text not null check (char_length(btrim(church_name)) between 2 and 160),
  pastor_name text not null check (char_length(btrim(pastor_name)) between 2 and 120),
  district text not null check (char_length(btrim(district)) between 2 and 160),
  denomination text not null check (char_length(btrim(denomination)) between 2 and 160),
  church_phone text not null check (char_length(btrim(church_phone)) between 7 and 40),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.user_profiles(id),
  verification_notes text check (verification_notes is null or char_length(verification_notes) <= 1000)
);

create index if not exists members_org_name_idx on public.members (organization_id, last_name, first_name);
create index if not exists care_notes_visitor_idx on public.care_notes (visitor_id, created_at desc) where visitor_id is not null;
create index if not exists care_notes_member_idx on public.care_notes (member_id, created_at desc) where member_id is not null;
create index if not exists visit_records_visitor_idx on public.visit_records (visitor_id, visited_at desc) where visitor_id is not null;
create index if not exists visit_records_member_idx on public.visit_records (member_id, visited_at desc) where member_id is not null;

alter table public.members enable row level security;
alter table public.care_notes enable row level security;
alter table public.visit_records enable row level security;
alter table public.pastor_applications enable row level security;

create or replace function public.current_actor_external_id()
returns text language sql stable set search_path = public, pg_temp as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function public.current_actor_id()
returns uuid language plpgsql stable set search_path = public, pg_temp as $$
declare v_subject text := public.current_actor_external_id();
begin
  if v_subject is null then return null; end if;
  if v_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return v_subject::uuid; end if;
  return md5('clerk:' || v_subject)::uuid;
end;
$$;

create or replace function public.current_profile_is_valid()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.user_profiles p where p.id = public.current_actor_id() and p.active and p.role_status = 'approved' and coalesce(to_timestamp(nullif(auth.jwt() ->> 'iat', '')::bigint), now()) >= p.auth_not_before);
$$;

create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select p.organization_id from public.user_profiles p where p.id = public.current_actor_id() and p.active and p.role_status = 'approved' and coalesce(to_timestamp(nullif(auth.jwt() ->> 'iat', '')::bigint), now()) >= p.auth_not_before limit 1;
$$;

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public, pg_temp as $$
  select p.role from public.user_profiles p where p.id = public.current_actor_id() and p.active and p.role_status = 'approved' and coalesce(to_timestamp(nullif(auth.jwt() ->> 'iat', '')::bigint), now()) >= p.auth_not_before limit 1;
$$;

create or replace function public.is_usher()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_app_role() in ('usher'::public.app_role, 'pastor'::public.app_role);
$$;

create or replace function public.is_pastor_or_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_app_role() in ('pastor'::public.app_role, 'administrator'::public.app_role);
$$;

drop policy if exists members_select_pastor_admin on public.members;
drop policy if exists members_insert_pastor_admin on public.members;
drop policy if exists members_update_pastor_admin on public.members;
drop policy if exists members_delete_admin on public.members;
create policy members_select_pastor_admin on public.members for select to authenticated using (organization_id = public.current_org_id() and public.is_pastor_or_admin());
create policy members_insert_pastor_admin on public.members for insert to authenticated with check (organization_id = public.current_org_id() and public.is_pastor_or_admin() and created_by = public.current_actor_id());
create policy members_update_pastor_admin on public.members for update to authenticated using (organization_id = public.current_org_id() and public.is_pastor_or_admin()) with check (organization_id = public.current_org_id() and public.is_pastor_or_admin());
create policy members_delete_admin on public.members for delete to authenticated using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists care_notes_select_ministry on public.care_notes;
drop policy if exists care_notes_insert_ministry on public.care_notes;
drop policy if exists care_notes_update_pastor_admin on public.care_notes;
drop policy if exists care_notes_delete_admin on public.care_notes;
create policy care_notes_select_ministry on public.care_notes for select to authenticated using (organization_id = public.current_org_id() and (public.is_pastor_or_admin() or (public.current_app_role() = 'usher' and visitor_id is not null and visibility = 'assigned_team')));
create policy care_notes_insert_ministry on public.care_notes for insert to authenticated with check (organization_id = public.current_org_id() and created_by = public.current_actor_id() and (public.is_pastor_or_admin() or (public.current_app_role() = 'usher' and visitor_id is not null and visibility = 'assigned_team')));
create policy care_notes_update_pastor_admin on public.care_notes for update to authenticated using (organization_id = public.current_org_id() and public.is_pastor_or_admin()) with check (organization_id = public.current_org_id() and public.is_pastor_or_admin());
create policy care_notes_delete_admin on public.care_notes for delete to authenticated using (organization_id = public.current_org_id() and public.is_admin());

drop policy if exists visit_records_select_ministry on public.visit_records;
drop policy if exists visit_records_insert_ministry on public.visit_records;
drop policy if exists visit_records_update_pastor_admin on public.visit_records;
create policy visit_records_select_ministry on public.visit_records for select to authenticated using (organization_id = public.current_org_id() and (public.is_pastor_or_admin() or (public.current_app_role() = 'usher' and visitor_id is not null)));
create policy visit_records_insert_ministry on public.visit_records for insert to authenticated with check (organization_id = public.current_org_id() and visited_by = public.current_actor_id() and (public.is_pastor_or_admin() or (public.current_app_role() = 'usher' and visitor_id is not null)));
create policy visit_records_update_pastor_admin on public.visit_records for update to authenticated using (organization_id = public.current_org_id() and public.is_pastor_or_admin()) with check (organization_id = public.current_org_id() and public.is_pastor_or_admin());

drop policy if exists pastor_applications_select_self on public.pastor_applications;
drop policy if exists pastor_applications_admin_select on public.pastor_applications;
create policy pastor_applications_select_self on public.pastor_applications for select to authenticated using (profile_id = public.current_actor_id());
create policy pastor_applications_admin_select on public.pastor_applications for select to authenticated using (organization_id = public.current_org_id() and public.is_admin());

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid; v_display_name text; v_invited boolean := false; v_requested text := lower(coalesce(new.raw_user_meta_data ->> 'requested_role', 'usher')); v_role public.app_role := 'usher'; v_status text := 'approved';
begin
  begin v_org_id := nullif(new.raw_app_meta_data ->> 'organization_id', '')::uuid; exception when others then v_org_id := null; end;
  if v_org_id is not null and exists (select 1 from public.organizations where id = v_org_id) then v_invited := true; else select id into v_org_id from public.organizations order by created_at limit 1; end if;
  if v_org_id is null then return new; end if;
  if v_requested not in ('usher', 'pastor', 'administrator') then v_requested := 'usher'; end if;
  if v_invited and new.raw_app_meta_data ->> 'role' in ('administrator', 'usher', 'pastor', 'auditor') then
    v_role := (new.raw_app_meta_data ->> 'role')::public.app_role; v_status := 'approved';
    if v_role = 'pastor' then v_requested := 'pastor'; elsif v_role = 'administrator' then v_requested := 'administrator'; else v_requested := 'usher'; end if;
  elsif v_requested in ('pastor', 'administrator') then v_role := 'usher'; v_status := 'pending'; end if;
  v_display_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'Staff member'), '@', 1));
  insert into public.user_profiles (id, organization_id, display_name, role, requested_role, role_status, active)
  values (new.id, v_org_id, left(v_display_name, 80), v_role, v_requested, v_status, true)
  on conflict (id) do update set organization_id = excluded.organization_id, display_name = excluded.display_name, requested_role = case when public.user_profiles.role = 'administrator' then public.user_profiles.requested_role else excluded.requested_role end, role_status = case when public.user_profiles.role = 'administrator' then public.user_profiles.role_status else excluded.role_status end, role = case when public.user_profiles.role = 'administrator' then public.user_profiles.role else excluded.role end, active = true, updated_at = now();
  if v_requested = 'pastor' and v_status = 'pending' then
    insert into public.pastor_applications (profile_id, organization_id, church_name, pastor_name, district, denomination, church_phone)
    values (new.id, v_org_id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'church_name'), ''), 'Not provided'), 160), left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'pastor_name'), ''), 'Not provided'), 120), left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'district'), ''), 'Not provided'), 160), left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'denomination'), ''), 'Not provided'), 160), left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'church_phone'), ''), 'Not provided'), 40))
    on conflict (profile_id) do update set church_name = excluded.church_name, pastor_name = excluded.pastor_name, district = excluded.district, denomination = excluded.denomination, church_phone = excluded.church_phone, submitted_at = now(), reviewed_at = null, reviewed_by = null, verification_notes = null;
  end if;
  return new;
end;
$$;

create or replace function public.ministry_dashboard_metrics()
returns table(visitors bigint, members bigint, open_care_needs bigint, completed_visits bigint, pending_role_requests bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select (select count(*) from public.visitors v where v.organization_id = public.current_org_id() and v.active and v.anonymized_at is null), case when public.is_pastor_or_admin() then (select count(*) from public.members m where m.organization_id = public.current_org_id()) else 0 end, (select count(*) from public.care_notes n where n.organization_id = public.current_org_id() and n.status <> 'resolved' and (public.is_pastor_or_admin() or (n.visitor_id is not null and n.visibility = 'assigned_team'))), (select count(*) from public.visit_records r where r.organization_id = public.current_org_id() and r.outcome = 'completed' and (public.is_pastor_or_admin() or r.visitor_id is not null)), case when public.is_admin() then (select count(*) from public.user_profiles p where p.organization_id = public.current_org_id() and p.role_status = 'pending') else 0 end where public.current_profile_is_valid();
$$;

create or replace function public.search_member_records(p_query text default '')
returns table(id uuid, first_name text, last_name text, email text, phone text, address text, membership_status text, last_contact_at timestamptz, last_visited_at timestamptz, visit_count bigint, has_been_visited boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_query text := left(btrim(coalesce(p_query, '')), 120);
begin
  if not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  return query select m.id, m.first_name, m.last_name, m.email, m.phone, m.address, m.membership_status, m.last_contact_at, (select max(vr.visited_at) from public.visit_records vr where vr.member_id = m.id), (select count(*) from public.visit_records vr where vr.member_id = m.id), exists(select 1 from public.visit_records vr where vr.member_id = m.id and vr.outcome = 'completed') from public.members m where m.organization_id = public.current_org_id() and (v_query = '' or concat_ws(' ', m.first_name, m.last_name) ilike '%' || v_query || '%' or coalesce(m.email, '') ilike '%' || v_query || '%' or coalesce(m.phone, '') ilike '%' || v_query || '%') order by m.last_name, m.first_name limit 200;
end;
$$;

create or replace function public.create_member_record(p_first_name text, p_last_name text, p_email text, p_phone text, p_address text, p_membership_status text, p_last_contact_at text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_status text := lower(coalesce(p_membership_status, 'active'));
begin
  if not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if char_length(btrim(coalesce(p_first_name, ''))) not between 1 and 80 or char_length(btrim(coalesce(p_last_name, ''))) not between 1 and 80 then raise exception 'invalid member name'; end if;
  if v_status not in ('active', 'inactive', 'prospective') then raise exception 'invalid membership status'; end if;
  insert into public.members (organization_id, first_name, last_name, email, phone, address, membership_status, last_contact_at, created_by) values (public.current_org_id(), btrim(p_first_name), btrim(p_last_name), nullif(btrim(coalesce(p_email, '')), ''), nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_address, '')), ''), v_status, case when nullif(btrim(coalesce(p_last_contact_at, '')), '') is null then null else p_last_contact_at::timestamptz end, public.current_actor_id()) returning id into v_id;
  perform public._write_audit('MEMBER_CREATED', 'member', v_id, 'success', jsonb_build_object('membership_status', v_status)); return v_id;
end;
$$;

create or replace function public.bulk_import_member_records(p_rows jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row jsonb; v_count integer := 0; v_batch uuid := gen_random_uuid(); v_status text;
begin
  if not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then raise exception 'import must contain 1 to 500 rows'; end if;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_status := lower(coalesce(v_row ->> 'membership_status', 'active')); if v_status not in ('active', 'inactive', 'prospective') then v_status := 'active'; end if;
    if char_length(btrim(coalesce(v_row ->> 'first_name', ''))) not between 1 and 80 or char_length(btrim(coalesce(v_row ->> 'last_name', ''))) not between 1 and 80 then raise exception 'every imported row requires first and last name'; end if;
    insert into public.members (organization_id, first_name, last_name, email, phone, address, membership_status, last_contact_at, imported_at, import_batch_id, created_by) values (public.current_org_id(), btrim(v_row ->> 'first_name'), btrim(v_row ->> 'last_name'), nullif(btrim(coalesce(v_row ->> 'email', '')), ''), nullif(btrim(coalesce(v_row ->> 'phone', '')), ''), nullif(btrim(coalesce(v_row ->> 'address', '')), ''), v_status, case when nullif(btrim(coalesce(v_row ->> 'last_contact_at', '')), '') is null then null else (v_row ->> 'last_contact_at')::timestamptz end, now(), v_batch, public.current_actor_id()); v_count := v_count + 1;
  end loop;
  perform public._write_audit('MEMBERS_IMPORTED', 'member_import', v_batch, 'success', jsonb_build_object('row_count', v_count)); return v_count;
end;
$$;

create or replace function public.search_care_people(p_query text default '', p_include_members boolean default false)
returns table(person_type text, id uuid, display_name text, secondary_text text, contact_text text, last_visited_at timestamptz, visit_count bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_query text := left(btrim(coalesce(p_query, '')), 120); v_uuid uuid;
begin
  if public.current_app_role() not in ('administrator', 'pastor', 'usher') then raise exception 'authorization denied'; end if;
  begin v_uuid := v_query::uuid; exception when others then v_uuid := null; end;
  return query select 'visitor'::text, v.id, coalesce(nullif(v.preferred_name, ''), v.full_name), concat('First visit ', v.first_visit_date::text), v.optional_contact, (select max(r.visited_at) from public.visit_records r where r.visitor_id = v.id), (select count(*) from public.visit_records r where r.visitor_id = v.id) from public.visitors v where v.organization_id = public.current_org_id() and v.active and v.anonymized_at is null and (v_query = '' or v.id = v_uuid or v.full_name ilike '%' || v_query || '%' or coalesce(v.preferred_name, '') ilike '%' || v_query || '%')
  union all select 'member'::text, m.id, concat_ws(' ', m.first_name, m.last_name), m.membership_status, coalesce(m.email, m.phone), (select max(r.visited_at) from public.visit_records r where r.member_id = m.id), (select count(*) from public.visit_records r where r.member_id = m.id) from public.members m where p_include_members and public.is_pastor_or_admin() and m.organization_id = public.current_org_id() and (v_query = '' or m.id = v_uuid or concat_ws(' ', m.first_name, m.last_name) ilike '%' || v_query || '%') order by display_name limit 100;
end;
$$;

create or replace function public.care_notes_for_person(p_person_type text, p_person_id uuid)
returns table(id uuid, note_text text, status text, visibility text, created_at timestamptz, created_by_name text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if public.current_app_role() not in ('administrator', 'pastor', 'usher') then raise exception 'authorization denied'; end if; if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  return query select n.id, n.note_text, n.status, n.visibility, n.created_at, p.display_name from public.care_notes n join public.user_profiles p on p.id = n.created_by where n.organization_id = public.current_org_id() and ((p_person_type = 'visitor' and n.visitor_id = p_person_id) or (p_person_type = 'member' and n.member_id = p_person_id)) and (public.is_pastor_or_admin() or (n.visitor_id is not null and n.visibility = 'assigned_team')) order by n.created_at desc limit 200;
end;
$$;

create or replace function public.visits_for_person(p_person_type text, p_person_id uuid)
returns table(id uuid, visited_at timestamptz, outcome text, summary text, visited_by_name text)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if public.current_app_role() not in ('administrator', 'pastor', 'usher') then raise exception 'authorization denied'; end if; if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if;
  return query select r.id, r.visited_at, r.outcome, r.summary, p.display_name from public.visit_records r join public.user_profiles p on p.id = r.visited_by where r.organization_id = public.current_org_id() and ((p_person_type = 'visitor' and r.visitor_id = p_person_id) or (p_person_type = 'member' and r.member_id = p_person_id)) order by r.visited_at desc limit 200;
end;
$$;

create or replace function public.add_person_care_note(p_person_type text, p_person_id uuid, p_note_text text, p_visibility text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_visibility text := lower(coalesce(p_visibility, 'assigned_team'));
begin
  if public.current_app_role() not in ('administrator', 'pastor', 'usher') then raise exception 'authorization denied'; end if; if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if; if public.current_app_role() = 'usher' then v_visibility := 'assigned_team'; end if; if v_visibility not in ('assigned_team', 'pastoral_team', 'admin_only') then raise exception 'invalid visibility'; end if; if v_visibility = 'admin_only' and not public.is_admin() then raise exception 'authorization denied'; end if; if char_length(btrim(coalesce(p_note_text, ''))) not between 2 and 5000 then raise exception 'invalid note'; end if;
  insert into public.care_notes (organization_id, visitor_id, member_id, note_text, visibility, created_by) values (public.current_org_id(), case when p_person_type = 'visitor' then p_person_id else null end, case when p_person_type = 'member' then p_person_id else null end, btrim(p_note_text), v_visibility, public.current_actor_id()) returning id into v_id;
  perform public._write_audit('CARE_NOTE_CREATED', 'care_note', v_id, 'success', jsonb_build_object('person_type', p_person_type, 'visibility', v_visibility)); return v_id;
end;
$$;

create or replace function public.record_ministry_visit(p_person_type text, p_person_id uuid, p_outcome text, p_summary text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_outcome text := lower(coalesce(p_outcome, 'completed'));
begin
  if public.current_app_role() not in ('administrator', 'pastor', 'usher') then raise exception 'authorization denied'; end if; if p_person_type = 'member' and not public.is_pastor_or_admin() then raise exception 'authorization denied'; end if; if v_outcome not in ('planned', 'attempted', 'completed', 'follow_up_needed') then raise exception 'invalid visit outcome'; end if; if char_length(coalesce(p_summary, '')) > 2000 then raise exception 'visit summary is too long'; end if;
  insert into public.visit_records (organization_id, visitor_id, member_id, visited_by, outcome, summary) values (public.current_org_id(), case when p_person_type = 'visitor' then p_person_id else null end, case when p_person_type = 'member' then p_person_id else null end, public.current_actor_id(), v_outcome, nullif(btrim(coalesce(p_summary, '')), '')) returning id into v_id;
  perform public._write_audit('MINISTRY_VISIT_RECORDED', 'visit_record', v_id, 'success', jsonb_build_object('person_type', p_person_type, 'outcome', v_outcome)); return v_id;
end;
$$;

create or replace function public.list_staff_role_requests()
returns table(user_id uuid, display_name text, email text, requested_role text, role_status text, church_name text, pastor_name text, district text, denomination text, church_phone text, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'authorization denied'; end if;
  return query select p.id, p.display_name, u.email::text, p.requested_role, p.role_status, a.church_name, a.pastor_name, a.district, a.denomination, a.church_phone, a.submitted_at from public.user_profiles p join auth.users u on u.id = p.id left join public.pastor_applications a on a.profile_id = p.id where p.organization_id = public.current_org_id() and p.role_status = 'pending' order by coalesce(a.submitted_at, p.created_at);
end;
$$;

create or replace function public.review_staff_role_request(p_user_id uuid, p_approved boolean, p_notes text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_requested text; v_org uuid := public.current_org_id();
begin
  if not public.is_admin() then raise exception 'authorization denied'; end if; if p_user_id = public.current_actor_id() then raise exception 'self approval is not permitted'; end if;
  select requested_role into v_requested from public.user_profiles where id = p_user_id and organization_id = v_org and role_status = 'pending' for update; if not found then raise exception 'role request unavailable'; end if; if v_requested not in ('usher', 'pastor', 'administrator') then raise exception 'invalid requested role'; end if;
  update public.user_profiles set role = case when p_approved then v_requested::public.app_role else 'usher'::public.app_role end, role_status = case when p_approved then 'approved' else 'rejected' end, active = true, auth_not_before = now(), updated_at = now() where id = p_user_id and organization_id = v_org;
  update public.pastor_applications set reviewed_at = now(), reviewed_by = public.current_actor_id(), verification_notes = nullif(btrim(coalesce(p_notes, '')), '') where profile_id = p_user_id;
  perform public._write_audit(case when p_approved then 'ROLE_REQUEST_APPROVED' else 'ROLE_REQUEST_REJECTED' end, 'user_profile', p_user_id, 'success', jsonb_build_object('requested_role', v_requested));
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_org_id uuid := public.current_org_id(); v_old_role public.app_role; v_admin_count integer;
begin
  if not public.is_admin() then raise exception 'authorization denied'; end if; if p_user_id = public.current_actor_id() then raise exception 'self role changes are not permitted'; end if;
  select role into v_old_role from public.user_profiles where id = p_user_id and organization_id = v_org_id for update; if not found then raise exception 'user unavailable'; end if;
  if v_old_role = 'administrator' and p_role <> 'administrator' then select count(*) into v_admin_count from public.user_profiles where organization_id = v_org_id and role = 'administrator' and active; if v_admin_count <= 1 then raise exception 'cannot remove last active administrator'; end if; end if;
  update public.user_profiles set role = p_role, requested_role = case when p_role = 'pastor' then 'pastor' when p_role = 'administrator' then 'administrator' else 'usher' end, role_status = 'approved', auth_not_before = now(), updated_at = now() where id = p_user_id and organization_id = v_org_id;
  perform public._write_audit('USER_ROLE_CHANGED', 'user_profile', p_user_id, 'success', jsonb_build_object('old_role', v_old_role, 'new_role', p_role));
end;
$$;

revoke all on function public.ministry_dashboard_metrics() from public, anon;
revoke all on function public.search_member_records(text) from public, anon;
revoke all on function public.create_member_record(text,text,text,text,text,text,text) from public, anon;
revoke all on function public.bulk_import_member_records(jsonb) from public, anon;
revoke all on function public.search_care_people(text,boolean) from public, anon;
revoke all on function public.care_notes_for_person(text,uuid) from public, anon;
revoke all on function public.visits_for_person(text,uuid) from public, anon;
revoke all on function public.add_person_care_note(text,uuid,text,text) from public, anon;
revoke all on function public.record_ministry_visit(text,uuid,text,text) from public, anon;
revoke all on function public.list_staff_role_requests() from public, anon;
revoke all on function public.review_staff_role_request(uuid,boolean,text) from public, anon;
grant execute on function public.ministry_dashboard_metrics() to authenticated;
grant execute on function public.search_member_records(text) to authenticated;
grant execute on function public.create_member_record(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.bulk_import_member_records(jsonb) to authenticated;
grant execute on function public.search_care_people(text,boolean) to authenticated;
grant execute on function public.care_notes_for_person(text,uuid) to authenticated;
grant execute on function public.visits_for_person(text,uuid) to authenticated;
grant execute on function public.add_person_care_note(text,uuid,text,text) to authenticated;
grant execute on function public.record_ministry_visit(text,uuid,text,text) to authenticated;
grant execute on function public.list_staff_role_requests() to authenticated;
grant execute on function public.review_staff_role_request(uuid,boolean,text) to authenticated;
