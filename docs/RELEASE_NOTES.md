# Release notes — 1.0.0-rc.2

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

A live Supabase project and Vercel project are not connected to this workspace.
The production pipeline is ready, but it cannot publish until the required
Supabase and Vercel credentials are stored in a secure deployment-secret
location.

No secret values should be placed in source files, screenshots, issue bodies,
or chat.
