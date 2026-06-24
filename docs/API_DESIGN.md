# Application API design

The browser does not receive a privileged database credential. Most mutations
use Next.js Server Actions, which validate input before calling organization-
and role-aware PostgreSQL functions. Supabase Row-Level Security remains the
last authorization boundary.

## Server Actions

| Action | Allowed role | Database operation |
|---|---|---|
| Sign in/sign out/reset | Auth service | Supabase Auth |
| Register and check in | Administrator, assigned usher | `register_visitor_and_check_in` |
| Check in returning visitor | Administrator, assigned usher | `check_in_visitor` |
| Correct attendance | Recently reauthenticated administrator | `correct_attendance` |
| Create service | MFA administrator | `create_service` |
| Assign usher | MFA administrator | `set_service_assignment` |
| Invite/change/disable user | Recently reauthenticated administrator | Admin Auth API plus protected functions |
| Save retention settings | MFA administrator | `update_organization_settings` |
| Apply retention | Recently reauthenticated administrator | `apply_visitor_retention` |

## Read functions

- `available_services`
- `search_visitors`
- `current_attendance`
- `dashboard_metrics`
- `attendance_summary`
- `retention_preview`

Each function checks active-account status, organization, role, and—where
applicable—service assignment and `aal2`.

## Route handlers

- `GET /api/health` — public, no personal data.
- `POST /api/exports/attendance` — same-origin POST, recent password plus MFA
  reauthentication, administrator only, maximum one-year range, audit event.
- `GET /api/exports/attendance` — rejected with 405.
- `GET /auth/callback` — exchanges an approved Auth code and allows only
  application-relative redirect targets.
- `GET /reauth/complete` — creates a five-minute signed HTTP-only authorization
  cookie after successful administrator MFA.

## Error handling

User-visible errors are generic. Database details, stack traces, tokens,
secrets, and personal data are not returned to the interface.
