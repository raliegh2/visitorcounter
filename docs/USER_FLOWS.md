# User flows and screen map

## Usher

```mermaid
flowchart TD
  L[Sign in] --> D[Current service dashboard]
  D --> S[Search visitor]
  S -->|Match| C[Confirm identity context]
  C --> I[Check in]
  S -->|No match| R[Register minimum visitor data]
  R --> W[Duplicate-name warning]
  W --> I
  I --> A[Attendance confirmation]
  A --> D
```

## Administrator

```mermaid
flowchart TD
  L[Password sign-in] --> M[TOTP MFA]
  M --> D[Dashboard]
  D --> SV[Create services and assign ushers]
  D --> U[Invite, role, disable users]
  D --> RP[Reports]
  RP --> RA[Recent password + MFA]
  RA --> EX[POST export and audit]
  D --> CO[Attendance correction]
  CO --> RA
  D --> RT[Retention preview]
  RT --> RA
  RA --> AP[Apply approved retention]
```

## Read-only leader

Sign in → aggregate dashboard → date-limited attendance reports → sign out.
Visitor search, named attendance, writes, raw exports, audit, and administration
are unavailable.

## Screen inventory

1. Secure login
2. Password recovery
3. Administrator MFA
4. Recent reauthentication
5. Current-service dashboard
6. Visitor search and registration
7. Current attendance
8. Service and usher assignment management
9. Aggregate reports and protected export
10. User and role management
11. Audit log
12. Privacy and retention settings
