# 5. Security Controls and Acceptance Criteria

## 5.1 Authentication controls

- Managed authentication; no custom password hashing.
- Individual accounts only.
- Administrator MFA mandatory.
- Secure invitation and password-reset links with short expiry and one-time use.
- Generic login/reset errors to reduce account enumeration.
- Rate limiting by account and network source, with temporary lockout and monitoring.
- Inactive profiles denied after authentication.
- Session rotation after login and privilege change.
- Administrator session revocation capability.
- No tokens in localStorage.
- Reauthentication for exports, role changes, retention execution, and destructive corrections.

**Recommended initial values for approval:**

- Idle timeout: 20 minutes on shared church devices.
- Absolute session lifetime: 8 hours.
- Reauthentication freshness for high-risk actions: 15 minutes.
- Temporary login lockout: after 5 failed attempts within 15 minutes, subject to managed-provider capabilities and denial-of-service review.

## 5.2 Authorization controls

- Central server authorization functions for role, active status, organization, service assignment, and action.
- Server actions/API routes deny by default.
- RLS enabled and forced on all protected tables.
- Cross-organization identifiers return a generic not-found/denied result.
- No role or organization accepted from form input as authoritative.
- Ushers cannot export, manage users, change roles, delete attendance, or read system-wide audit logs.
- Auditors cannot mutate data.
- Sensitive admin operations require MFA plus recent reauthentication.
- Periodic access review and immediate offboarding.

## 5.3 Data and application controls

- TLS only; HSTS after domain/TLS validation.
- Managed encryption at rest.
- Parameterized queries and strict schema validation.
- React/default output encoding; no unsafe HTML rendering.
- CSP with nonces/hashes as required; avoid broad `unsafe-inline`.
- `X-Content-Type-Options: nosniff`.
- Frame protection using CSP `frame-ancestors 'none'` or approved origin.
- Restrictive `Referrer-Policy`.
- CSRF protection using secure SameSite cookies, origin checks, and framework-supported anti-CSRF controls.
- Request body, field length, enum, date, and UUID validation.
- No mass assignment; map approved fields explicitly.
- No PII in URLs, logs, analytics, stack traces, or audit safe metadata.
- Secure production error pages and correlation IDs.
- Contact masking by default.
- Export files generated server-side, temporary, access-controlled, and audited.
- Dependency lockfile, pinned CI actions, SAST, secret scanning, dependency scanning, and migration review.

## 5.4 Audit and monitoring controls

Required events:

- Login success/failure and lockout
- Account invite, creation, disable, reactivation, and session revocation
- Role and service-assignment changes
- Visitor create/update/deactivate
- Attendance create and administrator correction
- Export request/success/failure/download
- Retention preview/approval/execution/failure
- Authorization denial and suspicious parameter tampering
- Security/privacy setting changes

Safe event fields:

- Event/action code
- Actor UUID
- Organization UUID
- Resource type and UUID
- Timestamp
- Outcome
- Request/correlation ID
- Limited reason code
- Source IP only if approved and retained proportionately

Prohibited event content:

- Passwords and reset links
- Authentication/access/refresh tokens
- Visitor names
- Contact values
- Raw form bodies
- Database connection strings
- Private keys or API secrets
- Sensitive free-text notes

## 5.5 Backup, recovery, and operational controls

- Automated encrypted backup policy.
- MFA and least privilege for provider dashboards.
- Separate recovery instructions and emergency contacts.
- Restore exercises documented with date, operator, backup used, results, defects, and approvals.
- Post-restore RLS and retention tests.
- Incident-response plan with account/session revocation, key rotation, containment, evidence preservation, notification assessment, and lessons learned.
- Lost-tablet procedure: lock device where managed, revoke user sessions, disable compromised account, review logs, and assess exposure.
- No unsupported offline spreadsheet copy as a continuity workaround.

## 5.6 Functional acceptance criteria

| ID | Testable acceptance criterion |
|---|---|
| AC-F01 | An authorized usher can register a fictional first-time visitor with minimum fields. |
| AC-F02 | Contact cannot be saved unless consent is true and approved purpose data is present. |
| AC-F03 | Search finds full and preferred names within the same organization only. |
| AC-F04 | Duplicate-name candidates are warned but legitimate duplicate names can be saved as separate UUIDs. |
| AC-F05 | An authorized usher can check in a visitor to an assigned open service. |
| AC-F06 | The same visitor cannot be checked into the same service twice. |
| AC-F07 | Two simultaneous duplicate check-in requests result in exactly one attendance row. |
| AC-F08 | First-time and returning counts are computed correctly for the selected service. |
| AC-F09 | An administrator can create/close a service and assign ushers. |
| AC-F10 | An administrator correction records actor, reason code, time, resource, and outcome. |
| AC-F11 | Retention preview and execution produce expected counts and audit records. |

## 5.7 Authorization acceptance criteria

| ID | Testable acceptance criterion |
|---|---|
| AC-A01 | Anonymous requests cannot read any protected record or report. |
| AC-A02 | An usher cannot invoke user, role, export, retention, audit, or attendance-delete functions through UI or direct requests. |
| AC-A03 | An auditor cannot create, update, or delete visitor/attendance data. |
| AC-A04 | A disabled user cannot establish a usable application session. |
| AC-A05 | A user cannot read or modify another organization’s rows even with valid UUIDs. |
| AC-A06 | Direct database/API requests remain blocked by RLS when UI controls are bypassed. |
| AC-A07 | An usher can check in only to an assigned and open service. |
| AC-A08 | Role change, export, and retention execution require administrator role, MFA, and recent reauthentication. |
| AC-A09 | The last active administrator cannot be removed through an ordinary unsafe workflow. |

## 5.8 Security acceptance criteria

| ID | Testable acceptance criterion |
|---|---|
| AC-S01 | SQL-injection payloads are treated as data and do not alter queries. |
| AC-S02 | XSS payloads in names/service labels render safely and cannot execute. |
| AC-S03 | Cross-site state-changing requests are rejected. |
| AC-S04 | Login rate limits and temporary lockout operate as approved. |
| AC-S05 | Idle timeout, absolute timeout, and session revocation invalidate access. |
| AC-S06 | Invalid UUIDs and object identifiers produce safe errors without internal detail. |
| AC-S07 | Parameter tampering and extra fields cannot change role, organization, creator, or protected attributes. |
| AC-S08 | Unauthorized export attempts are denied and logged. |
| AC-S09 | Required security headers are present and validated. |
| AC-S10 | Repository and build artifacts pass secret scanning. |
| AC-S11 | Critical/high dependency findings are resolved or formally risk-accepted before release. |
| AC-S12 | Production errors do not expose stack traces, SQL, secrets, or provider internals. |
| AC-S13 | Browser bundles contain no privileged key. |
| AC-S14 | Audit logs contain no visitor names/contact/tokens in sampled and automated tests. |

## 5.9 Data integrity and recovery acceptance criteria

| ID | Testable acceptance criterion |
|---|---|
| AC-D01 | Foreign keys prevent orphan visitor, service, user, and attendance references. |
| AC-D02 | Cross-organization foreign relationships are rejected. |
| AC-D03 | Failed multi-step operations roll back completely. |
| AC-D04 | Audit events are generated for required successful, failed, and denied actions. |
| AC-D05 | Normal users cannot update or delete audit logs. |
| AC-D06 | Retention execution is idempotent or safely resumable. |
| AC-D07 | Backup restoration completes in an isolated environment and meets approved RPO/RTO. |
| AC-D08 | Restored data passes RLS, integrity, authentication, and retention-reconciliation tests. |

## 5.10 Production security gate

The system must not be called production-ready until:

1. Critical functional and authorization tests pass.
2. No unresolved critical security finding remains.
3. High findings are fixed or explicitly accepted by the accountable owner.
4. RLS is reviewed independently and negative-tested.
5. Dependency, SAST, and secret scans pass policy.
6. Security headers and deployment configuration are verified.
7. MFA, rate limits, session settings, and offboarding are tested.
8. Privacy notice and retention policy are approved.
9. Access review is completed.
10. A documented backup restore succeeds.
