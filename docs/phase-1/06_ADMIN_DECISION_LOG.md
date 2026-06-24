# 6. Church Administrator Decision Log

The following items require an accountable church decision. “Blocking” means implementation or production deployment should not proceed past the stated gate without an answer.

| ID | Decision | Recommended starting position | Blocking gate |
|---|---|---|---|
| D-01 | What legal entity/church owns and controls the data? | Name one accountable organization and system owner | Phase 2 |
| D-02 | Where is the church, where are visitors located, and what privacy law applies? | Obtain qualified local privacy guidance; if Jamaica applies, review the Data Protection Act, 2020 and OIC duties | Phase 2/Production |
| D-03 | Is this a single church or multi-organization platform? | Start single organization but preserve `organization_id` and tenant isolation | Phase 2 |
| D-04 | What is the exact approved purpose? | Visitor recognition, service check-in, restricted operational summaries only | Phase 2 |
| D-05 | Are minors excluded? | Yes; do not record minors in this system | Phase 2 |
| D-06 | Is optional contact needed, and for what exact purpose? | Collect none unless a specific follow-up purpose is approved | Phase 2 |
| D-07 | Which contact types are permitted? | One optional email or phone field, not both by default | Phase 2 |
| D-08 | What retention schedule is approved? | Contact: 12 months; identity/attendance: 24 months after last attendance; audit: 24 months | Phase 3 |
| D-09 | Who handles correction/deletion requests? | Named privacy contact plus designated administrator | Production |
| D-10 | How are ushers authorized for services? | Explicit `user_service_assignments`; administrators may cover all own-organization services | Phase 2 |
| D-11 | What is the check-in window? | Configurable, e.g., 2 hours before to 4 hours after start; exact values require approval | Phase 2 |
| D-12 | Can ushers view the full current attendance list? | Only for assigned current service, with names and check-in time; no contact | Phase 2 |
| D-13 | What reports can auditors/leaders view? | Aggregate service/weekly reports only; no raw visitor list by default | Phase 2 |
| D-14 | Are raw exports genuinely required? | Disable initially; enable only for documented admin use | Phase 3 |
| D-15 | Who approves exports and what columns are allowed? | Named administrators, purpose selection, minimal columns, reauth, audit | Phase 3 |
| D-16 | What administrator MFA method is approved? | Authenticator app/TOTP or stronger; avoid SMS as the only factor where alternatives exist | Phase 3 |
| D-17 | What session limits are acceptable on tablets? | 20-minute idle; 8-hour absolute; 15-minute reauth freshness | Phase 3 |
| D-18 | Are church tablets managed? | Church-owned, PIN/biometric lock, auto-update, remote wipe/lock where feasible | Production |
| D-19 | What hosting/data region is permitted? | Region reviewed for legal, latency, and provider-contract implications | Phase 2 |
| D-20 | What availability objectives are required? | Initial RPO 24 hours, RTO 8 hours, then revise based on operational need | Phase 2 |
| D-21 | Who can access provider dashboards, secrets, and backups? | Two designated technical admins with MFA and separate accounts | Production |
| D-22 | What outage procedure will ushers follow? | Approved minimal paper tally or retry procedure that avoids creating uncontrolled personal-data copies | Production |
| D-23 | What minimum aggregate count should be suppressed to prevent inference? | Consider suppressing small groups under 5 in leader reports | Phase 3 |
| D-24 | What is the privacy-notice contact? | Named role-based email/phone, not a personal address where possible | Production |
| D-25 | Is a formal legal hold process needed? | Add if litigation, safeguarding, regulatory, or investigation obligations may apply | Phase 2 |
| D-26 | Who can accept security risk and approve production? | Named system owner/governing authority, separate from sole developer where possible | Production |

## Assumptions used for this Phase 1 draft

- The application is private and staff-only.
- Real visitor information will not be used in development or demonstration.
- Visitors are adults; minors are out of scope.
- The application may be designed tenant-aware, but initial deployment is for one organization.
- The church will use managed hosting, managed authentication, and managed PostgreSQL.
- Internet access is normally available during services.
- There is no requirement for offline storage.
- There is no requirement to collect pastoral notes, membership status, donations, or family relationships.
- Raw exports are disabled until a specific approved use is documented.
- The church will assign an accountable privacy contact and system owner before production.

If any assumption is false, Phase 2 architecture and risk analysis must be updated.
