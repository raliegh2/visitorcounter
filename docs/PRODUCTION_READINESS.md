# Production-readiness status

## Verified in this source package

- [x] Strict TypeScript type check
- [x] ESLint with zero warnings
- [x] Eight unit tests
- [x] Optimized Next.js production build
- [x] Dependency audit with zero known vulnerabilities at packaging time
- [x] Exact dependency versions and committed lockfile
- [x] Server-managed Auth integration
- [x] Administrator, usher, and read-only role paths
- [x] MFA and recent reauthentication code paths
- [x] PostgreSQL migrations, constraints, indexes, functions, grants, and RLS definitions
- [x] Security headers and nonce Content Security Policy
- [x] No real visitor seed data or embedded credentials
- [x] Production deployment automation prepared
- [x] Supabase migration dry-run gate prepared
- [x] Vercel prebuilt deployment pipeline prepared

## Blocked until a real environment and credentials exist

- [ ] Apply migrations to development and staging Supabase projects
- [ ] Execute pgTAP database tests
- [ ] Execute administrator/usher/auditor Playwright tests
- [ ] Verify cross-organization RLS with two organizations
- [ ] Verify concurrent duplicate check-in behavior
- [ ] Verify password-reset email and TOTP enrollment
- [ ] Verify Auth rate limits, inactivity timeout, time-box, and single-session policy
- [ ] Verify HTTPS and headers on the final host
- [ ] Perform accessibility and church-tablet testing
- [ ] Configure monitoring, alert ownership, and incident contacts
- [ ] Complete privacy-jurisdiction and retention approval
- [ ] Restore an encrypted production-format backup successfully

**Status:** production-oriented release candidate, not approved for real visitor
data until every critical blocked item passes and is signed off.
