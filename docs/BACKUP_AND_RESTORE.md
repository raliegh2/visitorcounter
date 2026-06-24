# Backup and restoration

## Proposed objectives requiring church approval

- Recovery Point Objective: 24 hours maximum
- Recovery Time Objective: 8 hours maximum
- Daily encrypted provider-managed backups
- At least one recovery copy outside the primary application deployment
- Quarterly restoration exercise, and after material schema changes

## Restoration test procedure

1. Create an isolated recovery Supabase project in an approved region.
2. Record the source backup identifier and cryptographic/provider verification details.
3. Restore the backup without connecting the recovery project to production email or web hosting.
4. Apply any required post-backup migrations.
5. Verify row counts for organizations, profiles, visitors, services, attendance, audit logs, and retention actions.
6. Verify foreign keys and the duplicate-attendance constraint.
7. Execute RLS tests using administrator, usher, auditor, deactivated, and cross-organization accounts.
8. Verify the newest expected attendance and audit timestamps against the RPO.
9. Test application login and a fictional check-in.
10. securely destroy the recovery environment or retain it according to the recovery policy;
11. record tester, date, duration, exceptions, and approval.

Backups must not be described as working until this procedure succeeds.
