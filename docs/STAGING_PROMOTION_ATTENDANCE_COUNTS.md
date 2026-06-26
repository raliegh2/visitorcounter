# Attendance Count Staging Promotion

This release promotes the completed usher attendance-count and authorization-hardening work from `dev` to `staging`.

Included changes:

- Total individuals present per authorized service
- First-time visitor count
- Returning visitor count
- Active visitor record count
- Clear first-time and returning labels during check-in
- Authorization hardening for legacy database objects
- Authorization regression tests
- CI and security workflow repairs already validated on `dev`

Promotion is permitted only when the `dev` to `staging` pull request is conflict-free and all required checks pass.
