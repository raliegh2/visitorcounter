# CI and Security Audit

Audit date: 2026-06-25

Branch: `fix/ci-security-workflows`
Pull request: #12 into `dev`

## Resolved findings

### Dependency installation

The original CI and Security workflows used strict `npm ci`, which failed because the current dependency graph requires legacy peer-dependency resolution. Both workflows now use `npm ci --legacy-peer-deps`, matching the successful quality-gate workflow.

### Application quality gates

The following checks pass:

- Dependency installation
- ESLint
- TypeScript type checking
- Unit tests
- Next.js production build
- `npm audit --audit-level=high`

### Database initialization and pgTAP

The database workflow now starts only the local database service with `supabase db start` and runs `supabase test db`.

Fresh database initialization exposed an invalid unquoted output column named `returning` in `dashboard_metrics`. The migration now declares the output as `"returning" bigint`. Fresh initialization and all pgTAP schema assertions pass.

### Secret scanning

Gitleaks identified one historical CI-only placeholder as a generic API key. The finding was audited and confirmed not to be a live credential. The exception is restricted to the exact historical commit containing the placeholder. Current and future repository history remains fully scanned.

### Static analysis

GitHub CodeQL passes for JavaScript and TypeScript.

### Dependency review

The workflow checks whether GitHub's Dependency Graph comparison API is available. When available, the Dependency Review action blocks high-severity dependency additions. When unavailable, it emits a warning while the independent high-severity `npm audit` check remains blocking.

### Branch policy

Both required branch checks pass:

- `validate-promotion-path`
- `quality-gates`

### Preview deployment

The Vercel preview deployment for the audited branch completed successfully and reached `READY` state.

## Result

All configured CI, database, security, branch-policy, and preview-deployment checks pass. The pull request is ready for review and squash merge into `dev`.
