# Release Checklist

## Feature to development

- Feature branch was created from current `dev`
- Scope is limited to one feature or fix
- Pull request targets `dev`
- Type-check, lint, tests, and build pass
- Preview deployment was reviewed

## Development to staging

- Pull request source is `dev`
- Integrated feature set is documented
- Database migrations were tested outside production
- Staging environment variables are complete
- Authentication, authorization, attendance entry, visitor registration, reporting, exports, and audit behavior were tested

## Staging to production

- Pull request source is `staging`
- Staging deployment matches the intended production release
- No unresolved critical or high-severity defects
- Rollback commit/deployment is identified
- Production environment-variable changes are documented
- Production database backup and migration plan are confirmed
- Final approval is recorded before merging to `main`
