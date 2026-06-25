# Authorization Audit

Audit date: 2026-06-25

## Scope

- Application route guards and navigation
- Server actions and export endpoints
- Supabase Row-Level Security policies
- Security-definer RPC authorization checks
- Direct table and function grants for `anon` and `authenticated`
- Usher access to current and archived data

## Confirmed application controls

- Protected pages require an active profile.
- Administrative pages call `requireAdminAal2()`.
- Administrator actions require the administrator role and AAL2; sensitive actions also require recent password reauthentication.
- Usher pages are limited to dashboard, visitor search/registration, attendance view, and check-in.
- Reports are limited to administrators and auditors.
- Personal-data export is administrator-only and requires AAL2 plus recent reauthentication.
- Admin navigation is not rendered for ushers.

## Confirmed database controls

- Current production tables use RLS.
- Direct current-table access is restricted; ushers use controlled security-definer RPCs.
- Administrative RPCs verify administrator role and AAL2 in the database.
- Usher RPCs verify active role, organization, and service assignment.
- Visitor search omits optional contact data.
- Attendance correction, user management, service management, retention, audit access, and export are administrator-only.

## Finding and remediation

Archived `legacy_*` tables, a legacy view, and legacy helper functions retained obsolete grants and policies for authenticated users. These objects are not used by the current application, but their exposure created a direct-API authorization risk.

Migration `202606250004_harden_usher_authorization.sql`:

- Removes all RLS policies from archived tables.
- Revokes all anonymous and authenticated privileges on archived tables and the archived view.
- Revokes API execution of legacy and trigger-only functions.
- Removes anonymous access to current authorization helper functions.
- Preserves authenticated execution only for the current controlled authorization helpers and application RPCs.

## Regression testing

`supabase/tests/authorization.test.sql` verifies:

- Authenticated users cannot read archived data.
- Archived policies are absent.
- Legacy helper functions are not executable by authenticated users.
- Anonymous users cannot execute authorization helpers.
- Authenticated ushers retain access to the controlled service, visitor-search, and check-in RPCs.

## Authorization matrix

| Capability | Administrator | Usher | Auditor |
|---|---:|---:|---:|
| Dashboard aggregates | Yes | Assigned services only | Yes |
| Search/register visitors | Yes | Assigned services only | No |
| View/check in attendance | Yes | Assigned services only | No |
| Correct attendance | Yes, AAL2 + reauth | No | No |
| Manage services/assignments | Yes, AAL2 | No | No |
| View aggregate reports | Yes | No | Yes |
| Export personal data | Yes, AAL2 + reauth | No | No |
| Manage users and roles | Yes, AAL2 + reauth | No | No |
| View audit logs | Yes, AAL2 | No | No |
| Manage retention | Yes, AAL2 | No | No |
| Read archived legacy data | No through application/API | No | No |
