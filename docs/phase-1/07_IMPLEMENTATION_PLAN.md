# 7. Phased Implementation Plan

## Phase 1 — Requirements and risk assessment

**Completed in this package**

Deliverables:

- Requirements and user stories
- Role/permission matrix
- Business rules
- Data classification
- Privacy impact assessment
- Privacy notice draft
- Threat model
- Proposed architecture
- Preliminary database and RLS model
- Security acceptance criteria
- Decision log

**Exit gate:** Blocking administrator decisions resolved or formally accepted.

## Phase 2 — Architecture and prototype

Deliverables:

1. Approved user flows and tablet-first wireframes for all 11 required screens.
2. Final data dictionary and normalized ERD.
3. SQL migration set with tables, constraints, indexes, triggers/functions, and RLS.
4. RLS policy test harness.
5. API/server-action contract with input/output schemas and error model.
6. Authentication/session design, MFA enrollment, invitation, reset, and offboarding flows.
7. Deployment diagram, trust boundaries, secret inventory, and data-region decision.
8. Clickable prototype using fictional data only.
9. Updated privacy assessment and threat model based on final architecture.

**Exit gate:** Architecture, privacy, and security design review pass before production code expands.

## Phase 3 — Implementation

Suggested implementation sequence:

1. Repository, TypeScript strict settings, linting, tests, CI security scans, and environment template.
2. Supabase local/project configuration and reviewed migrations.
3. Managed authentication, secure cookies, profile bootstrap, active-user guard, and admin MFA.
4. Shared server authorization service.
5. Organization/service/assignment administration.
6. Visitor registration, consent validation, duplicate warning, and search.
7. Atomic attendance check-in with unique constraint and concurrency handling.
8. Role-appropriate dashboards and current attendance.
9. Correction workflow and controlled append-only audit function.
10. Approved reports.
11. Retention preview/approval/execution and privacy-request workflow.
12. Export feature only if D-14 and D-15 are approved.
13. Security headers, rate limits, monitoring, sanitized errors, and session revocation.
14. Fictional seed data and no real-person fixtures.

**Exit gate:** Code review, migration review, and automated test baseline pass.

## Phase 4 — Verification and testing

Deliverables:

- Functional test execution and results
- Authorization matrix tests through UI, server endpoint, and direct database/RLS paths
- Security tests for injection, XSS, CSRF, brute force, session handling, IDOR, mass assignment, tampering, headers, secrets, dependencies, and exports
- Data-integrity and concurrent check-in tests
- Audit-content review for accidental PII
- Accessibility and tablet usability test
- Performance test using approved expected volume
- Backup restore exercise
- Remaining-risk register and remediation evidence

**Exit gate:** Production security gate in `05_SECURITY_CONTROLS_AND_ACCEPTANCE.md` passes.

## Phase 5 — Deployment and operations

Deliverables:

- Production environment and domain/TLS configuration
- Environment/secrets configuration guide
- Provider account/MFA/access review
- Database backup and recovery configuration
- Monitoring and alert routing
- Incident-response guide
- Administrator and usher guides
- Privacy and retention policy approval
- Account offboarding procedure
- Change log and known limitations
- Go-live approval by accountable owner

**Exit gate:** Access, privacy, security, configuration, and recovery approvals completed.

## Phase 6 — Portfolio packaging

Only after the implementation and tests accurately support the claims:

- Sanitized project case study
- Architecture and security-control summary
- Fictional screenshots
- Skills and technologies demonstrated
- Challenges and solutions
- Resume bullets
- GitHub description
- Interview STAR response

No real visitor name, contact, attendance, church-sensitive configuration, key, URL, or production screenshot may appear in portfolio materials.

## Immediate next artifact set for Phase 2

- Wireframes for the 11 required screens
- Final PostgreSQL SQL migration
- Supabase RLS policies
- API/server-action specification
- Authentication/session configuration
- Test skeleton and security-control traceability matrix
