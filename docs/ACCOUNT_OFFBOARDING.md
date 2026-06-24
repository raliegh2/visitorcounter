# Account offboarding

1. Confirm the staff member and effective date with an authorized church administrator.
2. Disable the profile using **Users & roles**. This advances `auth_not_before`,
   so existing sessions no longer satisfy database access checks.
3. Remove service assignments.
4. Review recent authentication, export, role-change, and correction events.
5. Rotate shared operational secrets if the person had legitimate access to them.
6. Preserve the inactive profile for audit linkage; do not delete it casually.
7. Document completion, approver, and any incident concerns.
