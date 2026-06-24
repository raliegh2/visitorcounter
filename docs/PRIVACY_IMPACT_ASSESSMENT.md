# 2. Privacy Impact Assessment

## 2.1 Assessment summary

**Overall inherent privacy risk:** High  
**Reason:** The system combines identifiable names with repeated attendance at religious services. A disclosure could expose personal relationships or religious association. Optional contact information increases risk and therefore must remain genuinely optional, consent-based, purpose-limited, and separately protected.

**Target residual risk after controls:** Medium, subject to legal review, configuration review, access testing, and operational discipline.

## 2.2 Processing purpose

Approved primary purposes:

1. Identify first-time and returning adult visitors.
2. Record positive attendance at a specific church service.
3. Produce restricted operational and aggregate attendance reports.
4. Correct records, respond to privacy requests, and meet security/accountability requirements.

Prohibited secondary use without a new assessment and explicit approval:

- Membership profiling
- Pastoral/counseling profiling
- Fundraising or donation solicitation
- Political outreach
- Unrelated marketing
- Sharing with third parties
- Automated scoring or sensitive segmentation
- Recording children/minors
- Inferring beliefs beyond the fact of attendance

## 2.3 Minimum recommended data

### Visitor record

| Field | Required? | Purpose | Privacy note |
|---|---:|---|---|
| `id` (UUID) | Yes | Stable internal identifier | Never expose sequential identifiers |
| `organization_id` | Yes | Tenant isolation | Enforced by RLS |
| `full_name` | Yes | Search and identification | Restricted |
| `preferred_name` | No | Respectful display and duplicate handling | Restricted |
| `first_visit_date` | Yes | First-time/returning calculation | Date only unless a timestamp is necessary |
| `optional_contact` | No | Approved follow-up only | Store only with consent; mask by default |
| `contact_consent` | Conditional | Proof that contact storage was authorized | Must be true if contact exists |
| `contact_consent_at` | Recommended | Accountability | Add in Phase 2 |
| `contact_purpose` | Recommended | Purpose limitation | Fixed approved enum, not free text |
| `active` | Yes | Soft deactivation | Not a substitute for retention deletion |
| `created_at`, `updated_at`, `created_by` | Yes | Integrity/accountability | `created_by` is a user UUID |

### Service and attendance

Only service identity, date/time, status, visitor UUID, check-in timestamp, and checking-in user UUID are needed. Do not add notes to attendance.

### User profile

Store only managed authentication identifier, organization, display name, role, active status, timestamps, and approved service assignments. Authentication secrets remain in the managed identity provider.

## 2.4 Data that shall not be collected

Unless a separate project, lawful purpose, assessment, and safeguards are approved, the system shall not collect:

- Home or work addresses
- Dates of birth or age
- National identification, passport, tax, driver’s licence, or other ID numbers
- Health, disability, or medical information
- Prayer requests
- Counseling, pastoral-care, confession, or safeguarding notes
- Financial, banking, donation, or card information
- Photographs, biometrics, or facial recognition data
- Information about minors
- Immigration or citizenship status
- Employment information
- Political opinions
- Family relationships
- Free-form “notes” fields
- Device fingerprinting or unnecessary analytics identifiers
- Precise geolocation
- Social-media profiles

## 2.5 Privacy principles and controls

| Privacy risk | Control |
|---|---|
| Excessive collection | Fixed schemas, no free-text notes, required field review |
| Unclear purpose | Privacy notice, purpose limitation, approved contact purpose |
| Unnecessary contact data | Optional field, explicit consent, mask by default, shorter retention |
| Insider browsing | Individual accounts, least privilege, service assignment, audit, periodic access review |
| Cross-organization disclosure | `organization_id` on every protected row, server checks, RLS |
| Data retained indefinitely | Configurable retention, review queue, deletion/anonymization, retention audit |
| Inaccurate records | Correction workflow, duplicate warning, auditable changes |
| Hidden secondary use | Governance approval required for any new use |
| Exposure in logs | Structured safe metadata with identifiers only; no names/contact/raw bodies |
| Public reporting | Aggregate-only reports with minimum-cell-size review if small groups could be identifiable |
| Lost tablet | Short idle timeout, secure cookie, remote account/session revocation, device controls |
| Export leakage | Admin-only, reauthentication, purpose selection, minimal columns, watermark/expiry where feasible, audit |

## 2.6 Recommended retention schedule for approval

These are starting recommendations, not legal conclusions:

| Data | Proposed default | End-of-period action |
|---|---:|---|
| Optional contact information | 12 months after last attendance or consent withdrawal, whichever is earlier | Delete contact value and consent metadata not required for proof/accountability |
| Visitor identity and detailed attendance | 24 months after last attendance | Delete or irreversibly anonymize unless an approved purpose/legal hold exists |
| De-identified aggregate attendance | Indefinite if re-identification is not reasonably possible | Retain as aggregate only |
| Audit logs | 24 months | Delete according to approved security/legal policy |
| Export files | Maximum 24 hours in managed temporary storage; local copies governed by export procedure | Automatic deletion from application storage |
| Disabled user profiles | 24 months after offboarding, retaining only identifiers necessary for audit linkage | Anonymize display data where feasible while preserving audit integrity |
| Backup copies | Provider schedule aligned with retention, with expired data aging out | Verify deletion behavior and restoration implications |

The church may choose a different schedule, but every period needs a documented purpose and owner. “Keep forever” is not an acceptable default.

## 2.7 Correction and deletion requests

1. Publish a privacy contact channel.
2. Verify the requester proportionately without collecting unnecessary identity documents.
3. Locate records by internal identifiers and approved search.
4. Record the request without copying unnecessary personal details into audit metadata.
5. Determine whether correction, deletion, restriction, or anonymization applies.
6. Obtain approval from the designated privacy administrator.
7. Execute within the approved legal/policy period.
8. Record the action type, actor, timestamp, reason code, and outcome.
9. Explain any lawful refusal or limitation to the requester.
10. Consider backup reappearance: restored backups must rerun retention/deletion jobs before normal use.

## 2.8 Jurisdiction assessment

The church’s physical location, the visitors’ locations, the legal entity operating the system, and the hosting/data-processing locations must be confirmed before production.

If the church and processing are in Jamaica, the church should obtain qualified guidance on the Data Protection Act, 2020 and Office of the Information Commissioner requirements. The production policy should address fairness/lawfulness, purpose limitation, minimization, accuracy, security, storage limitation, data-subject rights, controller registration where applicable, impact-assessment obligations, and breach reporting. This document is a technical/privacy design assessment, not legal advice.

## 2.9 Privacy notice draft

### Church Visitor Attendance Privacy Notice

**What we collect**  
We collect your name, preferred name if provided, the date of your first visit, and the church services you attend. You may choose to provide contact information for the specific follow-up purpose explained to you. Contact information is optional.

**Why we collect it**  
We use this information to recognize first-time and returning visitors, record service attendance, support approved church administration, maintain accurate records, and produce restricted attendance summaries.

**What we do not collect in this system**  
This system is not used for addresses, dates of birth, identification numbers, health information, prayer requests, counseling notes, financial information, or information about minors.

**Who can access it**  
Authorized staff members receive individual accounts. Ushers see only information needed for registration and check-in. Administrators have additional access for approved corrections, user management, reports, retention, and security. Approved leaders may see summary reports without raw personal data.

**How long we keep it**  
We keep information only for the approved retention period. The proposed default is 12 months for optional contact information and 24 months after the last attendance for identifiable visitor and attendance records, subject to the church’s approved policy and applicable law. De-identified totals may be retained longer.

**Corrections and deletion**  
You may ask us to correct inaccurate information or request deletion where applicable. Contact: **[INSERT PRIVACY CONTACT]**. We will verify and process requests according to the church’s policy and applicable law.

**Security and sharing**  
The system is private and access-controlled. We do not make raw visitor attendance public. We do not sell visitor data. Any approved export is restricted and logged.

**Questions**  
Contact **[INSERT PRIVACY CONTACT, EMAIL, AND/OR PHONE]**.

## 2.10 Privacy acceptance criteria

- No optional contact can be saved when consent is false.
- Consent purpose and time can be demonstrated.
- Ushers see masked or no contact information unless operationally required and approved.
- No free-text notes exist in visitor or attendance workflows.
- Privacy notice is shown or made available at collection.
- Retention settings cannot be set to unlimited without an approved exception.
- A deletion/anonymization dry run can show affected record counts before execution.
- Restored backups trigger retention reconciliation before reopening access.
- Development/test environments contain fictional data only.
