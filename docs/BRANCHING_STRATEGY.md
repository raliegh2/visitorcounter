# Branching and Release Strategy

This repository uses a protected promotion workflow so development changes do not affect production users.

## Permanent branches

- `dev` — active integration branch. All approved feature work merges here first.
- `staging` — release-candidate branch used as the dress rehearsal for production.
- `main` — production branch deployed to end users. Do not develop directly on this branch.

## Feature workflow

1. Create one branch per feature from the latest `dev` branch.
2. Name branches using one of these prefixes:
   - `feature/<short-name>`
   - `fix/<short-name>`
   - `security/<short-name>`
   - `chore/<short-name>`
3. Open a pull request from the feature branch into `dev`.
4. Run tests and review the feature in a preview deployment.
5. Merge approved features into `dev`.
6. When a release candidate is ready, open a pull request from `dev` into `staging`.
7. Test the complete release on the staging deployment, including authentication, database migrations, role permissions, and critical visitor-attendance workflows.
8. Only after staging approval, open a pull request from `staging` into `main`.
9. Production changes must reach `main` only through an approved pull request.

## Production safeguards

- Never push feature commits directly to `main`.
- Never force-push `main`, `staging`, or `dev`.
- Require pull-request review before merging to `main`.
- Require passing build, type-check, lint, and test checks before merging.
- Keep production secrets only in the Vercel production environment.
- Use separate Preview/Staging environment variables and a non-production Supabase environment before database-changing releases.
- Create an immediate rollback point before each production release.

## Promotion path

```text
feature/* or fix/*
        ↓
       dev
        ↓
     staging
        ↓
       main
```
