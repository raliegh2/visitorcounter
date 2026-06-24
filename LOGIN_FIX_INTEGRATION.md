# RC3 Supabase Login Fix Integration

This branch restores the post-authentication portion of the RC3 login fix.

## Root cause

A Supabase session can be created successfully while the application still returns the user to the login page when the corresponding `public.profiles` row is missing or the application looks up the profile using the wrong identifier.

The production database uses:

- table: `public.profiles`
- primary key: `profiles.id`
- identity mapping: `profiles.id = auth.users.id`
- roles: `admin`, `pastor`, `usher`, and `member`
- active-account flag: `profiles.is_active`

## Files added

- `supabase/migrations/202606240001_login_profile_repair.sql`
- `lib/auth-profile.ts`
- `lib/supabase/server.ts`
- `app/(auth)/login/complete-authenticated-login.ts`

## Connect the existing login action

Keep the existing Supabase credential-validation call. Immediately after that call succeeds and a session has been established, invoke the RC3 transition helper:

```ts
import { completeAuthenticatedLogin } from "./complete-authenticated-login";

// After the existing Supabase sign-in operation succeeds:
return completeAuthenticatedLogin(formData.get("next"));
```

Do not perform a second profile lookup using an email address or a separately generated identifier. The helper resolves the authenticated user from the server-side Supabase session and looks up `profiles.id` using that user's UUID.

## Behavior

The helper:

1. validates the server-side Supabase session;
2. reads the profile using the authenticated UUID;
3. calls `ensure_current_user_profile()` only when the profile is missing;
4. accepts a repair role only from trusted JWT `app_metadata`;
5. rejects inactive accounts;
6. sends administrators to MFA until assurance level `aal2` is reached;
7. redirects successful non-administrator sessions to the requested internal path or `/dashboard`;
8. rejects external or malformed redirect targets.

## Error values

The login page should display a clear message for these query-string error values:

- `session_missing`: The session could not be verified. Sign in again.
- `account_setup`: The account exists, but its staff profile is incomplete. Ask an administrator to finish setup.
- `account_disabled`: This staff account is disabled. Contact an administrator.

## Database migration

The migration is committed but has not been applied to the remote Supabase project by this patch. Review it before applying it through the normal protected migration workflow.
