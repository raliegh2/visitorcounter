# Usher Attendance Counting

## Purpose

The usher workflow records one attendance entry for each visitor who attends an authorized church service. Counts are derived from active, non-voided attendance records rather than manually entered totals.

## Metrics

- **Total individuals present**: all active check-ins for the selected service.
- **First-time visitors**: checked-in visitors whose recorded first-visit date matches the selected service date.
- **Returning visitors**: checked-in visitors whose first-visit date is earlier than the selected service date.
- **Active visitor records**: visitor profiles that remain active and have not been anonymized.

## Usher workflow

1. Select an assigned service.
2. Search active visitor records before creating a new record.
3. Check in an existing result as a returning visitor.
4. Register a genuinely new visitor as first-time; registration also checks the person into the selected service.
5. Review the live attendance count and first-time/returning breakdown.

## Integrity controls

- One active attendance record is permitted per visitor and service.
- Duplicate active check-ins are blocked.
- Voided records are excluded from all counts.
- Ushers cannot void attendance, alter roles, create services, export personal data, or access administrator information.
- Counts are limited to services authorized for the signed-in usher.
