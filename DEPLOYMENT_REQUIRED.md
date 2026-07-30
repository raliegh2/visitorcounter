# Deployment access required

The application and deployment pipeline are complete, but this workspace is not
connected to a Supabase project or Render service.

Create the Render service from `render.yaml`. During the initial Blueprint
setup, provide these values in Render's encrypted environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Render generates `REAUTH_COOKIE_SECRET` and maps `NEXT_PUBLIC_APP_URL` to the
service's `RENDER_EXTERNAL_URL`.

Configure these values in a protected GitHub `production` environment:

## Supabase deployment

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`

## Build verification

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REAUTH_COOKIE_SECRET` — at least 32 random bytes
- `NEXT_PUBLIC_APP_URL` — final Render or custom HTTPS URL

## Render deployment

- `RENDER_DEPLOY_HOOK_URL`

Do not paste secret values into chat. Store them in the hosting or repository
secret manager. Add the production service's deploy hook URL to the GitHub
secret, then run the protected `Deploy production` workflow.
