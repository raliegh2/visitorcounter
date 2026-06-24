# Complete test plan

## Functional tests

| ID | Scenario | Expected result |
|---|---|---|
| F-01 | Register a first-time visitor with minimum fields | Visitor and attendance commit together |
| F-02 | Register optional contact without consent | Rejected on client/server/database path |
| F-03 | Search a returning visitor | Authorized matches only; no contact displayed |
| F-04 | Enter an exact duplicate name | Warning shows record IDs and first/last-seen context |
| F-05 | Check in a returning visitor | One attendance row and confirmation |
| F-06 | Repeat the same check-in | Unique constraint/function blocks duplicate |
| F-07 | Two concurrent check-ins | One succeeds; one returns duplicate |
| F-08 | Create service | Administrator AAL2 only |
| F-09 | Assign and unassign usher | Availability changes for that usher |
| F-10 | Correct attendance | Recent admin reauth, reason, void fields, audit event |
| F-11 | Run aggregate report | Counts match active attendance |
| F-12 | Export attendance | Same-origin POST, recent reauth, CSV, audit event |
| F-13 | Change role/disable account | Recent reauth, old JWT denied |
| F-14 | Preview/apply retention | Counts previewed; approved rows purged/anonymized atomically |
| F-15 | Password recovery | Generic request response; approved callback; password changed |

## Authorization tests

- anonymous requests to every protected page and RPC;
- usher direct navigation to services, reports, users, audit, settings, and export;
- auditor attempts to search, register, check in, or mutate;
- deactivated profile with an existing Auth refresh token;
- role change while an older JWT is active;
- unassigned usher check-in;
- direct PostgREST table requests;
- organization A attempting UUIDs from organization B;
- AAL1 administrator attempting AAL2 functions;
- administrator without recent reauthentication attempting sensitive actions;
- service-role key absence from browser JavaScript and network responses.

## Security tests

- SQL metacharacters in every text and identifier field;
- stored/reflected XSS payloads;
- cross-site export POST and forged Server Action requests;
- open redirect attempts using `//host`, absolute URLs, and encoded variants;
- brute-force and credential-stuffing rate limits;
- password-reset enumeration;
- session inactivity, absolute expiry, single-session policy, and revocation;
- invalid UUIDs, object substitution, parameter pollution, and mass assignment;
- oversized fields and invalid dates;
- audit metadata prohibited-key attempts;
- dependency audit, CodeQL, secret scan, and generated client-bundle review;
- CSP, HSTS, frame denial, MIME, referrer, and permissions headers.

## Data-integrity tests

- all foreign keys;
- composite organization constraints;
- first-visit date equals selected service date;
- contact-consent constraint;
- duplicate attendance under concurrency;
- registration transaction rollback when attendance fails;
- correction consistency check;
- last-active-administrator protection;
- retention rollback on injected failure;
- audit event generation for all required actions.

## Recovery and availability tests

- health endpoint;
- database outage and generic user error;
- Auth outage;
- restore the latest encrypted backup into an isolated project;
- apply post-backup migrations;
- verify row counts, constraints, latest timestamps, RLS, and a fictional check-in;
- compare measured recovery time and data age to approved RTO/RPO.

## Usability and accessibility

- current Chrome, Edge, Safari, and Firefox;
- church tablet portrait and landscape;
- keyboard-only check-in;
- visible focus, label association, live confirmations, contrast;
- screen-reader navigation for login, visitor search, and registration;
- touch targets and completion time during a simulated arrival queue.

Critical authorization, RLS, integrity, recovery, or secret-exposure failures
block production approval.
