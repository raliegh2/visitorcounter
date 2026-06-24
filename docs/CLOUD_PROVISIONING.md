# Cloud provisioning and production publication

## Required accounts

- A Supabase organization with a dedicated production project
- A Vercel team/project connected to the source repository
- A private GitHub repository with protected production secrets
- An approved SMTP provider for Supabase Auth email
- Monitoring and incident-notification services

## Secrets required by the deployment workflow

Store these in GitHub Actions production-environment secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REAUTH_COOKIE_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Do not place these values in source files, issue bodies, pull requests, screenshots, or chat.

## Supabase project settings

1. Create a project in the legally approved hosting region.
2. Disable public and anonymous signup.
3. Configure a 14-character minimum password.
4. Configure approved SMTP and password-recovery templates.
5. Allow only the exact staging and production `/auth/callback` URLs.
6. Enable TOTP enrollment and require administrators to complete it.
7. Configure the approved inactivity timeout and absolute session time-box.
8. Configure Auth rate limits and leaked-password protection where available.
9. Apply migrations through the protected production workflow.
10. Create the bootstrap administrator and immediately enroll MFA.

## Vercel project settings

1. Import the private repository using the Next.js preset.
2. Add the application environment variables for Production and Preview.
3. Mark server secrets as sensitive.
4. Configure the approved production domain.
5. Require successful GitHub checks before production promotion.
6. Enable deployment protection for preview environments where appropriate.
7. Verify the final HTTPS certificate and security headers.

## Release process

1. Merge an approved pull request into the protected main branch.
2. Create a release tag such as `v1.0.0`.
3. The workflow verifies source, previews and applies database migrations, then deploys the prebuilt Vercel application.
4. Run production smoke, role, RLS, recovery, and tablet checks.
5. Record the deployment URL, database migration version, tester, results, and approval.
