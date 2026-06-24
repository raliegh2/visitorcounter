begin;

create or replace function public.ensure_current_user_profile()
returns table (
  id uuid,
  role public.app_role,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  claims jsonb := auth.jwt();
  trusted_role_text text;
  trusted_role public.app_role;
  resolved_name text;
  resolved_email text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select p.id, p.role, p.is_active
  into id, role, is_active
  from public.profiles p
  where p.id = current_user_id;

  if found then
    return next;
    return;
  end if;

  trusted_role_text := lower(trim(claims -> 'app_metadata' ->> 'role'));

  if trusted_role_text is null
     or trusted_role_text not in ('admin', 'pastor', 'usher', 'member') then
    raise exception 'Account setup is incomplete.' using errcode = 'P0001';
  end if;

  trusted_role := trusted_role_text::public.app_role;
  resolved_email := nullif(trim(claims ->> 'email'), '');
  resolved_name := coalesce(
    nullif(trim(claims -> 'user_metadata' ->> 'full_name'), ''),
    nullif(split_part(coalesce(resolved_email, ''), '@', 1), ''),
    'Church Staff User'
  );

  insert into public.profiles (id, full_name, email, role, is_active)
  values (current_user_id, left(resolved_name, 120), resolved_email, trusted_role, true)
  on conflict (id) do nothing;

  return query
  select p.id, p.role, p.is_active
  from public.profiles p
  where p.id = current_user_id;
end;
$$;

revoke all on function public.ensure_current_user_profile() from public;
grant execute on function public.ensure_current_user_profile() to authenticated;

commit;
