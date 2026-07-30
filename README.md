# Church Care Hub

A private, staff-only ministry application for welcoming visitors, counting
service attendance, managing members, recording role-appropriate care and visit
follow-up, and administering users, approvals, retention, exports, and audit
records.

The application keeps the original Church Visitor Attendance System security
architecture while integrating the Church Care Hub workflows and purple
responsive design system into the existing Next.js project.

## Integrated features

- Visitor registration, duplicate-name checks, returning-visitor search, and service check-in
- Live first-time, returning, and total attendance counts
- Member directory and individual member creation
- CSV member imports, including CSV files exported from Excel or Google Sheets
- Visitor and member care notes with team, pastoral, and administrator visibility
- Completed ministry visit tracking
- Usher and pastor self-registration with email confirmation
- Administrator review of pastor church, district, denomination, supervisor, and phone details
- Role-aware dashboard metrics for visitors, members, care needs, and completed visits
- Responsive Church Care Hub navigation and authentication design

## Production architecture

- Next.js App Router with strict TypeScript
- Supabase Auth with email/password recovery and TOTP MFA for administrators
- PostgreSQL with UUID keys, foreign keys, constraints, indexes, and transactional functions
- Row-Level Security and organization isolation
- Server Actions and security-definer database functions for validated operations
- Append-only application audit events
- Configurable retention and anonymization
- Responsive desktop, tablet, and mobile interface
- Vitest, Playwright, pgTAP, CI, dependency auditing, and security headers

## Roles

- **Administrator:** users, pastor approvals, roles, services, assignments,
  members, care, reports, corrections, retention, personal-data exports, and
  audit review. Administrative access requires AAL2 multi-factor authentication.
- **Pastor:** visitor and attendance workflows plus member records, CSV member
  imports, pastoral care notes, and completed visits. Self-requested pastor
  access remains pending until an administrator verifies the submitted ministry
  details.
- **Usher:** search and register visitors, check visitors into assigned services,
  and record assigned-team visitor follow-up.
- **Read-only leader:** approved aggregate dashboard and attendance reports.

Authorization is enforced in the interface, Server Actions and Route Handlers,
PostgreSQL functions, grants, and Row-Level Security policies. A hidden navigation
item does not grant access; the database independently validates every protected
operation.

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

## Member import format

Export an Excel or Google Sheets directory as CSV. The importer accepts up to
500 rows per file and recognizes these headings and common variations:

```text
First Name,Last Name,Email,Phone,Address,Ministry,Date Joined
```

First Name and Last Name are required. The server validates every row again
before the audited database import executes.

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

1. administrator, pastor, usher, and read-only access review;
2. pending and rejected pastor-account isolation testing;
3. cross-organization RLS testing;
4. secret scanning;
5. dependency vulnerability review;
6. HTTPS and security-header verification;
7. tablet and mobile usability and accessibility testing;
8. monitoring and incident-notification verification;
9. a successful backup restoration test.

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
