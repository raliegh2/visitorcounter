# Data-flow summary

## Visitor registration and check-in

```mermaid
sequenceDiagram
  participant U as Usher
  participant N as Next.js
  participant A as Supabase Auth
  participant P as PostgreSQL function
  participant L as Audit log

  U->>N: Submit minimum visitor fields
  N->>A: Verify server session
  N->>N: Validate with Zod
  N->>P: register_visitor_and_check_in()
  P->>P: Verify active profile, organization, role, and service assignment
  P->>P: Insert visitor and attendance in one transaction
  P->>L: Write safe visitor and attendance events
  P-->>N: Visitor UUID
  N-->>U: Check-in confirmation
```

## Data classifications

| Classification | Examples | Handling |
|---|---|---|
| Restricted | Visitor name plus attendance, optional contact | TLS, RLS, minimum display, retention |
| Confidential | Staff profile, roles, audit events | Role-restricted, append-only where applicable |
| Internal | Service name, date, aggregate counts | Authenticated access |
| Public | None by default | No public application data |

## Prohibited application data

Addresses, birth dates, identification numbers, health details, prayer
requests, counseling notes, financial information, and information about
minors are outside the approved schema.
