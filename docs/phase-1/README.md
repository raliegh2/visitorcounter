# Church Visitor Attendance System — Phase 1 Package

**Status:** Phase 1 requirements and risk assessment completed  
**Implementation status:** No application code has been started in this package  
**Production status:** Not production-ready

This package completes the requested Phase 1 work:

1. Requirements and user stories
2. Role and permission model
3. Data classification and recommended fields
4. Privacy impact assessment and privacy notice draft
5. Threat model
6. Proposed architecture and database model
7. Security controls
8. Security acceptance criteria
9. Church administrator decision log
10. Phased implementation plan

## Documents

- `01_REQUIREMENTS.md`
- `02_PRIVACY_IMPACT_ASSESSMENT.md`
- `03_THREAT_MODEL.md`
- `04_ARCHITECTURE_AND_DATA_MODEL.md`
- `05_SECURITY_CONTROLS_AND_ACCEPTANCE.md`
- `06_ADMIN_DECISION_LOG.md`
- `07_IMPLEMENTATION_PLAN.md`
- `PHASE_1_CONSOLIDATED.md`

## Standards baseline

- OWASP Application Security Verification Standard (ASVS) 5.0.0, with Level 2 as the general verification target and higher-assurance controls for administration, exports, audit, and retention.
- OWASP Top 10:2025 as an awareness and test-coverage reference.
- NIST SP 800-218 Secure Software Development Framework (SSDF) Version 1.1 as the final baseline. SSDF 1.2 was an initial public draft when this document was prepared and should be monitored rather than treated as the final compliance baseline.
- NIST Privacy Framework 1.0 as the final baseline, while monitoring the Privacy Framework 1.1 initial public draft.
- Applicable privacy law must be confirmed before deployment.

## Phase 1 exit statement

The project may proceed to Phase 2 only after the blocking decisions in `06_ADMIN_DECISION_LOG.md` are resolved or formally accepted as documented assumptions.
