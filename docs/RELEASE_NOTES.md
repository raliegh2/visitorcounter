# Release notes — 1.0.0-rc.2

## Hosting migration

- Replaced the Vercel application deployment with a Render Blueprint and
  reproducible Docker deployment.
- Added Render health checking at `/api/health`.
- Added a protected Render deploy-hook step after successful Supabase
  production migrations.
- Configured Render to derive `NEXT_PUBLIC_APP_URL` from its assigned HTTPS URL
  and generate `REAUTH_COOKIE_SECRET`.
- Updated Next.js and patched transitive build dependencies to clear the
  production security audit.

## Added since rc.1

- Corrected the MFA page so production builds succeed without static prerendering.
- Added `vercel.json` for managed Next.js deployment.
- Added a protected GitHub Actions production pipeline.
- Added automated Supabase project linking, migration dry-run, and migration push.
- Added automated Vercel production pull, build, and deployment.
- Added deployment preflight validation for required secrets, HTTPS URL, source checks, tests, audit, and build.
- Added cloud-provisioning and deployment-secret documentation.
- Kept deployment CLIs pinned in scripts and workflows for repeatability.

## Verified

- Strict TypeScript: passed
- ESLint with zero warnings: passed
- Unit tests: 8/8 passed
- Source secret scan: passed
- Dependency audit: zero known vulnerabilities
- Optimized Next.js production build: passed
- Deployment scripts and workflow files: present
- Package dependency tree: valid

## External deployment blocker

A live Supabase project and Render service are not connected to this workspace.
The production pipeline is ready, but it cannot publish until the required
Supabase values and Render deploy hook are stored in a secure deployment-secret
location.

No secret values should be placed in source files, screenshots, issue bodies,
or chat.
