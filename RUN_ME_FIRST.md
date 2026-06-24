# Run this first

## Local development

1. Install Node.js 22 and Docker Desktop.
2. Copy `.env.example` to `.env.local`.
3. Run:

```bash
npm ci
npm run db:start
npm run db:reset
```

4. Copy the local Supabase keys printed by `supabase start` into `.env.local`.
5. Generate a random `REAUTH_COOKIE_SECRET` of at least 32 bytes.
6. Set the bootstrap organization and administrator values.
7. Load `.env.local` into your shell and run:

```bash
npm run bootstrap:admin
npm run dev
```

8. Sign in and enroll administrator TOTP MFA.
9. Invite separate usher and read-only leader accounts.

## Before real visitor data

Follow `docs/PRODUCTION_READINESS.md` and `docs/DEPLOYMENT_GUIDE.md`. Do not
enter real data until migrations, RLS, role workflows, HTTPS, monitoring,
privacy decisions, and a backup restoration have been verified.
