# Deployment guide

## Recommended services

- managed Next.js hosting with enforced HTTPS;
- a dedicated Supabase production project in an approved region;
- a paid database plan appropriate for backup and recovery requirements;
- external uptime and error monitoring;
- a transactional email provider configured through Supabase Auth.

## Deployment sequence

1. Confirm the legal/privacy jurisdiction, controller, hosting region, retention periods, RPO, and RTO.
2. Create separate development, staging, and production Supabase projects.
3. Restrict dashboard access and enable administrator MFA.
4. Apply migrations to staging with `supabase db push`.
5. Generate database types and commit the generated file.
6. configure email templates, password rules, redirect allow-list, CAPTCHA/rate limits, and SMTP;
7. deploy the Next.js application with only publishable values exposed to the browser;
8. store the service-role key in the host’s encrypted server-only secret store;
9. create the bootstrap administrator and enroll TOTP;
10. execute functional, authorization, RLS, security, accessibility, and tablet tests;
11. perform and document a backup restoration into an isolated project;
12. obtain administrator sign-off before entering real data.

## Required environment variables

See `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` through a
`NEXT_PUBLIC_` variable or client component.

## Security headers

The application uses a request-specific nonce CSP from `proxy.ts` plus HSTS,
frame denial, MIME-sniffing protection, a restrictive permissions policy, and
a no-store cache policy for authenticated routes.

## Rollback

- retain the previous immutable application deployment;
- use forward-only database correction migrations;
- do not roll back destructive retention actions;
- restore data only through the approved recovery process;
- record all emergency changes in the change log and incident record.
