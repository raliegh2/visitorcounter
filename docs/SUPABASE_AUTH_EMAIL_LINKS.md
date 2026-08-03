# Reliable Supabase email links

The application accepts both legacy PKCE `code` callbacks and server-safe `token_hash` callbacks. New Supabase authentication emails should use the token-hash format so links work when opened from another browser, an email in-app browser, or another device.

## URL configuration

In **Supabase Dashboard → Authentication → URL Configuration**:

- Set **Site URL** to the production application origin, without a trailing slash.
- Add the production callback URL:
  - `https://YOUR_APP_DOMAIN/auth/callback`
- Add any approved preview callback pattern used for testing.

The application normalizes a trailing slash in `NEXT_PUBLIC_APP_URL`, but the dashboard value should still be stored without one.

## Magic Link template

In **Authentication → Email Templates → Magic Link**, replace the link target with:

```html
<h2>Sign in to Church Care Hub</h2>
<p>Use the secure link below to sign in. This link expires shortly and can only be used once.</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">
    Sign in securely
  </a>
</p>
```

`signInWithOtp` always supplies a `RedirectTo` containing a `next` query parameter, so appending the token fields with `&` is intentional.

## Confirm signup template

In **Authentication → Email Templates → Confirm signup**, use:

```html
<h2>Confirm your Church Care Hub account</h2>
<p>Confirm your email address to finish the access request.</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">
    Confirm email address
  </a>
</p>
```

## Reset password template

In **Authentication → Email Templates → Reset password**, use:

```html
<h2>Reset your password</h2>
<p>Use the secure link below to choose a new password.</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">
    Reset password
  </a>
</p>
```

## Invite user template

In **Authentication → Email Templates → Invite user**, use:

```html
<h2>You have been invited to Church Care Hub</h2>
<p>Use the secure link below to accept the invitation and set your password.</p>
<p>
  <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite">
    Accept invitation
  </a>
</p>
```

## Verification

After saving the templates:

1. Request a new email link. Previously issued links cannot be repaired.
2. Open it from a different browser or device.
3. Confirm the callback reaches the intended `next` page.
4. Confirm the Supabase Auth logs show a successful `verifyOtp` request and no failed authorization-code exchange.

Do not include access tokens, refresh tokens, authorization codes, or token hashes in application logs.
