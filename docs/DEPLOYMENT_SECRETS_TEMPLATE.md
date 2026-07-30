# Deployment secret checklist

Use this as a checklist only. Do not write secret values in this document.

- [ ] SUPABASE_ACCESS_TOKEN configured
- [ ] SUPABASE_PROJECT_ID configured
- [ ] SUPABASE_DB_PASSWORD configured
- [ ] NEXT_PUBLIC_SUPABASE_URL configured
- [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY configured
- [ ] SUPABASE_SERVICE_ROLE_KEY configured
- [ ] REAUTH_COOKIE_SECRET configured with at least 32 random bytes
- [ ] NEXT_PUBLIC_APP_URL configured with HTTPS production URL
- [ ] RENDER_DEPLOY_HOOK_URL configured in GitHub only
- [ ] Supabase application values configured in Render
- [ ] GitHub production environment requires approval
- [ ] Supabase, Render, and GitHub account MFA enabled
