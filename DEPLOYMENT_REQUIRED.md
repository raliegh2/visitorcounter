# Deployment access required

The application and deployment pipeline are complete, but this workspace is not
connected to a Supabase project or Vercel project.

Configure these values in a protected GitHub `production` environment or in the
secure environment that runs the deployment scripts:

## Supabase

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Application

- `REAUTH_COOKIE_SECRET` — at least 32 random bytes
- `NEXT_PUBLIC_APP_URL` — final HTTPS URL

## Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Do not paste secret values into chat. Store them in the hosting or repository
secret manager, then run the protected `Deploy production` workflow.
