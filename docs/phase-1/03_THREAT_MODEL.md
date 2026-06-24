# 3. Threat Model

## 3.1 Method and scope

This threat model uses asset, actor, data-flow, and trust-boundary analysis, informed by OWASP ASVS, OWASP Top 10, NIST SSDF, the NIST Privacy Framework, defense in depth, zero-trust principles, least privilege, secure-by-default design, and deny-by-default authorization.

Scope includes the browser/tablet, Next.js application, managed authentication, PostgreSQL database and Row-Level Security, exports, audit logs, backups, administrative workflows, and third-party delivery/hosting services.

## 3.2 Critical assets

1. Visitor identity and optional contact information
2. Attendance history
3. User identities, roles, organization assignments, and service assignments
4. Authentication sessions and reset/invitation flows
5. Audit logs and retention records
6. Database credentials, service-role keys, signing secrets, and deployment secrets
7. Export files
8. Backups and recovery credentials
9. Application source, dependencies, CI/CD, and migrations
10. Availability of check-in during services

## 3.3 Threat actors

- External unauthenticated attacker
- Credential-stuffing or brute-force attacker
- Compromised staff account
- Malicious or curious insider
- Former staff member with lingering access
- Attacker with a lost/stolen church tablet
- Supply-chain attacker through a dependency or CI/CD secret
- Misconfigured administrator
- Compromised hosting, database, email, or backup provider account

## 3.4 Trust boundaries

1. Public internet to application edge
2. Browser to Next.js server
3. Next.js server to managed authentication
4. Application/user token to PostgreSQL RLS
5. Server-only privileged operations to database
6. Application to email/notification provider
7. Production database to backup storage
8. Production to logging/monitoring
9. Administrator export flow to temporary storage and recipient device
10. CI/CD to deployment environment and secrets

## 3.5 Risk scale

- **Likelihood:** Low, Medium, High
- **Impact:** Low, Medium, High, Critical
- **Priority:** Low, Moderate, High, Critical

## 3.6 Threat register

| ID | Threat | Likelihood | Impact | Priority | Required mitigations |
|---|---|---:|---:|---:|---|
| T-01 | Anonymous access to visitor/attendance data | Medium | Critical | Critical | Auth required on every route/action; server guards; RLS; automated anonymous tests |
| T-02 | Shared usher credentials destroy accountability | High without policy | High | Critical | Individual invitations; prohibit shared accounts; access reviews; disable generic accounts |
| T-03 | Account takeover/credential stuffing | High | High | Critical | Managed auth; MFA for admins; strong password controls; breached-password protection if available; rate limits; lockout; alerts |
| T-04 | Broken role or object-level authorization | Medium | Critical | Critical | Central authorization service; role and organization checks; service assignment; RLS; negative API tests |
| T-05 | Cross-organization data access | Medium | Critical | Critical | Organization ID on protected tables; immutable tenant context; RLS; cross-tenant tests; no client-supplied trusted organization |
| T-06 | SQL injection | Low with managed query layer | Critical | High | Parameterized queries; validated input; no string-built SQL; SAST and tests |
| T-07 | Stored/reflected XSS through names or service labels | Medium | High | High | React output encoding; schema limits; no unsafe HTML; CSP; security tests |
| T-08 | CSRF on state-changing operations | Medium | High | High | SameSite secure cookies; framework/server-action protections; origin checks/CSRF tokens where needed; tests |
| T-09 | Session theft or replay | Medium | High | High | HTTPS; HttpOnly/Secure/SameSite cookies; rotation; idle/absolute expiry; revoke; no localStorage tokens |
| T-10 | Brute force and enumeration | High | Medium/High | High | Generic errors; per-account/IP/device limits; temporary lock; monitoring; CAPTCHA only if necessary |
| T-11 | Malicious insider browses or exports data | Medium | Critical | Critical | Least privilege; masked contact; service scopes; admin reauth; export approval; audit; review alerts |
| T-12 | Accidental exposure on shared tablet | High | High | Critical | Minimal screens; auto-lock; short idle timeout; no browser password saving where managed; privacy screen/process; remote revocation |
| T-13 | Unauthorized attendance alteration/deletion | Medium | High | High | Admin-only correction workflow; reason codes; transactions; audit; no usher delete; database constraints |
| T-14 | Concurrent duplicate check-ins | High | Medium | High | Unique `(organization_id, visitor_id, service_id)` constraint; transaction; friendly conflict handling |
| T-15 | PII leakage through URLs/logs/analytics/errors | Medium | High | High | UUID routes; no names/contact in query strings; safe logs; sanitized errors; analytics disabled or minimized |
| T-16 | Database compromise | Low/Medium | Critical | Critical | Managed encryption; network controls; least-privileged roles; RLS; service-key isolation; monitoring; backups |
| T-17 | Exposed API/service key | Medium | Critical | Critical | Server-only environment secrets; CI secret scanning; key rotation; no browser bundle inclusion |
| T-18 | Insecure backup or failed restore | Medium | Critical | Critical | Encrypted managed backups; restricted access; off-site/provider copy; restore test; RPO/RTO |
| T-19 | Audit-log tampering | Medium | High | High | Insert-only controlled function; deny update/delete; separate retention; admin reads; provider/database monitoring |
| T-20 | Dependency or CI/CD compromise | Medium | Critical | Critical | Lockfile; pinned actions; dependency/SAST/secret scans; protected branches; least-privileged deployment tokens |
| T-21 | Excessive or insecure export | Medium | Critical | Critical | Admin-only; reauth; purpose and column selection; rate limit; temporary storage; audit; no emailed raw file by default |
| T-22 | Retention deletion removes wrong records | Low/Medium | Critical | High | Dry run; approval; transactions/batches; legal-hold check; audit; backup reconciliation |
| T-23 | Data restored after approved deletion | Medium | High | High | Document backup lifecycle; post-restore retention reconciliation; restricted recovery environment |
| T-24 | Availability failure during service | Medium | High | High | Managed hosting/database; health checks; safe retry; clear outage procedure; tested recovery |
| T-25 | Unauthorized role elevation | Medium | Critical | Critical | Admin reauth/MFA; server and RLS enforcement; immutable audit; no self-escalation; alerts |

## 3.7 Abuse cases

- An usher edits a request in browser developer tools to add `role=administrator`.
- An usher calls an administrator API directly even though the button is hidden.
- A user changes a visitor UUID to access another organization’s record.
- Two tablets check in the same visitor simultaneously.
- A malicious visitor enters `<script>` or markup in a name.
- An attacker submits SQL metacharacters in search.
- A former staff member uses a still-valid session after offboarding.
- An administrator creates a broad export and leaves it on a personal device.
- A backup restore reintroduces data previously deleted under retention.
- A log entry accidentally includes a full contact value or raw form body.

Each abuse case must become a negative automated or manual test in Phase 4.

## 3.8 Residual risks requiring governance

- Authorized staff can still see some sensitive information; training and disciplinary policy are necessary.
- A managed provider compromise cannot be eliminated; contracts, MFA, alerting, least privilege, and recovery reduce risk.
- Small aggregate counts may allow inference; report suppression rules may be needed.
- Exported data leaves application controls; export policy and approved devices are essential.
- Legal classification and obligations differ by jurisdiction and require qualified review.
- Availability depends on internet access; an approved outage procedure is needed without creating insecure offline copies.
