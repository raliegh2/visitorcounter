# Threat model

## Assets

- Visitor names and religious-attendance records
- Optional contact data
- Staff accounts, roles, and MFA factors
- Attendance integrity
- Audit and retention records
- Database, hosting, email, and backup credentials

## Main threats and controls

| Threat | Controls |
|---|---|
| Anonymous access | Proxy authentication gate, RLS, no anonymous table grants |
| Shared credentials | Individual invitations and account offboarding |
| Account takeover | Managed password hashing, reset flow, rate limits, admin TOTP |
| Broken access control | UI filtering, server role checks, database functions, RLS |
| Cross-organization access | Organization helper functions, scoped RLS, composite constraints |
| SQL injection | Typed Supabase client, parameterized RPC calls, no dynamic SQL |
| XSS | React output encoding, validation, nonce CSP, no stored notes/HTML |
| CSRF | SameSite cookies, Server Actions, same-origin check and POST-only export |
| Session theft | HTTP-only Auth cookies, TLS requirement, CSP, time-box/inactivity policy |
| Brute force | Supabase Auth rate limits and temporary provider enforcement |
| Insider misuse | Least privilege, service assignment, MFA, recent reauthentication, audit |
| Excessive export | Administrator + AAL2 + five-minute reauthentication + one-year limit + audit |
| Lost tablet | Short JWT, inactivity/time-box policy, remote account disable/session invalidation |
| Audit tampering | No normal-user writes; private audit function; provider governance |
| Unauthorized correction | Recently reauthenticated admin, void rather than deletion, reason required |
| Backup exposure | Encrypted managed backup, restricted access, isolated restoration test |
| Secret exposure | Server-only key, environment secret store, CI secret scanning |
| Dependency compromise | Exact versions, lockfile, audit gate, CodeQL/dependency review |
| Retention failure | Configurable preview, transaction, retention actions, scheduled audit purge |

## Residual risks

- Database owners and provider administrators remain privileged.
- Email compromise can affect recovery unless mailbox security is strong.
- A logged-in user can photograph or manually transcribe displayed data.
- Availability depends on managed hosting, Supabase, internet, and church connectivity.
- Legal/privacy obligations depend on the confirmed deployment jurisdiction.
