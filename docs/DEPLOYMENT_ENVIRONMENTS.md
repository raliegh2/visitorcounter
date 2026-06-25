# Deployment Environments

## Development

- Git branch: `dev`
- Purpose: integration of approved feature branches
- Deployment: Vercel preview/development deployment
- Database: development Supabase branch or separate development project
- Production secrets must not be used here

## Staging

- Git branch: `staging`
- Purpose: production dress rehearsal and release-candidate validation
- Deployment: dedicated Vercel staging deployment or branch domain
- Database: staging Supabase branch/project with production-like schema and non-production data
- Test authentication, roles, email flows, migrations, exports, and rollback before promotion

## Production

- Git branch: `main`
- Purpose: live user-facing application
- Deployment: production Vercel domain
- Database: production Supabase project
- Changes arrive only through `staging` pull requests after staging approval
