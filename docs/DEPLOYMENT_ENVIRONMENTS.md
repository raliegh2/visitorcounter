# Deployment Environments

## Development

- Git branch: `dev`
- Purpose: integration of approved feature branches
- Deployment: isolated Render development service or local Docker deployment
- Database: development Supabase branch or separate development project
- Production secrets must not be used here

## Staging

- Git branch: `staging`
- Purpose: production dress rehearsal and release-candidate validation
- Deployment: dedicated Render staging service or preview environment
- Database: staging Supabase branch/project with production-like schema and non-production data
- Test authentication, roles, email flows, migrations, exports, and rollback before promotion

## Production

- Git branch: `main`
- Purpose: live user-facing application
- Deployment: production Render service and approved custom domain
- Database: production Supabase project
- Changes arrive only through `staging` pull requests after staging approval
