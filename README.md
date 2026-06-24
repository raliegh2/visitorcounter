# Church Visitor Attendance System

A private, staff-only application for registering church visitors, checking them
into individual services, reviewing role-appropriate attendance information,
and administering users, corrections, retention, exports, and audit records.

## Production architecture

- Next.js App Router with strict TypeScript
- Supabase Auth with email/password recovery and TOTP MFA for administrators
- PostgreSQL with UUID keys, foreign keys, constraints, indexes, and transactional functions
- Row-Level Security and organization isolation
- Server Actions and Route Handlers for validated application operations
- Append-only application audit events
- Configurable retention and anonymization
- Responsive tablet and mobile interface
- Vitest, Playwright, pgTAP, CI, dependency auditing, and security headers

## Roles

- **Administrator:** users, roles, services, assignments, reports, corrections,
  retention, personal-data exports, and audit review. Administrative access
  requires AAL2 multi-factor authentication.
- **Usher:** search visitors, register first-time visitors, and check visitors
  into assigned services.
- **Read-only leader:** approved aggregate dashboard and attendance reports.

Authorization is enforced in the interface, Server Actions/Route Handlers,
PostgreSQL functions, grants, and Row-Level Security policies.

## Local setup

### Prerequisites

- Node.js 22 or later
- Docker Desktop
- Supabase CLI
- npm

### Install

```bash
cp .env.example .env.local
npm install
npm run db:start
npm run db:reset
```

Copy the local Supabase URL, publishable key, and service-role key printed by
`supabase start` into `.env.local`.

Create the first administrator:

```bash
set -a
. ./.env.local
set +a
npm run bootstrap:admin
```

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`, sign in with the bootstrap administrator, and
enroll a TOTP authenticator immediately.

## Required verification before real data

```bash
npm run lint
npm run typecheck
npm test
npm run db:test
npm run test:e2e
npm run build
npm run security:audit
```

A deployed environment must also pass:

1. administrator and usher access review;
2. cross-organization RLS testing;
3. secret scanning;
4. dependency vulnerability review;
5. HTTPS and security-header verification;
6. tablet usability and accessibility testing;
7. monitoring and incident-notification verification;
8. a successful backup restoration test.



## Automated production deployment

The repository includes:

- `.github/workflows/deploy-production.yml`
- `scripts/deployment-preflight.mjs`
- `scripts/deploy-supabase.mjs`
- `scripts/deploy-vercel.mjs`
- `vercel.json`

The workflow verifies the application, previews and applies Supabase database
migrations, builds with Vercel, and publishes a prebuilt production deployment.
See `DEPLOYMENT_REQUIRED.md` and `docs/CLOUD_PROVISIONING.md`.

## Important status

This repository is a production-oriented release candidate. It must not be
described as production-ready until a real Supabase project and hosting
environment are configured, all critical tests pass, the applicable privacy
jurisdiction is approved, and a backup has been restored successfully.
