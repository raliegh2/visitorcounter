# 1. Requirements Specification

## 1.1 Purpose and scope

The Church Visitor Attendance System will be a private, staff-only web application for registering first-time visitors, locating returning visitors, checking visitors into a church service, viewing role-appropriate attendance information, and administering users, services, reports, corrections, retention, and security.

The system is not a church membership database, pastoral-care system, donor system, child-management system, counseling system, or prayer-request repository. Those purposes require separate approval, safeguards, and data models.

## 1.2 Stakeholders

| Stakeholder | Interest |
|---|---|
| Church governing body/system owner | Accountable use, policy approval, funding, and risk acceptance |
| Church administrator | User, service, correction, report, retention, and security administration |
| Ushers | Fast and reliable visitor registration and check-in |
| Auditor/read-only leader | Approved aggregate or read-only oversight |
| Visitors/data subjects | Fair notice, privacy, accuracy, correction, deletion, and secure handling |
| Privacy contact/data protection officer | Privacy compliance, requests, impact assessment, and breach coordination |
| Technical administrator/provider | Secure deployment, backup, monitoring, maintenance, and recovery |

## 1.3 Functional requirements

### Authentication and account lifecycle

- **FR-001:** The system shall deny access to all visitor, attendance, service, report, user, and audit data unless the requester has an authenticated, active account.
- **FR-002:** Every staff member shall use an individual account; shared usher accounts shall be prohibited.
- **FR-003:** Administrators shall use multi-factor authentication.
- **FR-004:** The system shall support secure invitation, password reset, account disabling, and session revocation through managed authentication.
- **FR-005:** A deactivated user shall be unable to establish a new session, and existing sessions shall be revocable.
- **FR-006:** Authentication failures shall use generic error messages and be rate-limited.

### Visitor registration and search

- **FR-010:** An authorized usher or administrator shall be able to register a first-time visitor using the approved minimum data fields.
- **FR-011:** Before registration, the system shall search for possible duplicates using normalized name matching and present a warning without asserting that two people are the same.
- **FR-012:** Duplicate names shall be permitted and distinguished by UUID, first-visit date, preferred name, and limited contextual information.
- **FR-013:** Names shall never be used as record identifiers or uniqueness constraints.
- **FR-014:** Optional contact information shall be collected only when the visitor gives clear consent for an approved purpose.
- **FR-015:** The registration workflow shall clearly distinguish first-time registration from returning-visitor check-in.
- **FR-016:** Authorized users shall be able to search active visitors by full or preferred name.
- **FR-017:** Search results shown to ushers shall contain only the minimum information needed to choose the correct record.
- **FR-018:** Administrators shall be able to correct visitor records, with the change and outcome recorded in the audit trail.
- **FR-019:** Records shall use soft deactivation when immediate physical deletion would conflict with audit or retention duties.

### Services and check-in

- **FR-020:** An administrator shall be able to create, update, activate, close, or cancel a service.
- **FR-021:** Each service shall belong to exactly one organization and have a name, date, start time, status, creator, and timestamps.
- **FR-022:** Ushers shall record attendance only for services for which they are authorized.
- **FR-023:** An authorized user shall be able to check an active visitor into an open/authorized service.
- **FR-024:** The database shall prevent the same visitor from being checked into the same service more than once, including under concurrent requests.
- **FR-025:** A successful check-in shall give a clear, accessible confirmation.
- **FR-026:** A duplicate check-in attempt shall return a safe, user-friendly message without creating a second record.
- **FR-027:** Attendance shall be represented only by a positive check-in record. The system shall not create an “absent” row for every visitor.
- **FR-028:** Non-attendance shall be calculated from the absence of an attendance record.
- **FR-029:** Attendance corrections shall be restricted to administrators and shall be auditable.
- **FR-030:** The current attendance list shall be limited by role and service authorization.

### Dashboards and reports

- **FR-040:** The current-service dashboard shall show role-appropriate counts for total attendance, first-time visitors, and returning visitors.
- **FR-041:** Approved reports may include weekly trends, service comparison, and visitors not seen during a configurable period.
- **FR-042:** Charts and summary widgets shall not expose names or contact details.
- **FR-043:** Ushers shall not export raw visitor or attendance data.
- **FR-044:** Read-only leaders shall view only approved reports and shall not modify visitor or attendance records.
- **FR-045:** Raw-data export shall be restricted to authorized administrators, require recent reauthentication, and create an audit event.
- **FR-046:** Export files shall contain only approved columns and shall expire or be deleted after an approved short period.
- **FR-047:** Reports shall enforce organization boundaries and the requesting user’s role.

### Audit, privacy, retention, and requests

- **FR-050:** The system shall log login successes/failures, lockouts, authorization failures, user lifecycle actions, role changes, visitor creation/modification, attendance corrections, exports, retention actions, and security-setting changes.
- **FR-051:** Audit metadata shall not contain visitor names, contact details, passwords, tokens, secrets, or raw request bodies.
- **FR-052:** Normal application users shall not be able to update or delete audit-log records.
- **FR-053:** Administrators shall be able to configure approved retention values within policy-controlled bounds.
- **FR-054:** Retention runs shall support review, approval, execution, and audit.
- **FR-055:** Deletion shall remove or irreversibly anonymize personal identifiers when the approved purpose and retention period end, subject to legal holds and audit-integrity needs.
- **FR-056:** The system shall support documented correction and deletion-request workflows.
- **FR-057:** Aggregate statistics may be retained only after they are irreversibly de-identified.
- **FR-058:** Privacy and retention settings shall be visible only to authorized administrators.

### Administration

- **FR-060:** Administrators shall manage users, roles, service assignments, active status, and session revocation.
- **FR-061:** Role changes and account disabling shall require confirmation and recent reauthentication.
- **FR-062:** The system shall prevent the last active administrator from accidentally removing their own required administrative access without a controlled recovery process.
- **FR-063:** Administrative actions shall be denied by default unless explicitly permitted.
- **FR-064:** No privileged database credential or service-role key shall be sent to a browser.

## 1.4 User roles and permission matrix

| Capability | Administrator | Usher | Auditor/Read-only Leader |
|---|---:|---:|---:|
| Sign in with individual account | Yes | Yes | Yes |
| Register a visitor | Yes | Yes | No |
| Search visitors | Yes | Yes, minimum fields | No raw visitor search by default |
| Check in visitor | Yes | Yes, assigned/open services | No |
| View current attendance list | Yes | Assigned service only | Approved summary only |
| Create/manage services | Yes | No | No |
| Correct visitor record | Yes | No | No |
| Correct attendance | Yes | No | No |
| View aggregate reports | Yes | Limited current-service metrics | Yes, approved reports |
| Export raw personal data | Approved admins only | No | No, unless separately authorized |
| Manage users/roles | Yes | No | No |
| Configure retention | Yes | No | No |
| Review system-wide audit log | Yes | No | No |
| Delete/anonymize under retention workflow | Approved admins only | No | No |

A privacy officer or data protection officer is a governance responsibility. It does not automatically require a separate application role; the church may assign that responsibility to a tightly controlled administrator or introduce a dedicated role in Phase 2.

## 1.5 Core user stories

- **US-001:** As an usher, I can sign in with my own account so that my activity is attributable to me.
- **US-002:** As an usher, I can search for a returning visitor quickly so that check-in does not delay the service.
- **US-003:** As an usher, I receive a duplicate-name warning before creating a visitor so that I do not unintentionally create multiple records.
- **US-004:** As an usher, I can register a first-time visitor with only the approved minimum information.
- **US-005:** As an usher, I can check a visitor into an authorized current service and receive a clear confirmation.
- **US-006:** As an usher, I cannot see administrative controls, raw exports, full audit history, or unnecessary contact details.
- **US-007:** As an administrator, I can create services and assign ushers so that attendance can only be recorded for authorized gatherings.
- **US-008:** As an administrator, I can correct a record while preserving who changed it, when, why, and whether it succeeded.
- **US-009:** As an administrator, I can disable an account and revoke its sessions when a staff member leaves.
- **US-010:** As an administrator, I can run an approved retention process that deletes or anonymizes expired personal data.
- **US-011:** As an auditor/read-only leader, I can view approved summary reports without changing data or viewing unnecessary personal information.
- **US-012:** As a visitor, I can understand what information is collected, why, who can access it, how long it is kept, and how to request correction or deletion.

## 1.6 Business rules

- **BR-001:** A visitor is registered once when the church can reasonably identify an existing record; duplicate names remain permitted.
- **BR-002:** A service represents one church gathering.
- **BR-003:** Attendance is a link between one visitor and one service.
- **BR-004:** One visitor may have no more than one attendance row for the same service.
- **BR-005:** Absence is derived, not stored.
- **BR-006:** Ushers may check in only to authorized services within the permitted check-in window.
- **BR-007:** Corrections must be attributable, justified, and auditable.
- **BR-008:** Raw personal data is never public.
- **BR-009:** Only approved administrators may export personal data, and every export is logged.
- **BR-010:** Contact information is optional and purpose-limited.
- **BR-011:** Consent is required before optional contact information is stored.
- **BR-012:** Expired personal data is deleted or anonymized under an approved workflow.
- **BR-013:** Real personal data is prohibited in development, test, demonstrations, screenshots, and portfolio material.
- **BR-014:** Cross-organization access is prohibited even when record identifiers are known.
- **BR-015:** Client-side role checks are usability controls only; server and database enforcement are authoritative.

## 1.7 Non-functional requirements

### Security and privacy

- **NFR-001:** Target OWASP ASVS 5.0.0 Level 2 overall, with higher-assurance controls for administrative actions, exports, audit logs, and retention.
- **NFR-002:** Apply deny-by-default access at the user interface, server, and database layers.
- **NFR-003:** Encrypt traffic with TLS and use managed encryption at rest.
- **NFR-004:** Keep secrets only in protected server-side environment configuration.
- **NFR-005:** Use parameterized database access and strict input schemas.
- **NFR-006:** Prevent PII from appearing in URLs, logs, analytics, error messages, and audit metadata.
- **NFR-007:** Support secure cookies, idle timeout, absolute session lifetime, session rotation/revocation, and reauthentication for high-risk actions.
- **NFR-008:** Apply CSRF protection, content security policy, HSTS, frame protection, content-type protection, and restrictive referrer policy.
- **NFR-009:** Pin dependencies and run automated SAST, dependency, and secret scanning.
- **NFR-010:** Maintain append-only audit behavior for normal application paths.

### Availability and recovery

- **NFR-020:** The application shall use managed hosting and managed PostgreSQL with documented backup capability.
- **NFR-021:** Backup access shall be restricted and encrypted.
- **NFR-022:** Recovery objectives shall be approved before production.
- **NFR-023:** Production readiness requires a successful documented restore test.
- **NFR-024:** Critical check-in operations shall fail safely and avoid partial writes.
- **NFR-025:** Service status and database health shall be monitored without collecting unnecessary personal data.

### Performance and usability

- **NFR-030:** The interface shall be mobile and tablet responsive.
- **NFR-031:** Touch targets shall be large and workflows shall minimize typing.
- **NFR-032:** Search and check-in should feel immediate under the approved expected load; measurable performance thresholds will be set after expected volume is confirmed.
- **NFR-033:** All controls shall have accessible labels and support keyboard navigation.
- **NFR-034:** Success, loading, empty, validation, authorization, and system-failure states shall be clear.
- **NFR-035:** Destructive actions shall require confirmation.
- **NFR-036:** Sensitive data shall not remain visible longer than necessary on shared tablets.

### Maintainability and assurance

- **NFR-040:** TypeScript strict mode shall be enabled.
- **NFR-041:** UI, business logic, authorization, and data-access concerns shall be separated.
- **NFR-042:** Database changes shall use reviewed migrations.
- **NFR-043:** Security decisions shall be documented near non-obvious implementation points.
- **NFR-044:** Test data shall be fictional and deterministic.
- **NFR-045:** Releases shall pass functional, authorization, security, migration, and backup gates.

## 1.8 Data classification

| Classification | Examples | Handling |
|---|---|---|
| Restricted | Visitor name, preferred name, attendance history, optional contact, user identity mappings | Need-to-know access, encryption, RLS, minimal display, no public links, strict retention |
| Confidential | Roles, service assignments, security settings, audit events without PII, retention actions | Staff/admin access according to role, integrity controls, audit |
| Internal | De-identified aggregate attendance counts, system health metrics | Authenticated access unless approved for wider use |
| Public | Approved privacy notice and public contact channel | May be published after approval |

Visitor attendance can reveal religious association. It shall be treated as highly sensitive even where the applicable law uses different terminology.

## 1.9 Acceptance criteria summary

Phase 1 requirements will be considered accepted when:

1. The church approves the purpose, roles, minimum data, and prohibited data.
2. The applicable privacy jurisdiction and accountable data controller are identified.
3. Retention periods and deletion/anonymization rules are approved.
4. Service assignment, correction, and export workflows are approved.
5. Recovery objectives and hosting/data-region constraints are approved.
6. The security acceptance criteria in `05_SECURITY_CONTROLS_AND_ACCEPTANCE.md` are adopted.
7. Any unresolved blocking decisions are documented as formally accepted risks or assumptions.
