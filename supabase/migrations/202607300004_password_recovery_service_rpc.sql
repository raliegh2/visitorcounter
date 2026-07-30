-- Service-role-only password recovery that is independent of hosted Auth
-- character-class settings and removes authenticator-app factors.
create or replace function public.reset_password_without_mfa(
  p_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  current_password_hash text;
begin
  if p_user_id is null then
    raise exception 'A user ID is required.' using errcode = '22023';
  end if;

  -- Supabase Auth bcrypt passwords support at most 72 bytes.
  if p_password is null or octet_length(p_password) < 12 or octet_length(p_password) > 72 then
    raise exception 'Password must contain between 12 and 72 characters.' using errcode = '22023';
  end if;

  select encrypted_password
    into current_password_hash
    from auth.users
   where id = p_user_id
   for update;

  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  if current_password_hash like '$2%'
     and extensions.crypt(p_password, current_password_hash) = current_password_hash then
    raise exception 'Choose a password that is different from your current password.' using errcode = '22023';
  end if;

  -- Match GoTrue's password-update sequence: replace the bcrypt hash, clear all
  -- pending identity-change tokens, and invalidate one-time tokens and sessions.
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         confirmation_token = '',
         confirmation_sent_at = null,
         recovery_token = '',
         recovery_sent_at = null,
         email_change_token_current = '',
         email_change_token_new = '',
         email_change_sent_at = null,
         phone_change_token = '',
         phone_change_sent_at = null,
         reauthentication_token = '',
         reauthentication_sent_at = null,
         updated_at = now()
   where id = p_user_id;

  delete from auth.one_time_tokens where user_id = p_user_id;

  -- Deleting sessions cascades to refresh tokens and MFA AMR claims.
  delete from auth.sessions where user_id = p_user_id;

  -- The application no longer offers Google Authenticator/TOTP. Deleting a
  -- factor cascades to its outstanding challenges.
  delete from auth.mfa_factors
   where user_id = p_user_id
     and factor_type = 'totp';
end;
$$;

revoke all on function public.reset_password_without_mfa(uuid, text) from public;
revoke all on function public.reset_password_without_mfa(uuid, text) from anon;
revoke all on function public.reset_password_without_mfa(uuid, text) from authenticated;
grant execute on function public.reset_password_without_mfa(uuid, text) to service_role;

comment on function public.reset_password_without_mfa(uuid, text) is
  'Resets a recovered user password with a 12-byte minimum, revokes sessions, and removes TOTP factors. Service role only.';
